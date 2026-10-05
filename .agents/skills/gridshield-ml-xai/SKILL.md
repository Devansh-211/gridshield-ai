---
name: gridshield-ml-xai
description: Machine learning pipelines for cyber-physical anomaly detection, attack classification, and explainable AI (XAI) root cause attribution using scikit-learn, XGBoost, and SHAP.
---

# Machine Learning & Explainable AI Skill for GridShield AI

## Core Capabilities
- **Models**:
  - Unsupervised Anomaly Detection: `IsolationForest`, Autoencoders, One-Class SVM.
  - Multi-class Attack Classification: `XGBClassifier`, `RandomForestClassifier`, `GradientBoostingClassifier`.
- **Explainability (XAI)**:
  - `TreeExplainer` and `KernelExplainer` via `shap`.
  - Feature Importance Rankings and local waterfall attribution per alert.
- **Feature Engineering**:
  - Bus voltage deviations from nominal (1.0 p.u.).
  - Line active & reactive power flow imbalances ($P_{from} + P_{to} - P_{loss}$).
  - State estimation residual vectors ($||z - h(\hat{x})||$).
  - Temporal rate-of-change ($\Delta P/\Delta t$, $\Delta V/\Delta t$).

## XAI Response Structure
Every ML detection must provide:
1. `classification`: Attack type (e.g., `FALSE_DATA_INJECTION`, `PHYSICAL_TRIP`, `NORMAL`).
2. `confidence`: Prediction probability (0.00 to 1.00).
3. `anomaly_score`: Quantitative deviation from normal operating envelope.
4. `top_contributing_features`: Array of `{ feature_name, value, shap_value, interpretation }` showing operators exactly why the model flagged the event.
5. `recommended_mitigation`: Actionable mitigation prompt (e.g., "Isolate Substation 4 telemetry, fall back to physical estimator").
