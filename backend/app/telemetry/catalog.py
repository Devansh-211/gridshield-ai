"""
GridShield AI — Telemetry Measurement Catalog & Packed Array Slicing.

Provides:
1. Static measurement catalog mapping (index <-> component_id, measurement_type, unit).
2. Packed array serialisation and deserialisation for storage efficiency (80+ values per step).
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

@dataclass(frozen=True)
class MeasurementDescriptor:
    index: int
    component_id: str
    component_type: str  # bus, line, gen, load, grid
    measurement_type: str  # v_pu, p_mw, q_mvar, loading_pct, freq_hz
    unit: str
    nominal_val: float

def build_ieee14_catalog() -> List[MeasurementDescriptor]:
    catalog = []
    idx = 0

    # 1. 14 Bus Voltages (v_pu)
    for b in range(1, 15):
        catalog.append(MeasurementDescriptor(
            index=idx,
            component_id=f"Bus {b}",
            component_type="bus",
            measurement_type="v_pu",
            unit="p.u.",
            nominal_val=1.0
        ))
        idx += 1

    # 2. 5 Generator Active Power (p_mw) & Reactive Power (q_mvar)
    for g in [1, 2, 3, 6, 8]:
        catalog.append(MeasurementDescriptor(
            index=idx,
            component_id=f"Gen {g}",
            component_type="gen",
            measurement_type="p_mw",
            unit="MW",
            nominal_val=40.0
        ))
        idx += 1
        catalog.append(MeasurementDescriptor(
            index=idx,
            component_id=f"Gen {g}",
            component_type="gen",
            measurement_type="q_mvar",
            unit="MVAr",
            nominal_val=10.0
        ))
        idx += 1

    # 3. 20 Transmission Lines Active Power (p_mw) & Loading (%)
    for l in range(1, 21):
        catalog.append(MeasurementDescriptor(
            index=idx,
            component_id=f"Line {l}",
            component_type="line",
            measurement_type="p_mw",
            unit="MW",
            nominal_val=20.0
        ))
        idx += 1
        catalog.append(MeasurementDescriptor(
            index=idx,
            component_id=f"Line {l}",
            component_type="line",
            measurement_type="loading_pct",
            unit="%",
            nominal_val=45.0
        ))
        idx += 1

    # 4. Grid Frequency (freq_hz) & Center of Inertia
    catalog.append(MeasurementDescriptor(
        index=idx,
        component_id="Grid",
        component_type="grid",
        measurement_type="freq_hz",
        unit="Hz",
        nominal_val=50.0
    ))
    idx += 1

    return catalog

IEEE14_MEASUREMENT_CATALOG = build_ieee14_catalog()
CATALOG_BY_INDEX: Dict[int, MeasurementDescriptor] = {m.index: m for m in IEEE14_MEASUREMENT_CATALOG}
CATALOG_BY_COMP_TYPE: Dict[Tuple[str, str], int] = {
    (m.component_id, m.measurement_type): m.index for m in IEEE14_MEASUREMENT_CATALOG
}

def pack_telemetry_dict(data_dict: Dict[str, float]) -> List[float]:
    """Packs a dictionary of measurements into a ordered list aligned with the catalog."""
    packed = [0.0] * len(IEEE14_MEASUREMENT_CATALOG)
    for (comp_id, m_type), idx in CATALOG_BY_COMP_TYPE.items():
        key = f"{comp_id}:{m_type}"
        if key in data_dict:
            packed[idx] = round(data_dict[key], 5)
        elif comp_id in data_dict:
            packed[idx] = round(data_dict[comp_id], 5)
    return packed

def unpack_telemetry_list(packed_list: List[float]) -> Dict[str, float]:
    """Unpacks a list of measurements into a keyed dictionary."""
    unpacked = {}
    for idx, val in enumerate(packed_list):
        if idx in CATALOG_BY_INDEX:
            desc = CATALOG_BY_INDEX[idx]
            unpacked[f"{desc.component_id}:{desc.measurement_type}"] = val
    return unpacked
