import pytest
import numpy as np
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.rng import get_rng
from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, GroundTruthPoint, CyberEvent,
    CyberEventType, TelemetryQuality, Provenance, AttackType,
    ClassificationClass, GridTopology
)

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"

def test_models_status_endpoint():
    response = client.get("/api/v1/models/status")
    assert response.status_code == 200
    data = response.json()
    assert "simulator" in data
    assert "models" in data or "state_estimator" in data

def test_provenance_labels():
    """Invariant I2: Labelled provenance on all models."""
    obs = ObservedTelemetryPoint(
        timestamp=10.0,
        wall_time="2026-10-05T00:00:00Z",
        component_id="Bus 4",
        component_type="bus",
        measurement_type="v_pu",
        reported_value=1.025,
        unit="p.u.",
        quality=TelemetryQuality.GOOD,
        sequence=10,
        source_device_id="RTU_04",
        provenance=Provenance.OBSERVED
    )
    assert obs.provenance == Provenance.OBSERVED

    gt = GroundTruthPoint(
        timestamp=10.0,
        component_id="Bus 4",
        component_type="bus",
        measurement_type="v_pu",
        true_value=1.023,
        unit="p.u.",
        provenance=Provenance.SIMULATED
    )
    assert gt.provenance == Provenance.SIMULATED
    assert gt.true_value != obs.reported_value

def test_determinism_rng_invariant_i4():
    """Invariant I4: Replaying the same seed yields identical values."""
    rng1 = get_rng(seed=12345)
    vals1 = [rng1.normal(0, 1) for _ in range(100)]

    rng2 = get_rng(seed=12345)
    vals2 = [rng2.normal(0, 1) for _ in range(100)]

    np.testing.assert_allclose(vals1, vals2, rtol=1e-6)
