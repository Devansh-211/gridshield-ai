"""
Feature Engineering Pipeline (Section 8).
Extracts statistical, electrical, residual, and cyber features
STRICTLY from Observed Telemetry Points and Cyber Events (Invariant I3).
"""
import numpy as np
from typing import List, Dict, Any, Optional
from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, CyberEvent, CyberEventType,
    TelemetryQuality, FeatureVector, Provenance
)
from backend.app.detection.wls_estimator import WLSStateEstimator

FEATURE_VERSION = "feat-v1.0"

class FeaturePipeline:
    def __init__(self):
        self.estimator = WLSStateEstimator(num_buses=14)
        self._prev_voltages: Dict[str, float] = {}

    def extract_features(self,
                         step: int,
                         observed_points: List[ObservedTelemetryPoint],
                         cyber_events: List[CyberEvent]) -> FeatureVector:
        """
        Extract numerical features for ML anomaly detection and classification.
        All features trace to observed data only.
        """
        features: Dict[str, float] = {}

        # 1. Electrical & Statistical Voltage Features
        voltages = [
            pt.reported_value for pt in observed_points
            if pt.measurement_type == "v_pu" and pt.quality != TelemetryQuality.MISSING
        ]
        if voltages:
            v_arr = np.array(voltages)
            features["max_voltage_dev"] = float(np.max(np.abs(v_arr - 1.0)))
            features["mean_voltage_dev"] = float(np.mean(np.abs(v_arr - 1.0)))
            features["min_voltage"] = float(np.min(v_arr))
            features["max_voltage"] = float(np.max(v_arr))
            features["voltage_variance"] = float(np.var(v_arr))
        else:
            features["max_voltage_dev"] = 0.0
            features["mean_voltage_dev"] = 0.0
            features["min_voltage"] = 1.0
            features["max_voltage"] = 1.0
            features["voltage_variance"] = 0.0

        # 2. Line Loading Features
        loadings = [
            pt.reported_value for pt in observed_points
            if pt.measurement_type == "loading_pct" and pt.quality != TelemetryQuality.MISSING
        ]
        if loadings:
            l_arr = np.array(loadings)
            features["max_line_loading"] = float(np.max(l_arr))
            features["mean_line_loading"] = float(np.mean(l_arr))
            features["overloaded_lines_count"] = float(np.sum(l_arr > 100.0))
        else:
            features["max_line_loading"] = 0.0
            features["mean_line_loading"] = 0.0
            features["overloaded_lines_count"] = 0.0

        # 3. Frequency Feature
        freq_pts = [pt.reported_value for pt in observed_points if pt.measurement_type == "f_hz"]
        if freq_pts:
            features["freq_dev_hz"] = float(abs(freq_pts[0] - 60.0))
        else:
            features["freq_dev_hz"] = 0.0

        # 4. L1 State Estimator Residual Features
        l1_result = self.estimator.analyze(observed_points)
        features["l1_chi2_stat"] = float(l1_result.chi2_stat)
        features["l1_max_lnr"] = float(l1_result.max_normalized_residual)
        features["l1_flagged_count"] = float(len(l1_result.flagged_measurements))

        # 5. Temporal Rate-of-Change Features
        current_voltages = {
            pt.component_id: pt.reported_value for pt in observed_points
            if pt.measurement_type == "v_pu" and pt.quality != TelemetryQuality.MISSING
        }
        if self._prev_voltages:
            v_diffs = [
                abs(current_voltages[k] - self._prev_voltages[k])
                for k in current_voltages if k in self._prev_voltages
            ]
            features["max_temporal_v_diff"] = float(max(v_diffs)) if v_diffs else 0.0
        else:
            features["max_temporal_v_diff"] = 0.0
        self._prev_voltages = current_voltages

        # 6. Quality & Cyber Features
        missing_count = sum(1 for pt in observed_points if pt.quality == TelemetryQuality.MISSING)
        stale_count = sum(1 for pt in observed_points if pt.quality == TelemetryQuality.STALE)
        features["missing_telemetry_count"] = float(missing_count)
        features["stale_telemetry_count"] = float(stale_count)

        # Cyber logs aggregation
        auth_failures = sum(1 for evt in cyber_events if evt.event_type == CyberEventType.AUTH_FAILURE)
        unauth_cmds = sum(1 for evt in cyber_events if evt.event_type == CyberEventType.COMMAND_ISSUED and evt.severity == "CRITICAL")
        packet_drops = sum(1 for evt in cyber_events if evt.event_type == CyberEventType.PACKET_LOSS)
        seq_anomalies = sum(1 for evt in cyber_events if evt.event_type == CyberEventType.SEQUENCE_ANOMALY)

        features["cyber_auth_failures"] = float(auth_failures)
        features["cyber_unauth_commands"] = float(unauth_cmds)
        features["cyber_packet_loss"] = float(packet_drops)
        features["cyber_sequence_anomalies"] = float(seq_anomalies)

        return FeatureVector(
            step=step,
            feature_version=FEATURE_VERSION,
            features=features,
            provenance=Provenance.CALCULATED
        )
