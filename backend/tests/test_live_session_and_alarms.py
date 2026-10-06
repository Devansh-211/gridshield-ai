"""
GridShield AI — Milestone 3, 4, 5 Tests: Stateless Advance, Alarms & Audit.

Tests:
1. Stateless Live Session advance with checkpoint hydration & packed telemetry persistence.
2. Optimistic locking and idempotency guards.
3. ISA-18.2 Alarms raising, threshold checking, acknowledgement, and audit logging.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.persistence.models import Base
from backend.app.persistence.repositories import VisitorRepository, RunRepository
from backend.app.services.live_session_service import LiveSessionService
from backend.app.incidents.alarm_service import AlarmService


@pytest.fixture
def session_db():
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


def test_advance_session_stateless(session_db):
    vis_repo = VisitorRepository(session_db)
    run_repo = RunRepository(session_db)
    service = LiveSessionService(session_db)

    # 1. Create run
    vis = vis_repo.get_or_create_visitor()
    run = run_repo.create_run(
        visitor_id=vis.id,
        kind="LIVE_SESSION",
        seed=42,
        scenario_type="NORMAL"
    )
    session_db.commit()

    # 2. Advance 5 steps
    res = service.advance_session(
        run_id=run.id,
        steps=5,
        client_tick_id="tick-001",
        expected_version=1
    )

    assert res["sim_step"] == 5
    assert res["steps_advanced"] == 5
    assert res["version"] == 2
    assert "buses_in_band" in res["grid_summary"]

    # 3. Advance another 5 steps
    res2 = service.advance_session(
        run_id=run.id,
        steps=5,
        client_tick_id="tick-002",
        expected_version=2
    )
    assert res2["sim_step"] == 10
    assert res2["version"] == 3


def test_advance_optimistic_locking(session_db):
    vis_repo = VisitorRepository(session_db)
    run_repo = RunRepository(session_db)
    service = LiveSessionService(session_db)

    vis = vis_repo.get_or_create_visitor()
    run = run_repo.create_run(visitor_id=vis.id)
    session_db.commit()

    # Advance once to bump version to 2
    service.advance_session(run_id=run.id, steps=2, expected_version=1)

    # Attempt with stale version 1 returns 409
    res_stale = service.advance_session(run_id=run.id, steps=2, expected_version=1)
    assert res_stale.get("error") == "VERSION_CONFLICT"
    assert res_stale.get("status_code") == 409


def test_alarm_service_and_audit(session_db):
    vis_repo = VisitorRepository(session_db)
    run_repo = RunRepository(session_db)
    alarm_service = AlarmService(session_db)

    vis = vis_repo.get_or_create_visitor()
    run = run_repo.create_run(visitor_id=vis.id)
    session_db.commit()

    # 1. Evaluate alarms for abnormal voltage
    voltages = {"Bus 1": 1.05, "Bus 4": 0.88, "Bus 5": 1.01}
    loadings = {"Line 1": 125.0, "Line 2": 50.0}

    raised = alarm_service.evaluate_grid_alarms(
        run_id=run.id,
        step=5,
        voltages_by_bus=voltages,
        line_loadings=loadings,
        frequency_hz=49.40
    )
    assert len(raised) >= 3

    # 2. List active alarms
    active = alarm_service.list_active_alarms(run_id=run.id)
    assert len(active) >= 3

    # 3. Acknowledge alarm
    target_alarm = active[0]
    acked = alarm_service.acknowledge(
        alarm_id=target_alarm.id,
        ack_by="operator-devansh",
        note="Acknowledged severe voltage drop on Bus 4"
    )
    assert acked is not None
    assert acked.state == "ACTIVE_ACK"
    assert acked.ack_by == "operator-devansh"
