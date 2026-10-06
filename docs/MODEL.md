# GridShield AI — Model Card & Evaluation Documentation

## 1. Overview & Purpose
GridShield AI deploys a multi-layered cyber-physical anomaly detection and attack classification pipeline specifically trained and validated on the IEEE 14-bus cyber-physical digital twin benchmark.

> **DISCLAIMER (Invariant I10)**: Educational and research digital twin only. Models are evaluated on synthetic simulation distributions. Metrics reflect simulated evaluation and must not be interpreted as certified real-world grid protection guarantees.

---

## 2. Multi-Layer Architecture

### Layer 1: Classical WLS State Estimation & $\chi^2$ Residuals (Physics-Based)
- **Method**: Weighted Least Squares (WLS) state estimation with bad data detection.
- **Role**: Detects gross sensor failure and large physics inconsistencies ($P, Q, V, \theta$).
- **Baseline F1-Score**: `0.6667`

### Layer 2: Unsupervised Operating Envelope Detection (Isolation Forest)
- **Method**: Scikit-Learn `IsolationForest` fitted exclusively on verified `NORMAL` operating telemetry.
- **Role**: Flags novel operating anomalies and out-of-distribution grid excursions without requiring attack labels.
- **Baseline F1-Score**: `0.7812`

### Layer 3: Cross-Domain Multi-Class Attack Classifier (Calibrated HistGradientBoosting)
- **Method**: `HistGradientBoostingClassifier` with 3-fold cross-validation probability calibration (`CalibratedClassifierCV`).
- **Classes**: `NORMAL`, `FALSE_DATA_INJECTION`, `MALICIOUS_CONTROL_COMMAND`, `PHYSICAL_FAULT`, `REPLAY`, `DENIAL_OF_SERVICE`.
- **Abstention Threshold**: Emits `ClassificationClass.UNKNOWN` if calibrated confidence $< 0.45$ or if prediction margin $< 0.10$.

---

## 3. Verified Benchmark Evaluation Metrics (`model-v1.0`)

Evaluated on held-out test seeds `[111, 112, 113, 114]` (1,120 total samples):

| Metric | Measured Value | 95% Confidence Interval | Source / Provenance |
|---|---|---|---|
| **Overall Accuracy** | **91.61%** | [89.61%, 93.61%] | `SIMULATED EVALUATION` |
| **Macro F1-Score** | **0.8239** | — | `SIMULATED EVALUATION` |
| **Weighted F1-Score** | **0.8943** | — | `SIMULATED EVALUATION` |
| **Normal False Positive Rate (FPR)** | **0.36%** | **[0.10%, 1.29%]** | Wilson 95% CI ($N=560$) |
| **Improvement over L1 WLS** | **+23.58%** | Baseline: 0.6667 → L3: 0.8239 | `CALCULATED` |

---

## 4. Multi-Tier FDI Sensitivity vs Magnitude

| Injection Magnitude | Detection Rate | Primary Trigger Layer |
|---|---|---|
| **0.5σ (0.0025 pu)** | 32.0% | Sub-sigma noise regime (blends into Gaussian sensor noise) |
| **1.0σ (0.0050 pu)** | 68.0% | Layer 2 Isolation Forest |
| **2.0σ (0.0100 pu)** | 91.0% | Layer 3 Calibrated Classifier |
| **5.0σ (0.0250 pu)** | 99.0% | Layer 1 $\chi^2$ + Layer 3 Classifier |
| **16.0σ (0.0800 pu)** | 100.0% | All Layers (L1, L2, L3) |

---

## 5. Known Limitations & Failure Cases
1. **Sub-sigma Stealthy FDI**: Injections below $0.8\sigma$ of sensor measurement standard deviation blend with Gaussian thermal noise and cannot be reliably separated without multi-point PMU correlation.
2. **Dynamic Settling Ambiguity**: Severe multi-line physical contingencies with sudden power swings may trigger transient cyber alerts prior to governor and AVR steady-state settling.
