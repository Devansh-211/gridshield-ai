# GridShield AI — Model Evaluation Report

> **DISCLAIMER**: Model trained and evaluated on simulated digital twin telemetry. Metrics reflect simulated evaluation.

## Summary Metrics
- **Model Version**: `model-v1.0`
- **Feature Version**: `feat-v1.0`
- **Dataset Version**: `dataset-v1.0`
- **Overall Accuracy**: `91.70%`
- **Macro F1 Score**: `0.8846`
- **Normal FPR**: `0.54%`
- **L1 Baseline (Chi-Square) F1**: `0.6667`

## Confusion Matrix (Classes: [np.str_('DENIAL_OF_SERVICE'), np.str_('FALSE_DATA_INJECTION'), np.str_('MALICIOUS_CONTROL_COMMAND'), np.str_('NORMAL'), np.str_('PHYSICAL_FAULT'), np.str_('REPLAY')])
```json
[
  [
    80,
    0,
    0,
    0,
    0,
    0
  ],
  [
    0,
    80,
    0,
    0,
    0,
    0
  ],
  [
    0,
    0,
    43,
    0,
    37,
    0
  ],
  [
    0,
    0,
    0,
    557,
    3,
    0
  ],
  [
    0,
    0,
    43,
    10,
    187,
    0
  ],
  [
    0,
    0,
    0,
    0,
    0,
    80
  ]
]
```

## Per-Class Classification Report
```json
{
  "DENIAL_OF_SERVICE": {
    "precision": 1.0,
    "recall": 1.0,
    "f1-score": 1.0,
    "support": 80.0
  },
  "FALSE_DATA_INJECTION": {
    "precision": 1.0,
    "recall": 1.0,
    "f1-score": 1.0,
    "support": 80.0
  },
  "MALICIOUS_CONTROL_COMMAND": {
    "precision": 0.5,
    "recall": 0.5375,
    "f1-score": 0.5180722891566265,
    "support": 80.0
  },
  "NORMAL": {
    "precision": 0.982363315696649,
    "recall": 0.9946428571428572,
    "f1-score": 0.9884649511978705,
    "support": 560.0
  },
  "PHYSICAL_FAULT": {
    "precision": 0.8237885462555066,
    "recall": 0.7791666666666667,
    "f1-score": 0.8008565310492506,
    "support": 240.0
  },
  "REPLAY": {
    "precision": 1.0,
    "recall": 1.0,
    "f1-score": 1.0,
    "support": 80.0
  },
  "accuracy": 0.9169642857142857,
  "macro avg": {
    "precision": 0.8843586436586927,
    "recall": 0.885218253968254,
    "f1-score": 0.8845656285672913,
    "support": 1120.0
  },
  "weighted avg": {
    "precision": 0.9177077749030758,
    "recall": 0.9169642857142857,
    "f1-score": 0.9171354671921051,
    "support": 1120.0
  }
}
```
