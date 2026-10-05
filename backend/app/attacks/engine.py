"""
Simulated Cyber-Physical Attack Engine (Section 7).
Strictly manipulates in-process simulation objects only (Invariant I9).
No sockets, no HTTP clients, no real protocol exploitation.
"""
from typing import List, Dict, Any, Optional, Tuple
from backend.app.schemas.contracts import (
    AttackSpec, AttackType, ObservedTelemetryPoint, GroundTruthPoint,
    CyberEvent, CyberEventType, TelemetryQuality, Provenance
)
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.simulation.indexing import parse_bus_label, bus_to_internal
from backend.app.core.rng import RNGFactory

class AttackEngine:
    def __init__(self, spec: Optional[AttackSpec] = None, rng: Optional[RNGFactory] = None):
        self.spec = spec or AttackSpec(attack_type=AttackType.NONE)
        self.rng = rng
        self._replay_buffer: List[List[ObservedTelemetryPoint]] = []

    def is_active(self, step: int) -> bool:
        if not self.spec or self.spec.attack_type == AttackType.NONE:
            return False
        return self.spec.start_step <= step < (self.spec.start_step + self.spec.duration_steps)

    def apply_telemetry_attack(self,
                               observed_points: List[ObservedTelemetryPoint],
                               step: int,
                               sim_time_s: float) -> Tuple[List[ObservedTelemetryPoint], List[CyberEvent]]:
        """
        Applies cyber alterations (FDI, Replay, DoS) to observed telemetry stream.
        Leaves ground truth entirely unmodified (Invariant I3).
        """
        cyber_events: List[CyberEvent] = []
        if not self.is_active(step):
            # Save normal points to replay buffer
            if len(self._replay_buffer) < 50:
                self._replay_buffer.append([p.model_copy() for p in observed_points])
            return observed_points, cyber_events

        atype = self.spec.attack_type
        target_comps = self.spec.target_components or ["Bus 4"]
        target_meas = self.spec.target_measurements or ["v_pu"]
        magnitude = self.spec.magnitude if self.spec.magnitude != 0.0 else -0.06 # default spoof -0.06 pu

        # 1. False Data Injection (FDI)
        if atype == AttackType.FALSE_DATA_INJECTION:
            for pt in observed_points:
                if any(tc in pt.component_id for tc in target_comps) and (pt.measurement_type in target_meas):
                    # Inject bias
                    pt.reported_value = round(pt.reported_value + magnitude, 5)
                    pt.provenance = Provenance.OBSERVED # Remains observed by receiver

            # Subtle SCADA authentication/audit log signature
            if step == self.spec.start_step:
                cyber_events.append(CyberEvent(
                    id=f"EVT_ATTACK_{step}_AUTH",
                    timestamp=sim_time_s,
                    wall_time="",
                    device_id=f"RTU_{target_comps[0].replace(' ', '')}",
                    event_type=CyberEventType.AUTH_FAILURE,
                    details=f"Unauthorized firmware telemetry calibration write on {target_comps[0]}",
                    severity="WARNING",
                    provenance=Provenance.OBSERVED
                ))

        # 2. Replay Attack
        elif atype == AttackType.REPLAY:
            if self._replay_buffer:
                historical_window = self._replay_buffer[step % len(self._replay_buffer)]
                # Replay values while sequence numbers become anomalous
                for i, pt in enumerate(observed_points):
                    if i < len(historical_window):
                        pt.reported_value = historical_window[i].reported_value
                        pt.quality = TelemetryQuality.STALE
                if step == self.spec.start_step:
                    cyber_events.append(CyberEvent(
                        id=f"EVT_ATTACK_{step}_REPLAY",
                        timestamp=sim_time_s,
                        wall_time="",
                        device_id="GATEWAY_SCADA",
                        event_type=CyberEventType.SEQUENCE_ANOMALY,
                        details="Repeated telemetry sequence IDs detected from Substation RTU",
                        severity="WARNING",
                        provenance=Provenance.OBSERVED
                    ))

        # 3. Denial of Service (DoS)
        elif atype == AttackType.DENIAL_OF_SERVICE:
            for pt in observed_points:
                if any(tc in pt.component_id for tc in target_comps):
                    pt.quality = TelemetryQuality.MISSING
                    pt.reported_value = 0.0
            if step == self.spec.start_step:
                cyber_events.append(CyberEvent(
                    id=f"EVT_ATTACK_{step}_DOS",
                    timestamp=sim_time_s,
                    wall_time="",
                    device_id="COMMS_ROUTER_01",
                    event_type=CyberEventType.PACKET_LOSS,
                    details="High packet loss / buffer exhaustion on telemetry channel",
                    severity="WARNING",
                    provenance=Provenance.OBSERVED
                ))

        return observed_points, cyber_events

    def apply_control_attack(self,
                             grid: DigitalTwinGrid,
                             step: int,
                             sim_time_s: float) -> List[CyberEvent]:
        """
        Applies Malicious Control Command attack directly to simulated physical grid.
        Generates simulated unauthorized command cyber log.
        """
        cyber_events: List[CyberEvent] = []
        if not self.is_active(step):
            return cyber_events

        if self.spec.attack_type == AttackType.MALICIOUS_CONTROL_COMMAND:
            # Force trip line or force tamper generator setpoint
            target_comp = self.spec.target_components[0] if self.spec.target_components else "Line 1"

            if "Line" in target_comp:
                line_idx = 0
                grid.net.line.loc[line_idx, "in_service"] = False
                if step == self.spec.start_step:
                    cyber_events.append(CyberEvent(
                        id=f"EVT_ATTACK_{step}_MAL_CMD",
                        timestamp=sim_time_s,
                        wall_time="",
                        device_id="BREAKER_CTRL_L01",
                        event_type=CyberEventType.COMMAND_ISSUED,
                        details="Unauthorized OPEN_BREAKER command executed from unverified IP",
                        severity="CRITICAL",
                        provenance=Provenance.OBSERVED
                    ))
            elif "Gen" in target_comp:
                gen_idx = 0
                grid.net.gen.loc[gen_idx, "vm_pu"] = 0.92 # Maliciously depress voltage
                if step == self.spec.start_step:
                    cyber_events.append(CyberEvent(
                        id=f"EVT_ATTACK_{step}_MAL_CMD",
                        timestamp=sim_time_s,
                        wall_time="",
                        device_id="GEN_AVR_02",
                        event_type=CyberEventType.COMMAND_ISSUED,
                        details="Unauthorized AVR setpoint override to 0.92 pu",
                        severity="CRITICAL",
                        provenance=Provenance.OBSERVED
                    ))

        return cyber_events
