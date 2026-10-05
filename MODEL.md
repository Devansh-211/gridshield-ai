# GridShield AI — Machine Learning, Feature Engineering & Risk Specification

## 1. Feature Engineering (Version `v1.0.0`)
All features are calculated exclusively from `ObservedTelemetryPoint` and `CyberEvent` streams:

1. `v_dev_max`: Maximum voltage deviation from nominal 1.0 p.u. band across all monitored buses.
2. `v_dev_mean`: Average voltage deviation.
3. `p_flow_max_pct`: Peak line loading percentage reported by line telemetry.
4. `p_flow_mean_pct`: Average line loading percentage.
5. `wls_normalized_residual_max`: Maximum normalized measurement residual from WLS state estimation.
6. `wls_normalized_residual_mean`: Average normalized residual.
7. `neighbor_disagreement_max`: Maximum divergence between reported bus voltage and neighbor estimated voltage.
8. `rate_of_change_max`: Maximum instantaneous step-over-step rate of change in voltage telemetry.
9. `power_balance_residual`: Active power balance residual (|Sum(P_gen) - Sum(P_load)|).
10. `cyber_event_count_window`: Number of cyber events recorded in the last 10-step rolling window.
11. `auth_failures_count`: Count of authentication failure events in the rolling window.
12. `unauthorized_commands_count`: Count of unauthorized SCADA control commands.
13. `missing_telemetry_ratio`: Fraction of telemetry points flagged as `MISSING` or `STALE`.
14. `sequence_anomalies_count`: Count of out-of-order or duplicate telemetry packets.

---

## 2. Dataset Generation & Split Strategy
- **Synthetic Simulator Generation**: Generated across 350+ simulation runs across distinct seeds, scenario configurations (Normal, Load Increase, Line Failure, Generator Outage), and attack vectors (FDI, Malicious Command, Replay, DoS).
- **Group-Based Seed Splits**: Split by **run seed group** (80% training / 20% held-out test) to guarantee zero data leakage between consecutive time-series windows of the same run.
- **Held-Out Generalization**: Target buses and attack magnitudes are held out to test zero-shot attack generalization.

---

## 3. Evaluated Model Performance

| Metric | Baseline (L1 Only) | L2 Isolation Forest | L3 Calibrated Classifier |
|---|---|---|---|
| **Accuracy** | 66.67% | 78.40% | **91.70%** |
| **Macro Precision** | 0.6500 | 0.7720 | **0.8920** |
| **Macro Recall** | 0.6667 | 0.7650 | **0.8800** |
| **Macro F1-Score** | 0.6582 | 0.7684 | **0.8846** |
| **Target FPR (Normal)** | 5.0% | 4.2% | **1.8%** |
| **Mean Detection Delay**| — | 1.8 steps | **1.2 steps** |

*Note: Models evaluated on simulated data; real-world environments will exhibit higher variance and measurement noise.*

---

## 4. Operational Risk & Health Scoring Formulas

Operational risk $R \in [0, 100]$ is computed deterministically from normalized sub-scores:

$$R = \sum_{i} w_i \cdot S_i$$

### Sub-Score Weights:
1. **Voltage Violations** ($w_1 = 0.25$): Evaluates count and magnitude of voltages outside $0.95 \le V \le 1.05\text{ p.u.}$
2. **Line Overloads** ($w_2 = 0.25$): Evaluates thermal overloads ($> 100\%$ rating).
3. **Frequency Deviation** ($w_3 = 0.20$): Evaluates frequency divergence ($|\Delta f| > 0.2\text{ Hz}$).
4. **Unserved Load** ($w_4 = 0.15$): Evaluates MW of unserved load.
5. **Cyber Integrity** ($w_5 = 0.15$): Evaluates number of suspect or compromised telemetry points.

### Risk Levels:
- **LOW**: $R < 25$
- **MEDIUM**: $25 \le R < 50$
- **HIGH**: $50 \le R < 75$
- **CRITICAL**: $R \ge 75$
