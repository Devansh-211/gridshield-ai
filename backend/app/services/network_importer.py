"""
GridShield AI — Network Importer & Validation Report Service (Usability Floor & Rule R6).

Supports importing custom electrical grid networks from:
1. MATPOWER (.m) files
2. pandapower (.json) network files

Generates comprehensive automated validation report:
- System topology counts & voltage levels
- Power flow convergence verification
- Unsupplied bus / islanding detection
- Grid schematic auto-layout generation
- Compatibility gate validation (Rule R6)
"""
import os
import json
import tempfile
from typing import Dict, Any, Optional, Tuple, List
import pandapower as pp
import pandapower.converter as pc
import pandapower.topology as top

from backend.app.schemas.envelope import NonAnswerState, EnvironmentLabel
from backend.app.core.compatibility_gate import CompatibilityGate

class NetworkImporter:
    """
    Service for parsing, validating, and layout-generating custom grid networks.
    """
    def __init__(self, compatibility_gate: Optional[CompatibilityGate] = None):
        self.gate = compatibility_gate or CompatibilityGate()

    def import_network_from_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Import grid network from file bytes (.m or .json) and generate validation report.
        """
        suffix = os.path.splitext(filename)[1].lower()
        
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            if suffix == ".m":
                net = pc.from_mpc(tmp_path, f_hz=60.0)
                format_type = "MATPOWER_M"
            elif suffix == ".json":
                net = pp.from_json(tmp_path)
                format_type = "PANDAPOWER_JSON"
            else:
                raise ValueError(f"Unsupported network file format '{suffix}'. Must be .m (MATPOWER) or .json (pandapower).")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        return self.validate_and_format(net, system_name=os.path.splitext(filename)[0], format_type=format_type)

    def validate_and_format(
        self,
        net: pp.pandapowerNet,
        system_name: str = "Custom Network",
        format_type: str = "PANDAPOWER"
    ) -> Dict[str, Any]:
        """
        Validate network and generate detailed validation report & auto-layout coordinates.
        """
        bus_count = len(net.bus)
        line_count = len(net.line)
        gen_count = len(net.gen) + len(net.ext_grid)
        load_count = len(net.load)
        trafo_count = len(net.trafo)

        voltage_levels_kv = sorted(list(set(float(v) for v in net.bus.vn_kv.values)))

        # Power flow convergence check
        converged = False
        pf_error = None
        try:
            pp.runpp(net, algorithm="nr", numba=False, enforce_q_lims=True)
            converged = bool(net.converged)
        except Exception as e:
            pf_error = str(e)

        # Islanding / unsupplied buses check
        unsupplied_buses = []
        try:
            unsupplied_buses = list(top.unsupplied_buses(net))
        except Exception:
            pass

        # Compatibility gate evaluation (Rule R6)
        is_supported, non_answer = self.gate.check_topology_supported("model-v1.0", system_name)

        # Coordinate layout resolution
        coordinates = self._generate_layout(net)

        # Build validation report
        validation_report = {
            "system_name": system_name,
            "format_type": format_type,
            "valid": converged and len(unsupplied_buses) == 0,
            "power_flow_converged": converged,
            "power_flow_error": pf_error,
            "bus_count": bus_count,
            "line_count": line_count,
            "generator_count": gen_count,
            "load_count": load_count,
            "transformer_count": trafo_count,
            "voltage_levels_kv": voltage_levels_kv,
            "unsupplied_buses_count": len(unsupplied_buses),
            "unsupplied_buses": [int(b) for b in unsupplied_buses],
            "compatibility_gate": {
                "supported": is_supported,
                "non_answer_state": non_answer.value if non_answer else None
            },
            "warnings": []
        }

        if not converged:
            validation_report["warnings"].append("Baseline AC power flow failed to converge.")
        if len(unsupplied_buses) > 0:
            validation_report["warnings"].append(f"Network contains {len(unsupplied_buses)} unsupplied/isolated buses.")
        if not is_supported:
            validation_report["warnings"].append(
                f"Rule R6 Notice: Topology '{system_name}' is not in validated registry models. "
                f"Attribution and mitigation recommendations will emit '{NonAnswerState.TOPOLOGY_UNSUPPORTED.value}'."
            )

        return {
            "network_meta": validation_report,
            "layout_coordinates": coordinates,
            "net": net
        }

    def _generate_layout(self, net: pp.pandapowerNet) -> Dict[int, Dict[str, Any]]:
        """
        Generate (x, y) 2D schematic coordinates for buses. Uses bus_geocoord if available,
        otherwise computes algorithmic spring layout.
        """
        coords = {}
        has_geo = hasattr(net, "bus_geocoord") and len(net.bus_geocoord) > 0

        if has_geo:
            min_x = float(net.bus_geocoord.x.min())
            max_x = float(net.bus_geocoord.x.max())
            min_y = float(net.bus_geocoord.y.min())
            max_y = float(net.bus_geocoord.y.max())
            dx = max(max_x - min_x, 1e-3)
            dy = max(max_y - min_y, 1e-3)

            for b_idx in net.bus.index:
                if b_idx in net.bus_geocoord.index:
                    raw_x = float(net.bus_geocoord.x.at[b_idx])
                    raw_y = float(net.bus_geocoord.y.at[b_idx])
                    norm_x = 100.0 + (raw_x - min_x) / dx * 600.0
                    norm_y = 100.0 + (raw_y - min_y) / dy * 400.0
                    coords[int(b_idx)] = {"x": round(norm_x, 1), "y": round(norm_y, 1), "type": "PQ"}
                else:
                    coords[int(b_idx)] = {"x": 100.0, "y": 100.0, "type": "PQ"}
        else:
            # Simple grid layout fallback
            import math
            n = len(net.bus)
            cols = math.ceil(math.sqrt(n))
            for idx, b_idx in enumerate(net.bus.index):
                col = idx % cols
                row = idx // cols
                x = 120.0 + col * (600.0 / max(cols - 1, 1))
                y = 120.0 + row * (400.0 / max(math.ceil(n / cols) - 1, 1))
                coords[int(b_idx)] = {"x": round(x, 1), "y": round(y, 1), "type": "PQ"}

        # Label bus types (Slack/PV/PQ)
        if len(net.ext_grid) > 0:
            for eg_b in net.ext_grid.bus.values:
                if int(eg_b) in coords:
                    coords[int(eg_b)]["type"] = "SLACK"
        if len(net.gen) > 0:
            for g_b in net.gen.bus.values:
                if int(g_b) in coords and coords[int(g_b)]["type"] != "SLACK":
                    coords[int(g_b)]["type"] = "PV"

        return coords
