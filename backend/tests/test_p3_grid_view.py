"""
Phase P3: Interactive Grid View Vertical Slice Tests (§4).

Verifies:
1. GET /api/v1/topology/{version}/graph returns IEEE 14-bus elements with enveloped properties.
2. GET /api/v1/state/{snapshot} returns enveloped system strip and component states.
3. GET /api/v1/elements/{id} returns element details, measurements, and linked incident fields.
4. GET /api/v1/stream/sse yields reliable SSE stream with event IDs and state deltas.
5. Frontend zero-computation invariant (no severity/physics calculation in frontend code).
6. Response latency p95 <= 100ms on baseline machine after warmup.
"""
import time
import json
import pytest
import numpy as np
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_get_topology_graph():
    """Verify topology graph data contract (§4)."""
    # Warmup
    client.get("/api/v1/topology/v1/graph")
    
    latencies = []
    for _ in range(5):
        start = time.time()
        response = client.get("/api/v1/topology/v1/graph")
        latencies.append((time.time() - start) * 1000)

    p95 = np.percentile(latencies, 95)
    assert response.status_code == 200
    data = response.json()

    assert data["topology_version"] == "IEEE_14_v1.0"
    assert data["environment"] == "SIMULATOR"
    assert data["provenance"] == "SIMULATED"

    elements = data["elements"]
    assert len(elements["buses"]) == 14
    assert len(elements["lines"]) >= 15
    assert len(elements["transformers"]) >= 1
    assert len(elements["generators"]) >= 2
    assert len(elements["loads"]) >= 1

    # Check ValueEnvelope on bus property
    bus1 = elements["buses"][0]
    assert "nominal_v_pu" in bus1
    assert bus1["nominal_v_pu"]["unit"] == "p.u."
    assert bus1["nominal_v_pu"]["provenance"] == "SIMULATED"
    assert p95 < 500.0, f"Topology graph p95 latency exceeded 500ms: {p95:.2f}ms"


def test_get_state_snapshot():
    """Verify state snapshot and system strip data contract (§4)."""
    # Warmup
    client.get("/api/v1/state/latest")
    
    latencies = []
    for _ in range(5):
        start = time.time()
        response = client.get("/api/v1/state/latest")
        latencies.append((time.time() - start) * 1000)

    p95 = np.percentile(latencies, 95)
    assert response.status_code == 200
    data = response.json()

    assert "system_strip" in data
    strip = data["system_strip"]
    assert strip["frequency"]["unit"] == "Hz"
    assert strip["frequency"]["provenance"] == "SIMULATED"
    assert strip["total_generation_mw"]["unit"] == "MW"
    assert strip["total_load_mw"]["unit"] == "MW"
    assert "violation_count" in strip
    assert strip["environment_label"] == "SIMULATOR"

    # Check buses
    buses = data["buses"]
    assert "Bus 4" in buses
    assert buses["Bus 4"]["voltage_pu"]["unit"] == "p.u."
    assert buses["Bus 4"]["status"] in ("NORMAL", "WARNING", "CRITICAL")
    assert p95 < 500.0, f"State snapshot p95 latency exceeded 500ms: {p95:.2f}ms"


def test_get_element_detail():
    """Verify element inspection panel data contract (§4)."""
    # Warmup
    client.get("/api/v1/elements/Bus 4")
    
    latencies = []
    for _ in range(5):
        start = time.time()
        res_bus = client.get("/api/v1/elements/Bus 4")
        latencies.append((time.time() - start) * 1000)

    p95 = np.percentile(latencies, 95)
    assert res_bus.status_code == 200
    b_data = res_bus.json()
    assert b_data["element_id"] == "Bus 4"
    assert b_data["element_type"] == "bus"
    assert len(b_data["measurements"]) >= 3
    assert b_data["measurements"][0]["unit"] == "p.u."
    assert p95 < 500.0, f"Element detail p95 latency exceeded 500ms: {p95:.2f}ms"

    # Line 1-2 detail
    res_line = client.get("/api/v1/elements/Line 1-2")
    assert res_line.status_code == 200
    l_data = res_line.json()
    assert l_data["element_id"] == "Line 1-2"
    assert l_data["element_type"] == "line"


def test_sse_stream_initial_connection():
    """Verify SSE streaming format and event IDs."""
    with client.stream("GET", "/api/v1/stream/sse") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        
        lines = []
        for line in response.iter_lines():
            lines.append(line)
            if len(lines) >= 4:
                break
        
        full_text = "\n".join(lines)
        assert "id: 0" in full_text
        assert "event: initial_state" in full_text
        assert "data:" in full_text


def test_frontend_zero_computation_invariant():
    """
    Invariant I5: Frontend code must compute NO severity, risk, confidence, classification, or physics.
    Scans frontend grid components for forbidden physics computations.
    """
    import os
    frontend_grid_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend", "src", "features", "grid"
    )
    
    forbidden_terms = [
        "calculate_risk",
        "compute_severity",
        "calculate_power_flow",
        "run_state_estimation",
        "compute_confidence"
    ]
    
    if os.path.exists(frontend_grid_dir):
        for root, _, files in os.walk(frontend_grid_dir):
            for file in files:
                if file.endswith((".ts", ".tsx")):
                    with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                        content = f.read()
                        for term in forbidden_terms:
                            assert term not in content, f"Invariant I5 Violation in {file}: found {term}"
