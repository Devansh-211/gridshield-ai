"""
Closed-Loop SCADA Supervisory Controller (Section 5.5).
Reads estimated/observed telemetry and applies corrective actuation on true grid assets
(Generator voltage setpoints and reactive power injection).
Creates genuine cyber-physical coupling: False Data Injection spoofing low voltage
causes the supervisory controller to over-excite generators, physically elevating grid voltages.
"""
from typing import Dict, Any, List, Optional
from backend.app.schemas.contracts import ObservedTelemetryPoint, CyberEvent, CyberEventType, Provenance
from backend.app.simulation.grid import DigitalTwinGrid

class SupervisorySCADAController:
    """
    Automated voltage & reactive power regulator (AVR / SCADA closed-loop).
    Supports stateless hydration from session checkpoints.
    """
    def __init__(self,
                 target_bus_ieee: int = 4,
                 controlled_gen_id: int = 2,
                 voltage_deadband_low: float = 0.98,
                 voltage_deadband_high: float = 1.04,
                 step_change: float = 0.015):
        self.target_bus_ieee = target_bus_ieee
        self.controlled_gen_id = controlled_gen_id  # Gen at Bus 2 (case14 index 0)
        self.v_low = voltage_deadband_low
        self.v_high = voltage_deadband_high
        self.step_change = step_change
        self.base_gen_vm_pu = 1.045
        self.current_gen_vm_pu = 1.045
        self.actions_log: List[str] = []

    def reset(self):
        self.current_gen_vm_pu = self.base_gen_vm_pu
        self.actions_log.clear()

    def get_state(self) -> Dict[str, Any]:
        """Serializes controller state for database checkpointing."""
        return {
            "target_bus_ieee": self.target_bus_ieee,
            "controlled_gen_id": self.controlled_gen_id,
            "current_gen_vm_pu": round(self.current_gen_vm_pu, 4),
            "actions_log": self.actions_log[-10:]
        }

    def set_state(self, state: Dict[str, Any], grid: Optional[DigitalTwinGrid] = None):
        """Hydrates controller state from database checkpoint."""
        if not state:
            return
        self.current_gen_vm_pu = state.get("current_gen_vm_pu", self.base_gen_vm_pu)
        self.actions_log = state.get("actions_log", [])
        if grid and len(grid.net.gen) > 0:
            grid.net.gen.loc[0, "vm_pu"] = self.current_gen_vm_pu

    def step(self,
             observed_telemetry: List[ObservedTelemetryPoint],
             grid: DigitalTwinGrid,
             sim_time_s: float) -> Optional[CyberEvent]:
        """
        Evaluate observed telemetry for target bus. If voltage estimate deviates beyond deadband,
        issue a corrective generator setpoint command to the true grid physics.
        """
        # 1. Read observed voltage for target bus
        target_v_obs = None
        for pt in observed_telemetry:
            if pt.component_id == f"Bus {self.target_bus_ieee}" and pt.measurement_type == "v_pu":
                target_v_obs = pt.reported_value
                break

        if target_v_obs is None:
            return None

        event: Optional[CyberEvent] = None

        # 2. Control Logic with Deadband and Anti-Windup Rate Limits
        if target_v_obs < self.v_low:
            # Sensed under-voltage: Raise generator voltage setpoint to boost grid voltage
            new_vm = min(1.10, round(self.current_gen_vm_pu + self.step_change, 4))
            if new_vm != self.current_gen_vm_pu:
                self.current_gen_vm_pu = new_vm
                # Apply to pandapower net
                if len(grid.net.gen) > 0:
                    grid.net.gen.loc[0, "vm_pu"] = self.current_gen_vm_pu
                action_msg = f"SCADA AVR: Voltage at Bus {self.target_bus_ieee} sensed low ({target_v_obs:.3f} pu). Boosted Gen 2 setpoint to {self.current_gen_vm_pu:.3f} pu."
                self.actions_log.append(action_msg)
                event = CyberEvent(
                    id=f"EVT_CTRL_{int(sim_time_s)}",
                    timestamp=sim_time_s,
                    wall_time="",
                    device_id="SCADA_MASTER",
                    event_type=CyberEventType.COMMAND_ISSUED,
                    details=action_msg,
                    severity="INFO",
                    provenance=Provenance.OBSERVED
                )

        elif target_v_obs > self.v_high:
            # Sensed over-voltage: Lower generator setpoint
            new_vm = max(0.95, round(self.current_gen_vm_pu - self.step_change, 4))
            if new_vm != self.current_gen_vm_pu:
                self.current_gen_vm_pu = new_vm
                if len(grid.net.gen) > 0:
                    grid.net.gen.loc[0, "vm_pu"] = self.current_gen_vm_pu
                action_msg = f"SCADA AVR: Voltage at Bus {self.target_bus_ieee} sensed high ({target_v_obs:.3f} pu). Reduced Gen 2 setpoint to {self.current_gen_vm_pu:.3f} pu."
                self.actions_log.append(action_msg)
                event = CyberEvent(
                    id=f"EVT_CTRL_{int(sim_time_s)}",
                    timestamp=sim_time_s,
                    wall_time="",
                    device_id="SCADA_MASTER",
                    event_type=CyberEventType.COMMAND_ISSUED,
                    details=action_msg,
                    severity="INFO",
                    provenance=Provenance.OBSERVED
                )

        return event
