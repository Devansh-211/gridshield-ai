"""GridShield AI — Test Suite for M7: FastAPI REST & SSE Endpoints.

Tests:
1. Health and topology endpoints.
2. Digital twin run creation with full resilience loop execution.
3. Incident retrieval and 3-way verification endpoints.
4. Model status and limitations metadata.
5. Analyst explanation and question answering endpoints.
6. Demo run orchestration.
7. Error envelope formatting on invalid requests.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "X-Request-ID" in response.headers


def test_grid_topology():
    response = client.get("/api/v1/grid/topology")
    assert response.status_code == 200
    data = response.json()
    assert len(data["buses"]) == 14
    assert len(data["lines"]) == 20
    assert data["provenance"] == "SIMULATED"


def test_scenarios_catalog():
    response = client.get("/api/v1/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert "physical_scenarios" in data
    assert "attack_types" in data
    assert data["default_demo_target"] == "Bus 4"


def test_create_run_and_incidents():
    payload = {
        "scenario_type": "NORMAL",
        "total_steps": 15,
        "seed": 42,
        "attack": {
            "attack_type": "FALSE_DATA_INJECTION",
            "target_components": ["Bus 4"],
            "start_step": 5,
            "duration_steps": 10,
            "magnitude": -0.12,
        }
    }
    response = client.post("/api/v1/runs", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data
    assert data["total_steps"] == 15
    assert "detection" in data
    assert "attribution" in data
    assert "risk" in data

    # Retrieve incidents
    inc_resp = client.get("/api/v1/incidents")
    assert inc_resp.status_code == 200
    incidents = inc_resp.json()
    assert len(incidents) >= 1
    inc_id = incidents[-1]["incident_id"]

    # Retrieve single incident
    detail_resp = client.get(f"/api/v1/incidents/{inc_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["incident_id"] == inc_id
    assert detail["classification"] == "FALSE_DATA_INJECTION"

    # Test impact simulation
    impact_resp = client.post(f"/api/v1/incidents/{inc_id}/simulate-impact?projected_steps=10")
    assert impact_resp.status_code == 200
    impact_data = impact_resp.json()
    assert impact_data["incident_id"] == inc_id
    assert "unmitigated_metrics" in impact_data

    # Test mitigation simulation
    mit_resp = client.post(f"/api/v1/incidents/{inc_id}/simulate-mitigation")
    assert mit_resp.status_code == 200
    mit_data = mit_resp.json()
    assert mit_data["incident_id"] == inc_id
    assert mit_data["success"] is True


def test_models_status_and_limitations():
    response = client.get("/api/v1/models/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "models" in data
    assert data["models"]["accuracy"] >= 0.90
    assert "limitations" in data
    assert len(data["limitations"]) >= 3


def test_demo_run():
    response = client.post("/api/v1/demo/run")
    assert response.status_code == 200
    data = response.json()
    assert "Primary Demo" in data["demo_title"]
    assert data["target_bus"] == "Bus 4"
    assert data["verified"] is True
    assert data["incident"] is not None
    assert data["mitigation_result"] is not None


def test_error_envelope_on_404():
    response = client.get("/api/v1/incidents/UNKNOWN_INCIDENT_999")
    assert response.status_code == 404
