import pytest
import numpy as np
from backend.app.simulation.indexing import bus_to_internal, bus_to_ieee, bus_label, parse_bus_label
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.simulation.frequency import FrequencyCOIModel
from backend.app.schemas.contracts import ScenarioSpec, ScenarioType
from backend.app.services.simulation_runner import SimulationRunner

def test_indexing_bidirectional_mapping():
    """Verify explicit 1-based to 0-based indexing mappings in both directions."""
    for ieee_id in range(1, 15):
        internal = bus_to_internal(ieee_id)
        assert internal == ieee_id - 1
        assert bus_to_ieee(internal) == ieee_id
        assert bus_label(ieee_id) == f"Bus {ieee_id}"
        assert parse_bus_label(f"Bus {ieee_id}") == ieee_id

    with pytest.raises(ValueError):
        bus_to_internal(0)
    with pytest.raises(ValueError):
        bus_to_internal(15)
    with pytest.raises(ValueError):
        bus_to_ieee(-1)
    with pytest.raises(ValueError):
        bus_to_ieee(14)

def test_grid_baseline_convergence_and_determinism_i4():
    """Invariant I4: Identical seeds produce identical physical simulation states."""
    spec = ScenarioSpec(scenario_type=ScenarioType.NORMAL, total_steps=20, seed=42)
    runner1 = SimulationRunner(spec)
    res1 = runner1.run_all()

    runner2 = SimulationRunner(spec)
    res2 = runner2.run_all()

    # Verify power flow converged
    for st in res1["states"]:
        assert st.converged is True

    # Compare numeric telemetry values
    v1 = [p.reported_value for step in res1["observed_stream"] for p in step if p.measurement_type == "v_pu"]
    v2 = [p.reported_value for step in res2["observed_stream"] for p in step if p.measurement_type == "v_pu"]
    np.testing.assert_allclose(v1, v2, rtol=1e-6)

def test_physical_scenarios_produce_real_alterations():
    """Verify that P0 physical scenarios alter the electrical grid physics."""
    # 1. Load Increase Scenario
    spec_load = ScenarioSpec(
        scenario_type=ScenarioType.LOAD_INCREASE, target_component="Bus 4",
        parameter_value=40.0, start_step=5, total_steps=15, seed=42
    )
    res_load = SimulationRunner(spec_load).run_all()
    # Post-step 5 should have higher power flow on lines connected to Bus 4
    p_load_early = res_load["states"][2].buses[3].p_mw
    p_load_late = res_load["states"][8].buses[3].p_mw
    assert p_load_late > p_load_early + 30.0

    # 2. Line Failure Scenario
    spec_line = ScenarioSpec(
        scenario_type=ScenarioType.LINE_FAILURE, target_component="Line 1",
        start_step=5, total_steps=15, seed=42
    )
    res_line = SimulationRunner(spec_line).run_all()
    # Line 1 should be out of service after step 5
    assert res_line["states"][2].lines[0].in_service is True
    assert res_line["states"][8].lines[0].in_service is False

    # 3. Generator Failure Scenario
    spec_gen = ScenarioSpec(
        scenario_type=ScenarioType.GENERATOR_FAILURE, start_step=5, total_steps=15, seed=42
    )
    res_gen = SimulationRunner(spec_gen).run_all()
    # Gen 1 at Bus 2 should be out of service after step 5 and Bus 2 voltage drops
    v_b2_early = res_gen["states"][2].buses[1].vm_pu
    v_b2_late = res_gen["states"][8].buses[1].vm_pu
    assert v_b2_late < v_b2_early

import uuid

def test_frequency_coi_swing_model():
    """Verify frequency response adheres to swing equation."""
    coi = FrequencyCOIModel(f0=60.0, H=5.0, D=2.0)
    # Balanced load -> 60 Hz
    f_balanced = coi.step(p_gen_total_mw=259.0, p_load_total_mw=259.0)
    assert abs(f_balanced - 60.0) < 1e-4

    # Deficit -> Frequency drops
    f_deficit = coi.step(p_gen_total_mw=220.0, p_load_total_mw=259.0)
    assert f_deficit < 60.0

from backend.app.persistence.database import init_db, SessionLocal
from backend.app.persistence.models import RunModel, VisitorModel
from datetime import datetime, timezone, timedelta


def test_sqlite_persistence_initialization():
    """Verify SQLite database schema and persistence."""
    init_db()
    with SessionLocal() as session:
        now = datetime.now(timezone.utc)
        vis = VisitorModel(
            id="vis-test-01",
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(hours=24),
            quota_counters_json={}
        )
        session.merge(vis)
        session.flush()

        test_id = f"RUN_TEST_{uuid.uuid4().hex[:6]}"
        run_record = RunModel(
            id=test_id,
            visitor_id="vis-test-01",
            kind="SCENARIO",
            scenario_type="NORMAL",
            seed=42,
            sim_step=50,
            status="COMPLETED"
        )
        session.add(run_record)
        session.commit()


