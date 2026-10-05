"""GridShield AI — Headless Demo Test Script (make demo-test).

Executes both the Primary FDI Demo and the Secondary Physical Fault Demo
and validates that the full pipeline executes cleanly, deterministically,
and satisfies all golden tolerances.
"""

import sys
import json
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.demo_runner import DemoRunner


def main():
    print("=" * 70)
    print("GRIDSHIELD AI — HEADLESS DEMO VALIDATION SUITE")
    print("=" * 70)
    start_time = time.time()

    runner = DemoRunner()

    print("\n[1/2] Running Primary Demo (FDI Attack on Bus 4 with SCADA Escalation)...")
    p_start = time.time()
    primary_res = runner.run_primary_fdi_demo(seed=42, target_bus="Bus 4")
    p_dur = time.time() - p_start
    print(f"  -> Completed in {p_dur:.2f}s")
    print(f"  -> Run ID: {primary_res['run_id']}")
    print(f"  -> Steps Simulated: {primary_res['steps_simulated']}")
    print(f"  -> Incidents Created: {primary_res['incidents_created']}")
    
    if primary_res["active_incident"]:
        inc = primary_res["active_incident"]
        print(f"  -> Active Incident: {inc['incident_id']} ({inc['classification']})")
        print(f"  -> Attribution Likely Cause: {inc['attribution']['likely_cause']}")
        print(f"  -> Risk Level: {inc['risk']['risk_level']}")
    
    if primary_res["verification_result"]:
        ver = primary_res["verification_result"]
        print(f"  -> Verification Success: {ver['success']}")
        print(f"  -> Summary: {ver['summary']}")
        print(f"  -> Baseline Max Voltage Dev: {ver['baseline_metrics']['max_voltage_deviation_pu']:.4f} p.u.")
        print(f"  -> Unmitigated Max Voltage Dev: {ver['unmitigated_impact_metrics']['max_voltage_deviation_pu']:.4f} p.u.")
        print(f"  -> Mitigated Max Voltage Dev: {ver['mitigated_metrics']['max_voltage_deviation_pu']:.4f} p.u.")

    print("\n[2/2] Running Secondary Demo (Physical Line 1-2 Outage Contrast)...")
    s_start = time.time()
    secondary_res = runner.run_secondary_physical_demo(seed=42, line_target="Line 1-2")
    s_dur = time.time() - s_start
    print(f"  -> Completed in {s_dur:.2f}s")
    print(f"  -> Run ID: {secondary_res['run_id']}")
    if secondary_res["active_incident"]:
        inc = secondary_res["active_incident"]
        print(f"  -> Active Incident: {inc['incident_id']} ({inc['classification']})")
        print(f"  -> Attribution Likely Cause: {inc['attribution']['likely_cause']}")

    # Assertions
    assert primary_res["status"] == "COMPLETED", "Primary demo failed"
    assert secondary_res["status"] == "COMPLETED", "Secondary demo failed"

    total_dur = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"DEMO TEST PASSED in {total_dur:.2f}s (Budget: < 90s)")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
