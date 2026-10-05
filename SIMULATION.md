# GridShield AI — Power Grid Digital Twin & Simulation Physics

## 1. Grid Model (IEEE 14-Bus Benchmark)
- **Framework**: `pandapower` (Version 3.5.5) standard `case14()` AC power flow network.
- **Components**:
  - **14 Buses** (132 kV transmission & 33 kV sub-transmission).
  - **5 Generators / Synchronous Condensers**: Bus 1 (Slack/Gen 1), Bus 2 (Gen 2), Bus 3 (Synch Cond 3), Bus 6 (Synch Cond 6), Bus 8 (Synch Cond 8).
  - **11 Fixed Loads**: Total nominal load $\approx 259\text{ MW}, 73.5\text{ MVAr}$.
  - **15 Transmission Lines & 5 Transformers** (20 branches total).
  - **Shunts & Breakers**: Modeled as dynamic in-service flags.

---

## 2. Telemetry Generation & Measurement Noise
Observable measurement set with seeded Gaussian noise $\mathcal{N}(0, \sigma^2)$:
- **Bus Voltage Magnitudes**: $\sigma_V = 0.005\text{ p.u.}$
- **Active Power Injections**: $\sigma_P = 1.0\text{ MW}$
- **Reactive Power Injections**: $\sigma_Q = 1.0\text{ MVAr}$
- **Branch Power Flows**: $\sigma_{P,\text{line}} = 1.0\text{ MW}$, $\sigma_{Q,\text{line}} = 1.0\text{ MVAr}$

---

## 3. Quasi-Static Time-Series & Frequency Dynamics
- **Time Model**: 1 simulation step = 1.0 simulated second.
- **Center of Inertia (COI) Swing Model**:
  $$2H \frac{df}{dt} = \Delta P_{\text{gen}} - \Delta P_{\text{load}} - D \cdot \Delta f$$
  - $H = 5.0\text{ s}$ (System effective inertia constant)
  - $D = 1.5$ (Damping factor)
  - Governed primary frequency droop response labeled `SIMULATED (simplified COI model)`.

---

## 4. Closed-Loop SCADA Supervisory Controller
- Monitored Interconnection: **Bus 4** (Critical central load hub).
- Rule: If estimated voltage $V_{\text{est, Bus 4}} < 0.98\text{ p.u.}$, increase Gen 2 AVR setpoint $+0.02\text{ p.u.}$; if $> 1.02\text{ p.u.}$, decrease $-0.02\text{ p.u.}$.
- Consequence under FDI: When an attacker falsifies Bus 4 voltage to report $0.88\text{ p.u.}$, the SCADA controller repeatedly raises Gen 2 voltage, driving the real physical grid into severe overvoltage ($> 1.08\text{ p.u.}$).
