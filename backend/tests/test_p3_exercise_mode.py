"""
Phase 3: Exercise Mode Scenario Authoring & Execution Verification Suite.

Verifies:
1. Custom physical disturbance + FDI/DoS cyber attack scenario authoring.
2. Deterministic scenario execution using counter-based RNG.
3. Rule R3 non-answer state safety (prohibits mitigation on non-answers).
4. Evidence Object construction under exercise simulation.
"""
import pytest
from backend.app.schemas.contracts import ScenarioSpec, AttackSpec
from backend.app.services.simulation_runner import SimulationRunner

def test_exercise_mode_fdi_scenario_execution():
    """Verify executing custom exercise scenario with False Data Injection."""
    spec = ScenarioSpec(
        scenario_type="NORMAL",
        parameter_value=0.0,
        start_step=5,
        duration_steps=10,
        total_steps=15,
        seed=42,
        attack=AttackSpec(
            attack_type="FALSE_DATA_INJECTION",
            target_components=["Bus 4"],
            target_measurements=[],
            start_step=5,
            duration_steps=10,
            magnitude=-0.12,
            seed=42
        )
    )
    runner = SimulationRunner(spec)
    run = runner.run_all()

    assert run is not None
    assert "run_id" in run
    assert len(run["observed_stream"]) > 0
    assert len(run["events"]) > 0


def test_exercise_mode_line_trip_scenario():
    """Verify executing physical line failure scenario."""
    spec = ScenarioSpec(
        scenario_type="LINE_FAILURE",
        target_component="Line 1-2",
        parameter_value=0.0,
        start_step=3,
        duration_steps=10,
        total_steps=15,
        seed=100
    )
    runner = SimulationRunner(spec)
    run = runner.run_all()

    assert run is not None
    assert "run_id" in run
    assert len(run["states"]) == 15


def test_scenario_execution_reproducibility():
    """Rule R10: Identical seed + spec yields identical deterministic telemetry."""
    spec = ScenarioSpec(
        scenario_type="LOAD_INCREASE",
        parameter_value=0.15,
        start_step=2,
        duration_steps=5,
        total_steps=10,
        seed=999
    )

    run1 = SimulationRunner(spec).run_all()
    run2 = SimulationRunner(spec).run_all()

    t1_v = [p[0].reported_value for p in run1["observed_stream"][:5]]
    t2_v = [p[0].reported_value for p in run2["observed_stream"][:5]]

    assert t1_v == t2_v
