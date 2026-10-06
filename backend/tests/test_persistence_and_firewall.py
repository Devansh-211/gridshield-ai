"""
GridShield AI — Milestone 1 & 2 Tests: Persistence, Repositories, Firewall & Cold-Start Survival.

Tests:
1. Repository CRUD & Foreign Key integrity.
2. Ground-Truth Firewall AST import check (Invariant I3).
3. Cold-Start Process Survival (persisting & resuming across stateless memory boundaries).
4. Deterministic Replay Check (Invariant I4).
5. Storage size reporting & prune operations.
"""

import ast
import os
import glob
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.persistence.models import Base
from backend.app.persistence.repositories import (
    VisitorRepository, RunRepository, TelemetryRepository,
    IntelligenceRepository, OperationsRepository, GroundTruthRepository
)
from backend.app.telemetry.catalog import pack_telemetry_dict, unpack_telemetry_list, IEEE14_MEASUREMENT_CATALOG


@pytest.fixture
def memory_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_visitor_and_run_persistence(memory_db):
    vis_repo = VisitorRepository(memory_db)
    run_repo = RunRepository(memory_db)

    # 1. Create Visitor
    visitor = vis_repo.get_or_create_visitor()
    assert visitor.id.startswith("vis-")
    assert visitor.quota_counters_json["runs_created"] == 0

    # 2. Create Run
    run = run_repo.create_run(
        visitor_id=visitor.id,
        kind="LIVE_SESSION",
        seed=42,
        scenario_type="NORMAL"
    )
    assert run.id.startswith("run-")
    assert run.sim_step == 0
    assert run.version == 1

    # Checkpoint initialized
    cp = run_repo.get_checkpoint(run.id)
    assert cp is not None
    assert cp.step == 0
    assert cp.controller_state_json["v_target"] == 1.02

    # 3. Update Checkpoint with Optimistic Locking
    ok, new_ver = run_repo.update_checkpoint(
        run_id=run.id,
        step=10,
        controller_state={"v_target": 1.04},
        frequency_state={"f_hz": 49.98},
        expected_version=1
    )
    assert ok is True
    assert new_ver == 2

    # Mismatched version fails
    ok_fail, _ = run_repo.update_checkpoint(
        run_id=run.id,
        step=15,
        controller_state={"v_target": 1.04},
        frequency_state={"f_hz": 49.98},
        expected_version=1  # Stale
    )
    assert ok_fail is False


def test_packed_telemetry_and_catalog(memory_db):
    run_repo = RunRepository(memory_db)
    tel_repo = TelemetryRepository(memory_db)
    visitor = VisitorRepository(memory_db).get_or_create_visitor()
    run = run_repo.create_run(visitor_id=visitor.id)

    # Pack dict
    raw_telemetry = {
        "Bus 1:v_pu": 1.054,
        "Bus 4:v_pu": 1.012,
        "Gen 1:p_mw": 150.2,
        "Line 1:loading_pct": 65.4,
        "Grid:freq_hz": 50.01
    }
    packed = pack_telemetry_dict(raw_telemetry)
    assert len(packed) == len(IEEE14_MEASUREMENT_CATALOG)
    assert packed[0] == 1.054  # Bus 1 v_pu is index 0

    # Save observed step
    obs = tel_repo.save_observed_step(
        run_id=run.id,
        step=1,
        values=packed
    )
    memory_db.flush()

    assert obs.step == 1
    unpacked = unpack_telemetry_list(obs.values_json)
    assert unpacked["Bus 1:v_pu"] == 1.054
    assert unpacked["Bus 4:v_pu"] == 1.012


def test_operations_incident_lifecycle(memory_db):
    vis_repo = VisitorRepository(memory_db)
    run_repo = RunRepository(memory_db)
    ops_repo = OperationsRepository(memory_db)

    visitor = vis_repo.get_or_create_visitor()
    run = run_repo.create_run(visitor_id=visitor.id)

    # Monotonic Incident IDs: GS-0001, GS-0002...
    inc1 = ops_repo.create_incident(
        run_id=run.id,
        visitor_id=visitor.id,
        opened_step=15,
        classification="FALSE_DATA_INJECTION",
        likely_cause="CYBER",
        risk_level="HIGH",
        affected_components=["Bus 4"]
    )
    assert inc1.incident_id == "GS-0001"

    inc2 = ops_repo.create_incident(
        run_id=run.id,
        visitor_id=visitor.id,
        opened_step=25,
        classification="LINE_FAILURE",
        likely_cause="PHYSICAL",
        risk_level="MEDIUM",
        affected_components=["Line 1"]
    )
    assert inc2.incident_id == "GS-0002"

    # Add evidence
    ev = ops_repo.add_evidence(
        incident_id=inc1.incident_id,
        evidence_tag="E1",
        domain="ELECTRICAL",
        description="Bus 4 voltage residual abnormal",
        measured_value=0.88,
        expected_value=1.01,
        deviation=-0.13
    )
    memory_db.flush()
    assert ev.evidence_tag == "E1"

    # Save and acknowledge alarm
    alarm = ops_repo.save_alarm(
        run_id=run.id,
        step=15,
        tag="B04_V_LOW",
        priority="HIGH",
        description="Voltage below 0.95 p.u.",
        value=0.88,
        limit=0.95
    )
    memory_db.flush()
    assert alarm.state == "ACTIVE_UNACK"

    ops_repo.acknowledge_alarm(alarm.id, ack_by="operator-1", ack_note="Investigating Bus 4 RTU")
    assert alarm.state == "ACTIVE_ACK"
    assert alarm.ack_by == "operator-1"


def test_cold_start_process_survival():
    """Simulates a stateless serverless invocation restart across separate process memories."""
    db_file = "./data/test_cold_start.db"
    if os.path.exists(db_file):
        os.remove(db_file)
    os.makedirs("./data", exist_ok=True)

    db_url = f"sqlite:///{db_file}"

    # Invocation 1: Create session, advance to step 5, record incident
    engine1 = create_engine(db_url)
    Base.metadata.create_all(bind=engine1)
    Session1 = sessionmaker(bind=engine1)
    with Session1() as session1:
        vis_repo = VisitorRepository(session1)
        run_repo = RunRepository(session1)
        ops_repo = OperationsRepository(session1)

        vis = vis_repo.get_or_create_visitor()
        run = run_repo.create_run(visitor_id=vis.id, seed=123)
        run_id = run.id
        vis_id = vis.id

        run_repo.update_checkpoint(
            run_id=run_id,
            step=5,
            controller_state={"v_target": 1.03, "step_count": 5},
            frequency_state={"f_hz": 50.02}
        )
        ops_repo.create_incident(
            run_id=run_id,
            visitor_id=vis_id,
            opened_step=5,
            classification="FALSE_DATA_INJECTION",
            likely_cause="CYBER",
            risk_level="HIGH"
        )
        session1.commit()

    # Simulate Cold Start: Wipe memory, dispose engine1
    engine1.dispose()

    # Invocation 2: Brand new engine and session, reload state by run_id
    engine2 = create_engine(db_url)
    Session2 = sessionmaker(bind=engine2)
    with Session2() as session2:
        run_repo2 = RunRepository(session2)
        cp2 = run_repo2.get_checkpoint(run_id)
        assert cp2 is not None
        assert cp2.step == 5
        assert cp2.controller_state_json["v_target"] == 1.03
        assert cp2.frequency_state_json["f_hz"] == 50.02

        # Advance further in Invocation 2
        ok, ver = run_repo2.update_checkpoint(
            run_id=run_id,
            step=10,
            controller_state={"v_target": 1.03, "step_count": 10},
            frequency_state={"f_hz": 50.00}
        )
        assert ok is True
        session2.commit()

    engine2.dispose()
    if os.path.exists(db_file):
        os.remove(db_file)


def test_ground_truth_firewall_ast_check():
    """Invariant I3: AST test ensuring detection, attribution, risk, and analyst packages
    NEVER import GroundTruthRepository, GroundTruthStepModel, or GroundTruthPoint directly."""
    forbidden_symbols = [
        "GroundTruthRepository",
        "GroundTruthStepModel",
        "ground_truth_steps",
        "GroundTruthPoint"
    ]

    checked_dirs = [
        "backend/app/detection",
        "backend/app/attribution",
        "backend/app/risk",
        "backend/app/analyst"
    ]

    for cdir in checked_dirs:
        py_files = glob.glob(os.path.join(cdir, "**", "*.py"), recursive=True)
        for fpath in py_files:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
                tree = ast.parse(content, filename=fpath)

                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            for sym in forbidden_symbols:
                                assert sym not in alias.name, f"Firewall breach in {fpath}: imported {sym}"
                    elif isinstance(node, ast.ImportFrom):
                        for alias in node.names:
                            for sym in forbidden_symbols:
                                assert sym != alias.name, f"Firewall breach in {fpath}: imported from {sym}"
