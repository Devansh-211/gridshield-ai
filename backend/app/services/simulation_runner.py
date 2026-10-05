"""
Simulation Runner Service.
Coordinates the Digital Twin Grid, Physical Scenarios, Frequency Model,
Telemetry Generation, and Closed-Loop SCADA Supervisory Controller.
"""
import uuid
from typing import List, Dict, Any, Tuple
from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, GridState, ObservedTelemetryPoint,
    GroundTruthPoint, CyberEvent, TimelineEvent, Provenance
)
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.simulation.frequency import FrequencyCOIModel
from backend.app.simulation.scenarios import ScenarioManager
from backend.app.telemetry.generator import TelemetryGenerator
from backend.app.telemetry.cyber_events import CyberEventGenerator
from backend.app.attacks.engine import AttackEngine
from backend.app.control.supervisory import SupervisorySCADAController
from backend.app.core.rng import get_rng

class SimulationRunner:
    def __init__(self, spec: ScenarioSpec):
        self.spec = spec
        self.run_id = f"RUN_{uuid.uuid4().hex[:8].upper()}"
        self.rng = get_rng(spec.seed)
        self.grid = DigitalTwinGrid()
        self.frequency_model = FrequencyCOIModel()
        self.scenario_manager = ScenarioManager(spec)
        self.attack_engine = AttackEngine(spec.attack, self.rng)
        self.telemetry_generator = TelemetryGenerator(self.rng)
        self.cyber_generator = CyberEventGenerator(self.rng)
        self.scada_controller = SupervisorySCADAController()

    def run_all(self) -> Dict[str, Any]:
        """
        Execute full simulation run step-by-step and return all snapshots and events.
        """
        states: List[GridState] = []
        observed_stream: List[List[ObservedTelemetryPoint]] = []
        ground_truth_stream: List[List[GroundTruthPoint]] = []
        events: List[TimelineEvent] = []

        total_steps = self.spec.total_steps

        # Record run start event
        events.append(TimelineEvent(
            id=f"EVT_{self.run_id}_0",
            run_id=self.run_id,
            sim_time=0.0,
            wall_time="",
            event_type="SIMULATION_STARTED",
            title="Simulation Initialized",
            description=f"Scenario: {self.spec.scenario_type.value}, Seed: {self.spec.seed}, Steps: {total_steps}",
            payload={"scenario": self.spec.model_dump()},
            provenance=Provenance.SIMULATED
        ))

        cyber_event_stream: List[List[CyberEvent]] = []

        for step in range(total_steps):
            sim_time_s = float(step)

            # 1. Apply Malicious Control Command attacks (acts on physical grid)
            cmd_cyber_evts = self.attack_engine.apply_control_attack(self.grid, step, sim_time_s)

            # 2. Apply scenario physics (load changes, natural faults)
            self.scenario_manager.apply_step_effects(self.grid, step, sim_time_s)

            # 3. Solve power flow to get current actual generation & load
            converged = self.grid.solve_power_flow()
            if converged and hasattr(self.grid.net, "res_gen") and len(self.grid.net.res_gen) > 0:
                p_gen_mw = float(self.grid.net.res_gen.p_mw.sum() + self.grid.net.res_ext_grid.p_mw.sum())
                p_load_mw = float(self.grid.net.load[self.grid.net.load.in_service].p_mw.sum())
            else:
                p_gen_mw = 259.0
                p_load_mw = 259.0

            # 4. Update Frequency COI model
            f_hz = self.frequency_model.step(p_gen_mw, p_load_mw)

            # 5. Extract physical ground truth state
            state = self.grid.get_state(step=step, sim_time_s=sim_time_s, frequency_hz=f_hz)
            states.append(state)

            # 6. Generate telemetry (with noise) and ground-truth points
            obs_points, gt_points = self.telemetry_generator.generate(state)

            # 7. Apply Telemetry Attacks (FDI, Replay, DoS) to observed stream
            obs_points, tel_cyber_evts = self.attack_engine.apply_telemetry_attack(obs_points, step, sim_time_s)

            # 8. Generate benign background cyber events and combine
            benign_evts = self.cyber_generator.generate_benign_events(step, sim_time_s)
            step_cyber_events = cmd_cyber_evts + tel_cyber_evts + benign_evts
            cyber_event_stream.append(step_cyber_events)

            # 9. Closed-loop SCADA supervisory control step
            ctrl_event = self.scada_controller.step(obs_points, self.grid, sim_time_s)
            if ctrl_event:
                events.append(TimelineEvent(
                    id=f"EVT_{self.run_id}_{step}_CTRL",
                    run_id=self.run_id,
                    sim_time=sim_time_s,
                    wall_time=ctrl_event.wall_time,
                    event_type="SCADA_CONTROL_ACTION",
                    title="SCADA AVR Setpoint Adjusted",
                    description=ctrl_event.details,
                    payload={"device_id": ctrl_event.device_id},
                    provenance=Provenance.OBSERVED
                ))

            observed_stream.append(obs_points)
            ground_truth_stream.append(gt_points)

        return {
            "run_id": self.run_id,
            "scenario": self.spec,
            "states": states,
            "observed_stream": observed_stream,
            "ground_truth_stream": ground_truth_stream,
            "cyber_event_stream": cyber_event_stream,
            "events": events
        }
