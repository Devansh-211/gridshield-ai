"""
Digital Twin Grid Simulation Module (Section 5.1).
Initializes IEEE 14-bus system using pandapower, defines 2D schematic coordinates,
and runs Newton-Raphson AC power flow calculations.
"""
import copy
from typing import Dict, Any, List, Optional
import pandapower as pp
import pandapower.networks as pn
from backend.app.schemas.contracts import (
    GridTopology, BusTopology, LineTopology, GeneratorTopology,
    LoadTopology, GridState, BusState, LineState, Provenance
)
from backend.app.simulation.indexing import bus_to_ieee, bus_to_internal, bus_label, line_label

# Hand-defined schematic coordinates (0 to 800 x 0 to 600 box) for crisp SOC rendering
IEEE_14_SCHEMATIC_COORDS = {
    1: {"x": 100.0, "y": 120.0, "type": "SLACK"},
    2: {"x": 280.0, "y": 120.0, "type": "PV"},
    3: {"x": 100.0, "y": 300.0, "type": "PV"},
    4: {"x": 280.0, "y": 300.0, "type": "PQ"},
    5: {"x": 190.0, "y": 210.0, "type": "PQ"},
    6: {"x": 460.0, "y": 200.0, "type": "PV"},
    7: {"x": 370.0, "y": 360.0, "type": "PQ"},
    8: {"x": 460.0, "y": 360.0, "type": "PV"},
    9: {"x": 370.0, "y": 480.0, "type": "PQ"},
    10: {"x": 460.0, "y": 480.0, "type": "PQ"},
    11: {"x": 560.0, "y": 360.0, "type": "PQ"},
    12: {"x": 660.0, "y": 200.0, "type": "PQ"},
    13: {"x": 660.0, "y": 320.0, "type": "PQ"},
    14: {"x": 560.0, "y": 480.0, "type": "PQ"},
}

class DigitalTwinGrid:
    """
    IEEE 14-bus Digital Twin power grid physics simulator.
    """
    def __init__(self):
        self._base_net = pn.case14()
        self.net = copy.deepcopy(self._base_net)
        self.reset()

    def reset(self):
        """Reset grid to baseline nominal configuration."""
        self.net = copy.deepcopy(self._base_net)
        # Ensure standard in-service flags
        self.net.bus["in_service"] = True
        self.net.line["in_service"] = True
        self.net.gen["in_service"] = True
        self.net.load["in_service"] = True

    def get_topology(self) -> GridTopology:
        """Export system topology with 1-based IEEE labeling and schematic coordinates."""
        buses = []
        for b_idx in self.net.bus.index:
            ieee_id = bus_to_ieee(int(b_idx))
            coords = IEEE_14_SCHEMATIC_COORDS.get(ieee_id, {"x": 100.0, "y": 100.0, "type": "PQ"})
            buses.append(BusTopology(
                id=ieee_id,
                name=bus_label(ieee_id),
                vn_kv=float(self.net.bus.vn_kv.at[b_idx]),
                x=coords["x"],
                y=coords["y"],
                bus_type=coords["type"]
            ))

        lines = []
        for l_idx in self.net.line.index:
            from_b = bus_to_ieee(int(self.net.line.from_bus.at[l_idx]))
            to_b = bus_to_ieee(int(self.net.line.to_bus.at[l_idx]))
            lines.append(LineTopology(
                id=int(l_idx) + 1,
                name=line_label(from_b, to_b),
                from_bus=from_b,
                to_bus=to_b,
                length_km=float(self.net.line.length_km.at[l_idx]),
                max_i_ka=float(self.net.line.max_i_ka.at[l_idx]),
                in_service=bool(self.net.line.in_service.at[l_idx])
            ))

        generators = []
        # Include slack ext_grid as Gen 1
        for eg_idx in self.net.ext_grid.index:
            eg_bus = bus_to_ieee(int(self.net.ext_grid.bus.at[eg_idx]))
            generators.append(GeneratorTopology(
                id=1,
                name=f"Slack Gen {eg_bus}",
                bus=eg_bus,
                p_mw=float(self.net.ext_grid.vm_pu.at[eg_idx] * 100.0), # placeholder base
                vm_pu=float(self.net.ext_grid.vm_pu.at[eg_idx]),
                sn_mva=100.0,
                in_service=bool(self.net.ext_grid.in_service.at[eg_idx])
            ))
        for g_idx in self.net.gen.index:
            g_bus = bus_to_ieee(int(self.net.gen.bus.at[g_idx]))
            generators.append(GeneratorTopology(
                id=int(g_idx) + 2,
                name=f"Gen {g_bus}",
                bus=g_bus,
                p_mw=float(self.net.gen.p_mw.at[g_idx]),
                vm_pu=float(self.net.gen.vm_pu.at[g_idx]),
                sn_mva=float(self.net.gen.sn_mva.at[g_idx]),
                in_service=bool(self.net.gen.in_service.at[g_idx])
            ))

        loads = []
        for ld_idx in self.net.load.index:
            ld_bus = bus_to_ieee(int(self.net.load.bus.at[ld_idx]))
            loads.append(LoadTopology(
                id=int(ld_idx) + 1,
                name=f"Load {ld_bus}",
                bus=ld_bus,
                p_mw=float(self.net.load.p_mw.at[ld_idx]),
                q_mvar=float(self.net.load.q_mvar.at[ld_idx]),
                in_service=bool(self.net.load.in_service.at[ld_idx])
            ))

        return GridTopology(
            system_name="IEEE 14-bus Digital Twin",
            buses=buses,
            lines=lines,
            generators=generators,
            loads=loads,
            provenance=Provenance.SIMULATED
        )

    def solve_power_flow(self) -> bool:
        """Run AC Newton-Raphson power flow on the current network."""
        try:
            pp.runpp(self.net, algorithm="nr", numba=False, enforce_q_lims=True)
            return bool(self.net.converged)
        except Exception:
            return False

    def get_state(self, step: int = 0, sim_time_s: float = 0.0, frequency_hz: float = 60.0) -> GridState:
        """Compute and extract complete physical ground truth state."""
        converged = self.solve_power_flow()
        buses_state = []
        lines_state = []

        if converged:
            for b_idx in self.net.bus.index:
                ieee_id = bus_to_ieee(int(b_idx))
                vm_pu = float(self.net.res_bus.vm_pu.at[b_idx])
                va_deg = float(self.net.res_bus.va_degree.at[b_idx])
                p_mw = float(self.net.res_bus.p_mw.at[b_idx])
                q_mvar = float(self.net.res_bus.q_mvar.at[b_idx])
                status = "NORMAL"
                if vm_pu < 0.95 or vm_pu > 1.05:
                    status = "VOLTAGE_VIOLATION"
                buses_state.append(BusState(
                    bus_id=ieee_id,
                    vm_pu=vm_pu,
                    va_degree=va_deg,
                    p_mw=p_mw,
                    q_mvar=q_mvar,
                    status=status
                ))

            for l_idx in self.net.line.index:
                loading = float(self.net.res_line.loading_percent.at[l_idx])
                p_from = float(self.net.res_line.p_from_mw.at[l_idx])
                q_from = float(self.net.res_line.q_from_mvar.at[l_idx])
                p_to = float(self.net.res_line.p_to_mw.at[l_idx])
                q_to = float(self.net.res_line.q_to_mvar.at[l_idx])
                in_srv = bool(self.net.line.in_service.at[l_idx])
                lines_state.append(LineState(
                    line_id=int(l_idx) + 1,
                    loading_pct=loading if in_srv else 0.0,
                    p_from_mw=p_from if in_srv else 0.0,
                    q_from_mvar=q_from if in_srv else 0.0,
                    p_to_mw=p_to if in_srv else 0.0,
                    q_to_mvar=q_to if in_srv else 0.0,
                    in_service=in_srv
                ))
        else:
            # Degraded state if non-converged
            for b_idx in self.net.bus.index:
                ieee_id = bus_to_ieee(int(b_idx))
                buses_state.append(BusState(
                    bus_id=ieee_id, vm_pu=0.0, va_degree=0.0, p_mw=0.0, q_mvar=0.0, status="DIVERGED"
                ))
            for l_idx in self.net.line.index:
                lines_state.append(LineState(
                    line_id=int(l_idx) + 1, loading_pct=0.0, p_from_mw=0.0, q_from_mvar=0.0, p_to_mw=0.0, q_to_mvar=0.0, in_service=False
                ))

        return GridState(
            step=step,
            sim_time_s=sim_time_s,
            converged=converged,
            buses=buses_state,
            lines=lines_state,
            frequency_hz=frequency_hz,
            frequency_provenance=Provenance.SIMULATED,
            provenance=Provenance.SIMULATED
        )
