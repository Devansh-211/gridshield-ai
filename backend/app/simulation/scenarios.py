"""
Physical Scenarios Engine (Section 5.5b).
Applies deterministic, physically sound disturbances to the IEEE 14-bus grid model.
All alterations act on the real physical pandapower net.
"""
import copy
import numpy as np
from typing import Dict, Any, Optional
from backend.app.schemas.contracts import ScenarioSpec, ScenarioType
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.simulation.indexing import bus_to_internal, parse_bus_label

class ScenarioManager:
    def __init__(self, spec: ScenarioSpec):
        self.spec = spec
        self._initial_load_p = {}
        self._initial_load_q = {}

    def apply_step_effects(self, grid: DigitalTwinGrid, step: int, sim_time_s: float):
        """
        Apply time-dependent scenario physics (load variation, outages, trips) to the grid.
        """
        net = grid.net

        # 1. Base Load Profile (smooth diurnal variation)
        # Load varies smoothly: +/- 5% over 600 steps
        diurnal_factor = 1.0 + 0.05 * np.sin(2 * np.pi * step / 300.0)
        
        # Save base load if first step
        if not self._initial_load_p:
            for idx in net.load.index:
                self._initial_load_p[idx] = float(net.load.p_mw.at[idx])
                self._initial_load_q[idx] = float(net.load.q_mvar.at[idx])

        # Apply diurnal scaling
        for idx in net.load.index:
            net.load.loc[idx, "p_mw"] = self._initial_load_p[idx] * diurnal_factor
            net.load.loc[idx, "q_mvar"] = self._initial_load_q[idx] * diurnal_factor

        # 2. Specific Scenario Physical Disturbance
        if step >= self.spec.start_step:
            stype = self.spec.scenario_type

            if stype == ScenarioType.LOAD_INCREASE:
                # Add large step load to target bus (default Bus 4)
                target_bus_ieee = 4
                if self.spec.target_component:
                    try:
                        target_bus_ieee = parse_bus_label(self.spec.target_component)
                    except Exception:
                        pass
                internal_b = bus_to_internal(target_bus_ieee)
                matching_loads = net.load[net.load.bus == internal_b].index
                delta_p = self.spec.parameter_value if self.spec.parameter_value > 0 else 35.0 # +35 MW
                for l_idx in matching_loads:
                    net.load.loc[l_idx, "p_mw"] = (self._initial_load_p[l_idx] * diurnal_factor) + delta_p
                    net.load.loc[l_idx, "q_mvar"] = (self._initial_load_q[l_idx] * diurnal_factor) + (delta_p * 0.3)

            elif stype == ScenarioType.LINE_FAILURE:
                # Trip line (default Line 1: from Bus 1 to Bus 2)
                line_idx = 0
                if self.spec.target_component:
                    try:
                        line_id = int(self.spec.target_component.replace("Line", "").strip().split("-")[0])
                        line_idx = max(0, min(len(net.line) - 1, line_id - 1))
                    except Exception:
                        pass
                net.line.loc[line_idx, "in_service"] = False

            elif stype == ScenarioType.GENERATOR_FAILURE:
                # Trip generator (default Gen 1 at Bus 2)
                gen_idx = 0
                net.gen.loc[gen_idx, "in_service"] = False
                net.gen.loc[gen_idx, "p_mw"] = 0.0

            elif stype == ScenarioType.VOLTAGE_INSTABILITY:
                # Add high reactive power load on Bus 14
                matching_loads = net.load[net.load.bus == bus_to_internal(14)].index
                for l_idx in matching_loads:
                    net.load.loc[l_idx, "q_mvar"] = self._initial_load_q[l_idx] + 45.0 # +45 MVAr reactive sink
