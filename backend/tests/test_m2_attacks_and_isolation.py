import os
import ast
import pytest
from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, AttackSpec, AttackType,
    TelemetryQuality, Provenance
)
from backend.app.services.simulation_runner import SimulationRunner

def test_attack_isolation_invariant_i9():
    """
    Invariant I9: Attack engine manipulates only in-process objects.
    Must not import forbidden networking / raw packet crafting libraries.
    """
    forbidden_modules = {"socket", "requests", "httpx", "urllib", "scapy", "paramiko", "telnetlib"}
    attacks_dir = os.path.join(os.path.dirname(__file__), "..", "app", "attacks")

    for root, _, files in os.walk(attacks_dir):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    tree = ast.parse(f.read(), filename=file_path)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            root_pkg = alias.name.split(".")[0]
                            assert root_pkg not in forbidden_modules, f"Forbidden import '{alias.name}' found in {file_path}"
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            root_pkg = node.module.split(".")[0]
                            assert root_pkg not in forbidden_modules, f"Forbidden import from '{node.module}' found in {file_path}"

def test_ground_truth_firewall_invariant_i3():
    """
    Invariant I3: Detection, classification, and attribution modules must NEVER
    import GroundTruthPoint or access ground-truth types.
    """
    detection_dirs = [
        os.path.join(os.path.dirname(__file__), "..", "app", "detection"),
        os.path.join(os.path.dirname(__file__), "..", "app", "attribution"),
        os.path.join(os.path.dirname(__file__), "..", "app", "risk"),
    ]

    for d in detection_dirs:
        if not os.path.exists(d):
            continue
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith(".py"):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    assert "GroundTruthPoint" not in content, f"GroundTruthPoint imported in detection module {file_path}"
                    assert "GroundTruth" not in content, f"GroundTruth imported in detection module {file_path}"

def test_false_data_injection_preserves_truth():
    """Verify that FDI modifies reported_value while true_value remains clean."""
    spec = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=20,
        seed=42,
        attack=AttackSpec(
            attack_type=AttackType.FALSE_DATA_INJECTION,
            target_components=["Bus 4"],
            target_measurements=["v_pu"],
            magnitude=-0.08,
            start_step=5,
            duration_steps=10,
            seed=42
        )
    )
    res = SimulationRunner(spec).run_all()

    # Before attack (step 2)
    obs_early = next(p for p in res["observed_stream"][2] if p.component_id == "Bus 4" and p.measurement_type == "v_pu")
    gt_early = next(p for p in res["ground_truth_stream"][2] if p.component_id == "Bus 4" and p.measurement_type == "v_pu")
    assert abs(obs_early.reported_value - gt_early.true_value) < 0.02

    # During attack (step 8)
    obs_att = next(p for p in res["observed_stream"][8] if p.component_id == "Bus 4" and p.measurement_type == "v_pu")
    gt_att = next(p for p in res["ground_truth_stream"][8] if p.component_id == "Bus 4" and p.measurement_type == "v_pu")

    # True value is unchanged, reported value is depressed by approx 0.08
    assert abs(obs_att.reported_value - (gt_att.true_value - 0.08)) < 0.02
    assert obs_att.reported_value < gt_att.true_value - 0.05

    # Check cyber event emitted
    all_cyber = [evt for step_evts in res["cyber_event_stream"] for evt in step_evts]
    auth_evts = [e for e in all_cyber if "RTU_Bus4" in e.device_id or "Bus 4" in e.details]
    assert len(auth_evts) > 0

def test_malicious_control_command_attack():
    """Verify malicious control command trips line and emits critical cyber log."""
    spec = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=15,
        seed=42,
        attack=AttackSpec(
            attack_type=AttackType.MALICIOUS_CONTROL_COMMAND,
            target_components=["Line 1"],
            start_step=5,
            duration_steps=10,
            seed=42
        )
    )
    res = SimulationRunner(spec).run_all()

    # Line 1 in service before step 5, out of service after step 5
    assert res["states"][2].lines[0].in_service is True
    assert res["states"][8].lines[0].in_service is False

    all_cyber = [evt for step_evts in res["cyber_event_stream"] for evt in step_evts]
    cmd_evts = [e for e in all_cyber if "OPEN_BREAKER" in e.details]
    assert len(cmd_evts) > 0

def test_denial_of_service_attack():
    """Verify DoS attack degrades measurement quality to MISSING."""
    spec = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=15,
        seed=42,
        attack=AttackSpec(
            attack_type=AttackType.DENIAL_OF_SERVICE,
            target_components=["Bus 4"],
            start_step=5,
            duration_steps=10,
            seed=42
        )
    )
    res = SimulationRunner(spec).run_all()
    obs_att = [p for p in res["observed_stream"][8] if p.component_id == "Bus 4"]
    for p in obs_att:
        assert p.quality == TelemetryQuality.MISSING
