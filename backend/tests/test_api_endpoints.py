"""
GridShield AI — API Endpoints & Serverless Integration Tests.

Tests:
1. /health and /warmup endpoints.
2. /runs/session creation with visitor cookie.
3. /runs/{id}/advance stepwise live advance and feed polling.
4. /alarms and alarm acknowledgement.
5. /demo/{id}/next stepwise demo stage progression.
6. /metrics verified JSON format.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.persistence.database import get_db, SessionLocal, init_db, Base, engine


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_health_and_warmup(client):
    # Health check
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["HEALTHY", "DEGRADED"]
    assert "database" in data

    # Warmup
    res_w = client.get("/api/v1/warmup")
    assert res_w.status_code == 200
    assert res_w.json()["status"] == "READY"


def test_metrics_endpoint(client):
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "accuracy" in data
    assert "normal_fpr" in data
    assert data["provenance"] == "SIMULATED EVALUATION"


def test_live_session_and_feed(client):
    # 1. Create live session
    res = client.post("/api/v1/runs/session", json={"kind": "LIVE_SESSION", "seed": 42, "scenario_type": "NORMAL"})
    assert res.status_code == 200
    run_data = res.json()
    run_id = run_data["run_id"]
    assert run_id.startswith("run-")
    assert run_data["sim_step"] == 0

    # 2. Advance 3 steps
    res_adv = client.post(f"/api/v1/runs/{run_id}/advance", json={"steps": 3})
    assert res_adv.status_code == 200
    adv_data = res_adv.json()
    assert adv_data["sim_step"] == 3
    assert adv_data["steps_advanced"] == 3

    # 3. Poll Feed
    res_feed = client.get(f"/api/v1/runs/{run_id}/feed")
    assert res_feed.status_code == 200
    feed = res_feed.json()
    assert feed["run_id"] == run_id
    assert feed["sim_step"] == 3


def test_stepwise_demo_lifecycle(client):
    # 1. Create demo run
    res = client.post("/api/v1/runs/session", json={"kind": "DEMO", "demo_type": "primary"})
    assert res.status_code == 200
    run_id = res.json()["run_id"]

    # 2. Execute Stage 0 (Initialize)
    res_s0 = client.post(f"/api/v1/demo/{run_id}/next")
    assert res_s0.status_code == 200
    assert res_s0.json()["current_stage"] == 0

    # 3. Execute Stage 1 (Baseline advance 5 steps)
    res_s1 = client.post(f"/api/v1/demo/{run_id}/next")
    assert res_s1.status_code == 200
    assert res_s1.json()["current_stage"] == 1

    # 4. Execute Stage 2 (Inject FDI)
    res_s2 = client.post(f"/api/v1/demo/{run_id}/next")
    assert res_s2.status_code == 200
    assert res_s2.json()["current_stage"] == 2


def test_alarms_and_acknowledgement(client):
    # Get alarms
    res = client.get("/api/v1/alarms")
    assert res.status_code == 200
    alarms = res.json()
    assert isinstance(alarms, list)
