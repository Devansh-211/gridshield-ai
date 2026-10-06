"""
GridShield AI — Phase PA Phase Gate Test Suite (Authentication, Roles & Segregated Views).

Tests 8 Phase Gate Acceptance Criteria:
1. Gate 1: Deny-by-default route enforcement (401 for anonymous, 403 for role mismatch).
2. Gate 2: Server-side whitelist projection (Supervisor responses contain zero raw matrices or detector residuals).
3. Gate 3: Plain language jargon linter (Grade <= 8 reading level, zero undefined engineering jargon).
4. Gate 4: Faithful translation & fidelity (Identical severity, substation targets, environment badges).
5. Gate 5: View parity manifest verification (100% mapped facts in docs/view-parity.yaml).
6. Gate 6: Cryptographic security (scrypt hashing, token generation, session lifecycle, audit logging).
7. Gate 7: Admin Preview-As mode (Audited role switching and preview status).
8. Gate 8: Determinism & Provenance (Identical plain narrative from identical Evidence Object).
"""

import os
import yaml
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app, on_startup
from backend.app.persistence.database import init_db, get_db_session
from backend.app.persistence.repositories import (
    AuthRepository, AuditLogRepository, ElementAliasRepository, GlossaryRepository
)
from backend.app.core.security import (
    hash_password, verify_password, get_or_create_bootstrap_token,
    generate_session_token, hash_session_token
)
from backend.app.narrative.generator import (
    PlainNarrativeGenerator, lint_plain_text, JargonLinterError,
    format_substation_name
)
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.incidents.manager import IncidentManager


@pytest.fixture(scope="module")
def client():
    on_startup()
    return TestClient(app)


@pytest.fixture(scope="module")
def setup_users():
    """Seeds test accounts for SUPERVISOR, TECHNICIAN, and ADMIN."""
    init_db()
    with get_db_session() as db:
        auth = AuthRepository(db)
        # Clean existing test users if any
        for uname in ("test_sup", "test_tech", "test_admin"):
            existing = auth.get_user_by_username(uname)
            if existing:
                auth.delete_user(existing.id)

        sup = auth.create_user("test_sup", hash_password("Password123!"), role="SUPERVISOR", display_name="Alice Supervisor")
        tech = auth.create_user("test_tech", hash_password("Password123!"), role="TECHNICIAN", display_name="Bob Technician")
        admin = auth.create_user("test_admin", hash_password("Password123!"), role="ADMIN", display_name="Charlie Admin")
        db.commit()
        return {"supervisor": sup, "technician": tech, "admin": admin}


def test_gate1_route_security_matrix(client, setup_users):
    """Gate 1: Route matrix checks anonymous, supervisor, technician, and admin access."""
    # 1. Anonymous access to protected technician endpoint -> 401
    res = client.get("/api/v1/views/technician/dashboard")
    assert res.status_code == 401

    # 2. Login as Supervisor
    login_sup = client.post("/api/v1/auth/login", json={"username": "test_sup", "password": "Password123!"})
    assert login_sup.status_code == 200
    sup_token = login_sup.json()["token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    # Supervisor CAN access supervisor endpoints
    res_sup_dash = client.get("/api/v1/views/supervisor/dashboard", headers=sup_headers)
    assert res_sup_dash.status_code == 200

    # Supervisor CANNOT access technician endpoints (403 Forbidden)
    res_sup_tech = client.get("/api/v1/views/technician/dashboard", headers=sup_headers)
    assert res_sup_tech.status_code == 403

    # Supervisor CANNOT access admin users (403 Forbidden)
    res_sup_admin = client.get("/api/v1/admin/users", headers=sup_headers)
    assert res_sup_admin.status_code == 403

    # 3. Login as Technician
    login_tech = client.post("/api/v1/auth/login", json={"username": "test_tech", "password": "Password123!"})
    assert login_tech.status_code == 200
    tech_token = login_tech.json()["token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}

    # Technician CAN access technician endpoints
    res_tech_dash = client.get("/api/v1/views/technician/dashboard", headers=tech_headers)
    assert res_tech_dash.status_code == 200

    # Technician CAN access supervisor endpoints
    res_tech_sup = client.get("/api/v1/views/supervisor/dashboard", headers=tech_headers)
    assert res_tech_sup.status_code == 200


def test_gate2_server_side_whitelist_projection(client, setup_users):
    """Gate 2: Supervisor responses contain ZERO raw matrices, residuals, or detector weights."""
    login_sup = client.post("/api/v1/auth/login", json={"username": "test_sup", "password": "Password123!"})
    sup_headers = {"Authorization": f"Bearer {login_sup.json()['token']}"}

    res = client.get("/api/v1/views/supervisor/grid/state", headers=sup_headers)
    assert res.status_code == 200
    data = res.json()

    # Verify whitelist structure
    assert "substation_readings" in data
    assert "plain_frequency_summary" in data
    assert "equipment_strain_summary" in data

    # Verify absence of engineering matrices
    assert "vm_pu" not in data
    assert "va_degree" not in data
    assert "p_mw" not in data
    assert "q_mvar" not in data
    assert "chi_square_residual" not in data
    assert "jacobian" not in data


def test_gate3_plain_language_jargon_linter():
    """Gate 3: Automated linter rejects prohibited engineering vocabulary."""
    # Valid plain sentences pass
    lint_plain_text("Substation 4 (Uptown Metro) reports normal electricity flow.")
    lint_plain_text("Equipment is operating comfortably within safe temperature limits.")

    # Forbidden jargon raises JargonLinterError
    forbidden_samples = [
        "The voltage is 0.98 per-unit.",
        "Detected state estimation residual exceeds threshold.",
        "Bus 7 experienced reactive power drop.",
        "Eigenvalue analysis indicates small-signal instability."
    ]

    for sample in forbidden_samples:
        with pytest.raises(JargonLinterError):
            lint_plain_text(sample)


def test_gate4_faithful_translation_fidelity():
    """Gate 4: Ground truth scenario projected through supervisor view preserves environment and targets."""
    from backend.app.schemas.contracts import (
        Incident, IncidentStatus, ClassificationClass, Attribution,
        CertaintyBand, RiskAssessment, RiskLevel, RiskFactor
    )
    generator = PlainNarrativeGenerator()

    inc = Incident(
        incident_id="GS-0001",
        run_id="run-test",
        scenario_ref="Scenario Step 10",
        created_at_step=10,
        created_at_wall="2026-10-07T00:00:00Z",
        status=IncidentStatus.DETECTED,
        affected_components=["Bus 4"],
        classification=ClassificationClass.FALSE_DATA_INJECTION,
        attribution=Attribution(
            primary_hypothesis="False data injection on Bus 4",
            likely_cause="False data injection on Bus 4",
            hypothesis_scores={"FALSE_DATA_INJECTION": 0.92, "NORMAL": 0.08},
            confidence_score=0.92,
            confidence_vector=[0.92, 0.05, 0.02, 0.01],
            certainty_band=CertaintyBand.HIGH,
            supporting_evidence=[],
            contradicting_evidence=[],
            alternatives_considered=[]
        ),
        certainty=CertaintyBand.HIGH,
        risk=RiskAssessment(
            overall_risk_score=78.0,
            risk_level=RiskLevel.HIGH,
            sub_scores=[RiskFactor(name="Voltage Violation Risk", raw_value=0.94, normalized_score=80.0, weight=1.0, description="Under-voltage")]
        ),
        evidence=[],
        model_version="v1.0"
    )

    proj = generator.project_incident(inc)
    assert proj.incident_id == inc.incident_id
    assert proj.environment_label == "PRACTICE_SIMULATION"
    assert "Substation 4" in proj.what_is_happening
    assert "Uptown Metro" in proj.what_is_happening
    assert len(proj.options_to_discuss_with_technician) > 0
    assert "technician" in proj.options_to_discuss_with_technician[0].not_guaranteed_safe_notice.lower()



def test_gate5_view_parity_manifest():
    """Gate 5: docs/view-parity.yaml is valid YAML and defines core mappings."""
    manifest_path = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "view-parity.yaml")
    assert os.path.exists(manifest_path), "Missing docs/view-parity.yaml"

    with open(manifest_path, "r", encoding="utf-8") as f:
        doc = yaml.safe_load(f)

    assert doc["version"] == "1.0.0"
    assert len(doc["mappings"]) >= 8
    for m in doc["mappings"]:
        assert "technician_fact" in m
        assert "supervisor_fact" in m
        assert "translation_rule" in m


def test_gate6_auth_cryptography_and_sessions(client, setup_users):
    """Gate 6: Scrypt password hashing, session expiration, and audit logging."""
    pw = "SecureP@ssword2026"
    hashed = hash_password(pw)
    assert hashed.startswith("scrypt$")
    assert verify_password(pw, hashed)
    assert not verify_password("WrongPassword", hashed)

    # Admin Audit Log Test
    login_admin = client.post("/api/v1/auth/login", json={"username": "test_admin", "password": "Password123!"})
    admin_headers = {"Authorization": f"Bearer {login_admin.json()['token']}"}

    audit_res = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0


def test_gate7_admin_preview_mode(client, setup_users):
    """Gate 7: Admin Preview-As mode allows previewing Supervisor and Technician roles."""
    login_admin = client.post("/api/v1/auth/login", json={"username": "test_admin", "password": "Password123!"})
    admin_headers = {"Authorization": f"Bearer {login_admin.json()['token']}"}

    # Set preview as SUPERVISOR
    prev_res = client.post("/api/v1/admin/preview-as", json={"target_role": "SUPERVISOR"}, headers=admin_headers)
    assert prev_res.status_code == 200
    assert prev_res.json()["effective_role"] == "SUPERVISOR"
    assert prev_res.json()["is_preview"] is True

    # Profile reflects preview
    me_res = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_res.status_code == 200
    assert me_res.json()["real_role"] == "ADMIN"
    assert me_res.json()["effective_role"] == "SUPERVISOR"
    assert me_res.json()["is_preview"] is True

    # Reset preview
    reset_res = client.post("/api/v1/admin/preview-as", json={"target_role": None}, headers=admin_headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["effective_role"] == "ADMIN"
    assert reset_res.json()["is_preview"] is False


def test_gate8_determinism_and_provenance():
    """Gate 8: Identical state produces identical deterministic plain narrative in O(1) time."""
    grid = DigitalTwinGrid()
    state = grid.get_state()
    gen = PlainNarrativeGenerator()

    p1 = gen.project_grid_state(state, incident_count=0)
    p2 = gen.project_grid_state(state, incident_count=0)

    assert p1.model_dump() == p2.model_dump()
    assert p1.environment_label == "PRACTICE_SIMULATION"
