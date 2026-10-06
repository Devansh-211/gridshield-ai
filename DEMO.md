# GridShield AI — Scenario Walkthrough Guide

## 1. Primary Demo: False Data Injection (FDI) on Bus 4
### Why Bus 4?
In the IEEE 14-bus benchmark, **Bus 4** is the primary central load junction interconnecting Bus 1, Bus 2 (Generation), Bus 3, and Bus 5. The SCADA supervisory controller monitors Bus 4 voltage to adjust Gen 2 excitation. Tampering with Bus 4 telemetry produces an immediate, measurable cyber-physical consequence on the real grid.

### Demo Flow:
1. **Nominal Baseline**: Grid operates smoothly within nominal voltage band ($0.95 \le V \le 1.05\text{ p.u.}$).
2. **FDI Injection**: Attacker injects $-0.12\text{ p.u.}$ bias on Bus 4 voltage telemetry at Step 5.
3. **Closed-Loop SCADA Escalation**: The supervisory controller perceives low voltage and raises Gen 2 voltage setpoint, over-exciting the physical grid.
4. **Detection**:
   - L1 detects bad data (Normalized Residual $> 3.0$).
   - L2 flags anomalous feature vector (Anomaly Score $> 0.15$).
   - L3 classifies attack as `FALSE_DATA_INJECTION` (Calibrated probability $> 0.85$).
5. **Attribution**: Evaluates physical vs cyber hypotheses. Rejects physical outage (no coherent neighbor propagation) and attributes to **`CYBER`**.
6. **Incident Created**: Incident `GS-0001` opened with evidence items.
7. **Impact Simulation**: Simulates what happens if ignored — voltage violations escalate across 6 buses.
8. **Mitigation**: Recommends `QUARANTINE_MEASUREMENT` on Bus 4 voltage and re-runs state estimation on clean redundant sensors.
9. **3-Way Verification**: Compares Baseline vs Unmitigated vs Mitigated state, proving voltage stability restoration.

---

## 2. Secondary Demo: Physical Line Failure (Line 1-2 Outage)
1. **Physical Disturbance**: Line 1-2 trips out of service.
2. **Attribution Contrast**:
   - Power redistributes across parallel paths (Line 1-5 loading increases coherently).
   - Physical explainability model successfully matches the outage hypothesis ($H_{\text{physical}} > 0.80$).
   - Zero cyber anomalies detected in telemetry logs.
   - Attributed cleanly to **`PHYSICAL`**.

---

## 3. Running the Demos
### Via Web UI
- Click **Run FDI Demo** or **Run Physical Demo** on the Dashboard ribbon or in Scenario Lab.

### Headless CLI
```bash
python scripts/run_demo_test.py
```
