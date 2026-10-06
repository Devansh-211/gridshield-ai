"""
GridShield AI — Supervisor Whitelist Projections & Narrative Schemas.

Rule R12 & R13:
1. Strict server-side whitelist schema containing ZERO engineering jargon or raw matrices.
2. Preserves environment label, provenance of every number, and honest uncertainty.
3. Plain language translation is a faithful translation of the Evidence Object, never a reduction.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class PlainConfidenceSummary(BaseModel):
    plain_confidence_summary: str = Field(..., description="E.g. High certainty (92%). Based on cross-checked physics.")
    completeness_text: str = Field(..., description="E.g. 100% of substation sensors responding.")
    agreement_text: str = Field(..., description="E.g. Multiple independent detectors agree on this pattern.")
    stability_text: str = Field(..., description="E.g. Reading has remained steady for the last 3 checks.")
    sensor_evidence_count: int = Field(..., description="Number of sensor feeds examined.")


class PlainDiscussionOption(BaseModel):
    option_id: str
    option_title: str
    plain_action_summary: str
    expected_outcome: str
    why_discuss_first: str
    not_guaranteed_safe_notice: str = "This option should be evaluated with a certified grid technician before execution. Actions carry trade-offs."


class AffectedSubstationPlain(BaseModel):
    substation_id: int
    friendly_name: str
    role: str
    plain_status: str  # "Operating normally", "Experiencing low pressure/strain", "Suspect sensor feed"


class SupervisorIncidentProjection(BaseModel):
    incident_id: str
    environment_label: Literal["PRACTICE_SIMULATION", "HISTORICAL_REPLAY", "LIVE_SYSTEM"] = "PRACTICE_SIMULATION"
    environment_badge_text: str = "PRACTICE SIMULATION — Not real grid data"
    status_summary: str
    severity_level: Literal["NORMAL", "WORTH_WATCHING", "NEEDS_ATTENTION", "URGENT"]
    what_is_happening: str
    how_sure_we_are: PlainConfidenceSummary
    what_it_could_lead_to: str
    options_to_discuss_with_technician: List[PlainDiscussionOption]
    affected_substations: List[AffectedSubstationPlain]
    provenance_summary: str
    narrative_version: str = "v1.0.0"


class SubstationTopologyPlain(BaseModel):
    substation_id: int
    friendly_name: str
    substation_role: str
    plain_description: str
    coordinates: List[float]
    connected_corridor_ids: List[int]


class CorridorTopologyPlain(BaseModel):
    corridor_id: int
    from_substation_name: str
    to_substation_name: str
    capacity_tier: str  # "Main Arterial Line", "Regional Feeder Line", "Local Tie Line"


class SupervisorGridTopologyProjection(BaseModel):
    environment_label: str = "PRACTICE_SIMULATION"
    environment_badge_text: str = "PRACTICE SIMULATION — Educational Digital Twin"
    substations: List[SubstationTopologyPlain]
    corridors: List[CorridorTopologyPlain]
    plain_legend: dict


class SubstationReadingPlain(BaseModel):
    substation_id: int
    friendly_name: str
    status: Literal["NORMAL", "ELEVATED_STRAIN", "SUSPECT_SENSOR", "DEVIATION"]
    strain_level: Literal["LOW", "MEDIUM", "HIGH"]
    plain_reading: str
    provenance_text: Literal["Direct Measurement", "Cross-Checked Estimate", "Data Unavailable"]


class SupervisorGridStateProjection(BaseModel):
    step: int
    environment_label: str = "PRACTICE_SIMULATION"
    environment_badge_text: str = "PRACTICE SIMULATION — Educational Digital Twin"
    system_health_status: Literal["NORMAL", "UNDER_OBSERVATION", "ATTENTION_REQUIRED", "CRITICAL"]
    plain_frequency_summary: str
    equipment_strain_summary: str
    active_incident_count: int
    substation_readings: List[SubstationReadingPlain]
