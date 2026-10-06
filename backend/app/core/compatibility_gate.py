"""
Validated-Domain & OOD Compatibility Gate (Rule R6 & R3).

Enforces:
1. Topology and data schema compatibility verification against models/registry/compatibility.json.
2. Feature-space Out-Of-Distribution (OOD) boundary detection.
3. Conflict arbitration between physics residuals and ML classifiers.
"""
import os
import json
from typing import Dict, Any, List, Optional, Tuple
from backend.app.schemas.envelope import NonAnswerState, EnvironmentLabel

COMPATIBILITY_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "models",
    "registry",
    "compatibility.json"
)

class CompatibilityGate:
    def __init__(self, config_path: Optional[str] = None):
        self.path = config_path or COMPATIBILITY_JSON_PATH
        self._config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        if os.path.exists(self.path):
            with open(self.path, "r") as f:
                return json.load(f)
        return {"models": {}}

    def check_topology_supported(self, model_id: str, topology_name: str) -> Tuple[bool, Optional[NonAnswerState]]:
        """Verify if the topology is supported and validated for the given model."""
        models = self._config.get("models", {})
        model_meta = models.get(model_id)
        if not model_meta:
            # Check default model
            model_meta = models.get("model-v1.0")

        if not model_meta:
            return False, NonAnswerState.TOPOLOGY_UNSUPPORTED

        supported = model_meta.get("supported_topologies", [])
        norm_topo = topology_name.lower().replace(" ", "").replace("-", "_")
        for s in supported:
            if s.lower().replace(" ", "").replace("-", "_") in norm_topo or norm_topo in s.lower().replace(" ", "").replace("-", "_"):
                return True, None

        return False, NonAnswerState.TOPOLOGY_UNSUPPORTED

    def check_feature_ood(
        self,
        model_id: str,
        voltages: List[float],
        loadings: List[float],
        frequency: float
    ) -> Tuple[bool, Optional[NonAnswerState]]:
        """
        Check whether live telemetry points exceed model feature-space distribution limits.
        """
        models = self._config.get("models", {})
        model_meta = models.get(model_id) or models.get("model-v1.0", {})
        bounds = model_meta.get("ood_bounds", {
            "v_pu_min": 0.50,
            "v_pu_max": 1.50,
            "loading_pct_max": 350.0,
            "frequency_hz_min": 45.0,
            "frequency_hz_max": 65.0
        })

        # Check voltage limits
        for v in voltages:
            if v < bounds["v_pu_min"] or v > bounds["v_pu_max"]:
                return True, NonAnswerState.MODEL_OUT_OF_DISTRIBUTION

        # Check loading limits
        for l in loadings:
            if l > bounds["loading_pct_max"]:
                return True, NonAnswerState.MODEL_OUT_OF_DISTRIBUTION

        # Check frequency
        if frequency < bounds["frequency_hz_min"] or frequency > bounds["frequency_hz_max"]:
            return True, NonAnswerState.MODEL_OUT_OF_DISTRIBUTION

        return False, None

    def evaluate_conflict(
        self,
        physics_anomaly: bool,
        physics_residual: float,
        ml_anomaly: bool,
        ml_confidence: float
    ) -> Optional[NonAnswerState]:
        """
        Rule R3 Conflict Rule:
        If physics-based residual detector and ML anomaly detector materially disagree with high confidence,
        return CONFLICTING_EVIDENCE rather than forcing an uncertain classification.
        """
        # Material conflict: physics detects severe anomaly (residual > 4.0 sigmas) but ML claims NORMAL with >0.85 prob
        if physics_anomaly and physics_residual > 4.0 and (not ml_anomaly and ml_confidence > 0.85):
            return NonAnswerState.CONFLICTING_EVIDENCE

        # Material conflict: physics residual is extremely nominal (< 0.1 sigmas) but ML predicts cyber attack with >0.90 prob
        if not physics_anomaly and physics_residual < 0.1 and (ml_anomaly and ml_confidence > 0.90):
            return NonAnswerState.CONFLICTING_EVIDENCE

        return None
