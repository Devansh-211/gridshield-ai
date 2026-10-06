# GridShield AI — Model Evaluation Report (model-v1.0)

**Evaluated At:** 2026-10-06  
**Provenance:** `SIMULATED EVALUATION` (Synthetic test data across held-out seeds [111, 112, 113, 114], N=1,120 samples)

---

## 1. Executive Metrics Summary

| Metric | Measured Value | 95% Confidence Interval |
|---|---|---|
| **Overall Accuracy** | **91.61%** | [89.8%, 93.2%] |
| **Macro F1-Score** | **0.8239** | — |
| **Normal False Positive Rate (FPR)** | **0.36%** | **[0.10%, 1.29%]** (Wilson 95%, N=560 normal windows) |
| **Improvement over L1 Classical WLS** | **+23.58%** | Baseline F1: 0.6667 → L3 F1: 0.8239 |

---

## 2. Layered Detection & Baseline Comparison

- **L1 (Classical WLS Residuals)**: Fast physics-based anomaly detection; effective on gross bad data but vulnerable to stealthy injection. F1: `0.6667`.
- **L2 (Isolation Forest Unsupervised Baseline)**: Detects novel anomalous operating envelopes without requiring attack labels. F1: `0.7812`.
- **L3 (Calibrated HistGradientBoosting Classifier)**: Cross-domain multi-class classification with calibrated probability confidence. Macro F1: `0.8239`.

---

## 3. False Data Injection Sensitivity vs Magnitude

| Magnitude | Detection Rate | Primary Trigger Layer |
|---|---|---|
| **0.5σ (0.0025 pu)** | 32.0% | Sub-sigma noise regime (blends into sensor noise) |
| **1.0σ (0.0050 pu)** | 68.0% | L2 IsolationForest |
| **2.0σ (0.0100 pu)** | 91.0% | L3 Calibrated Classifier |
| **5.0σ (0.0250 pu)** | 99.0% | L1 Chi-Square + L3 Classifier |
| **16.0σ (0.0800 pu)** | 100.0% | All Layers (L1, L2, L3) |

---

## 4. Known Limitations & Failure Cases
1. **Sub-sigma Stealthy FDI**: Injections below 0.8σ of sensor measurement error standard deviation cannot be reliably distinguished from natural Gaussian thermal noise.
2. **Dynamic Settling Ambiguity**: Severe multi-line physical contingencies with violent power swing can momentarily trigger transient cyber alerts before governor/AVR settling.
