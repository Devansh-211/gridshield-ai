"""
GridShield AI — Dataset Replay Engine (Analysis Mode & Rules R1, R2, R4).

Ingests historical or public dataset telemetry streams (CSV/Parquet/JSON)
and processes them through the detection, attribution, and evidence pipeline.

Outputs:
- Environment label: REPLAY(dataset_id)
- Provenance label: PUBLIC_DATASET / HISTORICAL
- EvidenceObject with versioning & 5D confidence vector
"""
import csv
import io
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, TelemetryQuality, Provenance as ProvenanceContract
)
from backend.app.schemas.envelope import (
    Provenance as ProvenanceEnvelope, EnvironmentLabel, EvidenceObject, ConfidenceVector
)
from backend.app.detection.detector import AnomalyDetector
from backend.app.attribution.engine import AttributionEngine
from backend.app.risk.engine import RiskEngine

class DatasetReplayEngine:
    """
    Replay Engine for historical and public dataset analysis.
    """
    def __init__(self):
        self.detector = AnomalyDetector()
        self.attribution_engine = AttributionEngine()
        self.risk_engine = RiskEngine()

    def replay_csv_dataset(self, dataset_id: str, csv_content: str) -> Dict[str, Any]:
        """
        Replay CSV telemetry dataset and produce evidence report.
        CSV Columns: timestamp, component_id, component_type, measurement_type, reported_value, unit
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        telemetry_points: List[ObservedTelemetryPoint] = []

        for row in reader:
            point = ObservedTelemetryPoint(
                timestamp=float(row.get("timestamp", 0.0)),
                wall_time=datetime.now(timezone.utc).isoformat(),
                component_id=row.get("component_id", "Bus 1"),
                component_type=row.get("component_type", "bus"),
                measurement_type=row.get("measurement_type", "v_pu"),
                reported_value=float(row.get("reported_value", 1.0)),
                unit=row.get("unit", "p.u."),
                quality=TelemetryQuality.GOOD,
                sequence=1,
                source_device_id=f"REPLAY_{dataset_id}",
                provenance=ProvenanceContract.OBSERVED
            )
            telemetry_points.append(point)

        # Run anomaly detection
        detection = self.detector.analyze(1, telemetry_points, [])
        attribution = self.attribution_engine.attribute(1, detection, telemetry_points, [])
        risk = self.risk_engine.evaluate_risk(telemetry_points, detection, attribution, [])

        # Calculate 5D confidence vector (Rule R5)
        confidence = ConfidenceVector.calculate(
            detection=0.95 if detection.overall_anomaly_flag else 0.10,
            attribution=attribution.confidence if hasattr(attribution, 'confidence') else 0.85,
            model_uncertainty=0.90,
            evidence_completeness=1.0,
            data_quality=0.95
        )

        evidence = EvidenceObject(
            incident_id=f"INC_REPLAY_{dataset_id.upper()}",
            environment=EnvironmentLabel.REPLAY,
            versions={
                "topology": "IEEE_14",
                "state_estimate": "WLS_v1",
                "model": "v1.0",
                "data_schema": "contracts-v1.0",
                "code_commit": "workbench-mvp"
            },
            data_sources=[f"REPLAY_{dataset_id}"],
            detector_outputs={
                "overall_anomaly": detection.overall_anomaly_flag,
                "residual_stat": detection.l1.chi2_stat,
                "anomaly_score": detection.l2.anomaly_score
            },
            attribution={
                "label": attribution.likely_cause if hasattr(attribution, 'likely_cause') else "NORMAL",
                "hypothesis_probabilities": attribution.hypothesis_scores if hasattr(attribution, 'hypothesis_scores') else {},
                "non_answer_state": None
            },
            confidence=confidence,
            provenance=ProvenanceEnvelope.PUBLIC_DATASET,
            limitations=[
                f"Replay Analysis of dataset '{dataset_id}'. Operational actuation disabled."
            ]
        )

        return {
            "dataset_id": dataset_id,
            "environment": f"REPLAY({dataset_id})",
            "telemetry_count": len(telemetry_points),
            "detection": detection.model_dump(),
            "attribution": attribution.model_dump() if hasattr(attribution, 'model_dump') else attribution,
            "risk": risk.model_dump() if hasattr(risk, 'model_dump') else risk,
            "evidence_object": evidence.model_dump()
        }
