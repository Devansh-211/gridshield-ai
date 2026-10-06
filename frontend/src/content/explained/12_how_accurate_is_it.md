# How Accurate Is It?

All scores come from test runs and are checked in code.

### Measured Scores (Model v1.0)

- **Accuracy:** 91.6% across 2,480 test runs.
- **Macro F1:** 0.8239.
- **False Alarm Rate:** 0.36% on clean normal days.

### Honest Limits
1. **Tiny Injections:** Changes below 0.02 per-unit blend with normal sensor noise.
2. **Stealth Attacks:** Subtle attacks can slip past math checks and need AI pattern checks.
3. **Simulated Scores:** Scores on software data are higher than real-world grids would be.
