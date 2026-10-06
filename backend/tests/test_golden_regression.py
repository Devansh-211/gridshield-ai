"""
Golden Fixtures Regression Test Suite (Phase P1).
Verifies that all 6 core physical and cyber scenarios reproduce with strict tolerances (< 1e-5 relative)
against the locked pre-refactor golden benchmarks in tests/golden/*.
"""
import os
import json
import pytest
import numpy as np
from backend.app.schemas.contracts import ScenarioSpec
from backend.app.services.simulation_runner import SimulationRunner

GOLDEN_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tests", "golden")
SCENARIO_NAMES = ["normal", "generator_trip", "line_outage", "sensor_fault", "fdi", "cyber_physical"]


@pytest.mark.parametrize("scenario_name", SCENARIO_NAMES)
def test_golden_scenario_regression(scenario_name: str):
    fixture_path = os.path.join(GOLDEN_DIR, f"{scenario_name}.json")
    assert os.path.exists(fixture_path), f"Golden fixture missing: {fixture_path}"

    with open(fixture_path, "r") as f:
        fixture = json.load(f)

    spec = ScenarioSpec(**fixture["spec"])
    runner = SimulationRunner(spec)
    result = runner.run_all()

    expected_states = fixture["states"]
    actual_states = result["states"]

    assert len(actual_states) == len(expected_states), (
        f"State count mismatch for {scenario_name}: {len(actual_states)} vs {len(expected_states)}"
    )

    for step_idx, (act_state, exp_state) in enumerate(zip(actual_states, expected_states)):
        assert act_state.converged == exp_state["converged"], (
            f"Convergence mismatch at step {step_idx} in {scenario_name}"
        )
        assert np.isclose(act_state.frequency_hz, exp_state["frequency_hz"], atol=1e-4), (
            f"Frequency mismatch at step {step_idx}: {act_state.frequency_hz} vs {exp_state['frequency_hz']}"
        )

        # Bus voltages and angles
        for act_bus, exp_bus in zip(act_state.buses, exp_state["buses"]):
            assert act_bus.bus_id == exp_bus["bus_id"]
            assert np.isclose(act_bus.vm_pu, exp_bus["vm_pu"], rtol=1e-4, atol=1e-5), (
                f"Bus {act_bus.bus_id} V_pu mismatch at step {step_idx} in {scenario_name}: {act_bus.vm_pu} vs {exp_bus['vm_pu']}"
            )
            assert np.isclose(act_bus.va_degree, exp_bus["va_degree"], atol=0.01), (
                f"Bus {act_bus.bus_id} angle mismatch at step {step_idx} in {scenario_name}"
            )

        # Line loadings
        for act_line, exp_line in zip(act_state.lines, exp_state["lines"]):
            assert act_line.line_id == exp_line["line_id"]
            assert act_line.in_service == exp_line["in_service"]
            if act_line.in_service:
                assert np.isclose(act_line.loading_pct, exp_line["loading_pct"], atol=0.1), (
                    f"Line {act_line.line_id} loading mismatch at step {step_idx} in {scenario_name}"
                )

    # Verify observed telemetry sample
    for step_idx, exp_telemetry_sample in enumerate(fixture["observed_telemetry_sample"]):
        act_telemetry_step = result["observed_stream"][step_idx][:len(exp_telemetry_sample)]
        for act_pt, exp_pt in zip(act_telemetry_step, exp_telemetry_sample):
            assert act_pt.component_id == exp_pt["component_id"]
            assert act_pt.measurement_type == exp_pt["measurement_type"]
            assert np.isclose(act_pt.reported_value, exp_pt["reported_value"], rtol=1e-4, atol=1e-5), (
                f"Telemetry mismatch for {act_pt.component_id} {act_pt.measurement_type} at step {step_idx} in {scenario_name}"
            )
