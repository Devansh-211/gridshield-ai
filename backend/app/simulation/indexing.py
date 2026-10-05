"""
Explicit IEEE Indexing Mapping Module (Section 5.1).
Converts between IEEE 1-based labels (UI, documentation, APIs: "Bus 1", "Line 1-2")
and engine 0-based pandapower indices.
"""
from typing import Tuple, Optional

def bus_to_internal(ieee_bus_id: int) -> int:
    """Map 1-based IEEE bus ID (1..14) to 0-based internal index (0..13)."""
    if ieee_bus_id < 1 or ieee_bus_id > 14:
        raise ValueError(f"Invalid IEEE 14-bus ID: {ieee_bus_id}. Must be between 1 and 14.")
    return ieee_bus_id - 1

def bus_to_ieee(internal_idx: int) -> int:
    """Map 0-based internal index (0..13) to 1-based IEEE bus ID (1..14)."""
    if internal_idx < 0 or internal_idx > 13:
        raise ValueError(f"Invalid internal bus index: {internal_idx}. Must be between 0 and 13.")
    return internal_idx + 1

def bus_label(ieee_bus_id: int) -> str:
    """Format standard user-facing label, e.g. 'Bus 4'."""
    return f"Bus {ieee_bus_id}"

def parse_bus_label(label: str) -> int:
    """Parse 'Bus 4' or '4' to 1-based IEEE bus ID."""
    cleaned = label.strip().replace("Bus", "").strip()
    return int(cleaned)

def line_label(from_bus_ieee: int, to_bus_ieee: int) -> str:
    """Format standard line label, e.g. 'Line 1-2'."""
    return f"Line {from_bus_ieee}-{to_bus_ieee}"
