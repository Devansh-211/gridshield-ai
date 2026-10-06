"""
GridShield AI — Sensor Configuration & Sensor Health Manager (Rule R3, R5).

Manages:
1. Sensor placement, gaussian noise parameters, and calibration offsets.
2. Sensor degradation detection (stuck values, excessive noise, missing signals).
3. Data quality score calculation for Rule R5 5D Confidence Vector.
4. Attribution hypothesis generation for sensor faults (H_data_quality).
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.envelope import AttributionHypothesis, NonAnswerState

class SensorConfig(BaseModel):
    sensor_id: str
    device_type: str = Field(..., description="BUS_VOLTAGE | LINE_CURRENT | FREQUENCY | POWER_FLOW")
    target_id: str = Field(..., description="Target bus or line identifier")
    noise_sigma: float = Field(0.002, ge=0.0, le=0.5, description="Gaussian noise standard deviation")
    bias: float = Field(0.0, description="Constant offset bias")
    stuck_value: Optional[float] = Field(None, description="Stuck sensor value if malfunctioning")
    is_missing: bool = Field(False, description="Flag indicating sensor packet drop / offline")
    is_compromised: bool = Field(False, description="Flag indicating cyber tampering")


class SensorHealthReport(BaseModel):
    total_sensors: int
    active_sensors: int
    missing_sensors: int
    stuck_sensors: int
    compromised_sensors: int
    data_quality_score: float = Field(..., ge=0.0, le=1.0)
    hypotheses: List[AttributionHypothesis] = Field(default_factory=list)


class SensorManager:
    """
    Manages operational state and health assessment of physical grid sensors.
    """
    def __init__(self, sensors: Optional[List[SensorConfig]] = None):
        self.sensors: Dict[str, SensorConfig] = {}
        if sensors:
            for s in sensors:
                self.sensors[s.sensor_id] = s

    def add_sensor(self, config: SensorConfig):
        self.sensors[config.sensor_id] = config

    def remove_sensor(self, sensor_id: str):
        self.sensors.pop(sensor_id, None)

    def evaluate_sensor_health(self) -> SensorHealthReport:
        """
        Evaluate overall telemetry sensor health and calculate data quality metric.
        """
        total = len(self.sensors)
        if total == 0:
            return SensorHealthReport(
                total_sensors=0,
                active_sensors=0,
                missing_sensors=0,
                stuck_sensors=0,
                compromised_sensors=0,
                data_quality_score=1.0,
                hypotheses=[AttributionHypothesis.NORMAL]
            )

        missing = sum(1 for s in self.sensors.values() if s.is_missing)
        stuck = sum(1 for s in self.sensors.values() if s.stuck_value is not None)
        compromised = sum(1 for s in self.sensors.values() if s.is_compromised)
        active = total - missing

        # Calculate data quality score (0 - 1)
        completeness = active / total
        stuck_ratio = stuck / total
        quality_score = max(0.0, min(1.0, round(completeness * (1.0 - 0.5 * stuck_ratio), 4)))

        hypotheses = []
        if stuck > 0 or missing > 0:
            hypotheses.append(AttributionHypothesis.H_DATA_QUALITY)
        if compromised > 0:
            hypotheses.append(AttributionHypothesis.FALSE_DATA_INJECTION)
        if not hypotheses:
            hypotheses.append(AttributionHypothesis.NORMAL)

        return SensorHealthReport(
            total_sensors=total,
            active_sensors=active,
            missing_sensors=missing,
            stuck_sensors=stuck,
            compromised_sensors=compromised,
            data_quality_score=quality_score,
            hypotheses=hypotheses
        )
