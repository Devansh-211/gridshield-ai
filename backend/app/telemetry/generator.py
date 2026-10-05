"""
Telemetry and Ground-Truth Generator (Section 5.3 & Section 6).
Extracts physical state, computes ground-truth points, injects seeded Gaussian measurement noise,
and packages ObservedTelemetryPoints with quality flags and sequence numbers.
"""
import datetime
from typing import List, Tuple, Optional
from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, GroundTruthPoint, TelemetryQuality,
    Provenance, GridState
)
from backend.app.core.rng import RNGFactory, get_rng

# Documented Standard Noise Standard Deviations (Sigma)
SIGMA_VOLTAGE_PU = 0.005  # 0.5% voltage measurement noise
SIGMA_POWER_MW = 0.50     # 0.50 MW power measurement noise
SIGMA_POWER_MVAR = 0.50   # 0.50 MVAr reactive power measurement noise
SIGMA_FREQUENCY_HZ = 0.01 # 0.01 Hz PMU frequency noise

class TelemetryGenerator:
    def __init__(self, rng: Optional[RNGFactory] = None):
        self.rng = rng or get_rng(42)
        self._sequence = 0

    def generate(self, grid_state: GridState) -> Tuple[List[ObservedTelemetryPoint], List[GroundTruthPoint]]:
        """
        Produce parallel streams of Observed Telemetry and Ground Truth points.
        Firewall: Detection code receives ONLY Observed Telemetry (Invariant I3).
        """
        wall_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        observed_points: List[ObservedTelemetryPoint] = []
        ground_truth_points: List[GroundTruthPoint] = []

        # 1. Bus Telemetry
        for bus in grid_state.buses:
            self._sequence += 1
            comp_id = f"Bus {bus.bus_id}"
            device_id = f"RTU_B{bus.bus_id:02d}"

            # Voltage Magnitude
            v_true = bus.vm_pu
            v_noise = float(self.rng.normal(0.0, SIGMA_VOLTAGE_PU))
            v_obs = max(0.0, v_true + v_noise)

            ground_truth_points.append(GroundTruthPoint(
                timestamp=grid_state.sim_time_s,
                component_id=comp_id,
                component_type="bus",
                measurement_type="v_pu",
                true_value=round(v_true, 5),
                unit="p.u.",
                provenance=Provenance.SIMULATED
            ))
            observed_points.append(ObservedTelemetryPoint(
                timestamp=grid_state.sim_time_s,
                wall_time=wall_time,
                component_id=comp_id,
                component_type="bus",
                measurement_type="v_pu",
                reported_value=round(v_obs, 5),
                unit="p.u.",
                quality=TelemetryQuality.GOOD,
                sequence=self._sequence,
                source_device_id=device_id,
                provenance=Provenance.OBSERVED
            ))

            # Bus Active Power Injection
            self._sequence += 1
            p_true = bus.p_mw
            p_noise = float(self.rng.normal(0.0, SIGMA_POWER_MW))
            p_obs = p_true + p_noise

            ground_truth_points.append(GroundTruthPoint(
                timestamp=grid_state.sim_time_s,
                component_id=comp_id,
                component_type="bus",
                measurement_type="p_mw",
                true_value=round(p_true, 4),
                unit="MW",
                provenance=Provenance.SIMULATED
            ))
            observed_points.append(ObservedTelemetryPoint(
                timestamp=grid_state.sim_time_s,
                wall_time=wall_time,
                component_id=comp_id,
                component_type="bus",
                measurement_type="p_mw",
                reported_value=round(p_obs, 4),
                unit="MW",
                quality=TelemetryQuality.GOOD,
                sequence=self._sequence,
                source_device_id=device_id,
                provenance=Provenance.OBSERVED
            ))

            # Bus Reactive Power Injection
            self._sequence += 1
            q_true = bus.q_mvar
            q_noise = float(self.rng.normal(0.0, SIGMA_POWER_MVAR))
            q_obs = q_true + q_noise

            ground_truth_points.append(GroundTruthPoint(
                timestamp=grid_state.sim_time_s,
                component_id=comp_id,
                component_type="bus",
                measurement_type="q_mvar",
                true_value=round(q_true, 4),
                unit="MVAr",
                provenance=Provenance.SIMULATED
            ))
            observed_points.append(ObservedTelemetryPoint(
                timestamp=grid_state.sim_time_s,
                wall_time=wall_time,
                component_id=comp_id,
                component_type="bus",
                measurement_type="q_mvar",
                reported_value=round(q_obs, 4),
                unit="MVAr",
                quality=TelemetryQuality.GOOD,
                sequence=self._sequence,
                source_device_id=device_id,
                provenance=Provenance.OBSERVED
            ))

        # 2. Line Flows Telemetry
        for line in grid_state.lines:
            comp_id = f"Line {line.line_id}"
            device_id = f"IED_L{line.line_id:02d}"

            # Line loading %
            self._sequence += 1
            load_true = line.loading_pct
            load_obs = max(0.0, load_true + float(self.rng.normal(0.0, 0.5)))

            ground_truth_points.append(GroundTruthPoint(
                timestamp=grid_state.sim_time_s,
                component_id=comp_id,
                component_type="line",
                measurement_type="loading_pct",
                true_value=round(load_true, 2),
                unit="%",
                provenance=Provenance.SIMULATED
            ))
            observed_points.append(ObservedTelemetryPoint(
                timestamp=grid_state.sim_time_s,
                wall_time=wall_time,
                component_id=comp_id,
                component_type="line",
                measurement_type="loading_pct",
                reported_value=round(load_obs, 2),
                unit="%",
                quality=TelemetryQuality.GOOD if line.in_service else TelemetryQuality.MISSING,
                sequence=self._sequence,
                source_device_id=device_id,
                provenance=Provenance.OBSERVED
            ))

        # 3. Frequency Telemetry (PMU)
        self._sequence += 1
        f_true = grid_state.frequency_hz
        f_obs = f_true + float(self.rng.normal(0.0, SIGMA_FREQUENCY_HZ))

        ground_truth_points.append(GroundTruthPoint(
            timestamp=grid_state.sim_time_s,
            component_id="Grid Frequency",
            component_type="system",
            measurement_type="f_hz",
            true_value=round(f_true, 4),
            unit="Hz",
            provenance=Provenance.SIMULATED
        ))
        observed_points.append(ObservedTelemetryPoint(
            timestamp=grid_state.sim_time_s,
            wall_time=wall_time,
            component_id="Grid Frequency",
            component_type="system",
            measurement_type="f_hz",
            reported_value=round(f_obs, 4),
            unit="Hz",
            quality=TelemetryQuality.GOOD,
            sequence=self._sequence,
            source_device_id="PMU_REF",
            provenance=Provenance.OBSERVED
        ))

        return observed_points, ground_truth_points
