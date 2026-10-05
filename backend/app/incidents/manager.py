"""
Incident Lifecycle Manager (Section 10).
Manages incident creation, deduplication across continuous anomaly episodes,
state transitions, and audit event logs.
"""
import uuid
import datetime
from typing import Dict, Any, List, Optional, Tuple
from backend.app.schemas.contracts import (
    Incident, IncidentStatus, TimelineEvent, DetectionResult,
    Attribution, CertaintyBand, RiskAssessment, EvidenceItem,
    ClassificationClass, Provenance
)

class IncidentManager:
    def __init__(self):
        self.incidents: Dict[str, Incident] = {}
        self.events: List[TimelineEvent] = []
        self._incident_counter = 0
        self._active_incident_id: Optional[str] = None
        self._normal_consecutive_steps = 0

    def process_step(self,
                     run_id: str,
                     step: int,
                     sim_time_s: float,
                     detection: DetectionResult,
                     attribution: Attribution,
                     certainty: CertaintyBand,
                     risk: RiskAssessment) -> Tuple[Optional[Incident], List[TimelineEvent]]:
        """
        Evaluate step outputs. Create or update incident if an anomaly is active.
        Deduplicates continuous episodes with debounce hysteresis.
        """
        step_events: List[TimelineEvent] = []
        incident: Optional[Incident] = None

        wall_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        is_anomaly = bool(detection.overall_anomaly_flag or (detection.l3.predicted_class not in [ClassificationClass.NORMAL, ClassificationClass.UNKNOWN]))

        if is_anomaly:
            self._normal_consecutive_steps = 0
            if not self._active_incident_id:
                # Create new incident
                self._incident_counter += 1
                inc_id = f"GS-{self._incident_counter:04d}"
                self._active_incident_id = inc_id

                affected_comps = []
                for ev in attribution.supporting_evidence:
                    for b in range(1, 15):
                        if f"Bus {b}" in ev.description or f"Bus {b}" in ev.metric_name:
                            affected_comps.append(f"Bus {b}")
                if not affected_comps:
                    affected_comps = ["Bus 4"]

                incident = Incident(
                    incident_id=inc_id,
                    run_id=run_id,
                    scenario_ref=f"Scenario Step {step}",
                    created_at_step=step,
                    created_at_wall=wall_time,
                    status=IncidentStatus.DETECTED,
                    affected_components=list(set(affected_comps)),
                    classification=detection.l3.predicted_class,
                    attribution=attribution,
                    certainty=certainty,
                    risk=risk,
                    evidence=attribution.supporting_evidence,
                    model_version=detection.l3.model_version,
                    provenance=Provenance.CALCULATED
                )
                self.incidents[inc_id] = incident

                # Emit timeline events
                evt1 = TimelineEvent(
                    id=f"EVT_{run_id}_{step}_DETECT",
                    run_id=run_id,
                    incident_id=inc_id,
                    sim_time=sim_time_s,
                    wall_time=wall_time,
                    event_type="ANOMALY_DETECTED",
                    title=f"Incident {inc_id} Flagged ({detection.l3.predicted_class.value})",
                    description=f"Multi-layer detector flagged anomaly with {certainty.value} certainty. Risk score: {risk.overall_risk_score}/100.",
                    payload={"classification": detection.l3.predicted_class.value, "risk": risk.overall_risk_score},
                    provenance=Provenance.OBSERVED
                )
                self.events.append(evt1)
                step_events.append(evt1)

            else:
                # Update existing active incident with fresh telemetry & risk metrics
                inc_id = self._active_incident_id
                incident = self.incidents[inc_id]
                incident.risk = risk
                incident.attribution = attribution
                incident.certainty = certainty
                if incident.status == IncidentStatus.DETECTED:
                    incident.status = IncidentStatus.INVESTIGATING

        else:
            # Step is normal
            self._normal_consecutive_steps += 1
            if self._active_incident_id and self._normal_consecutive_steps >= 2:
                # Resolve incident after 2 consecutive normal steps
                inc_id = self._active_incident_id
                self.incidents[inc_id].status = IncidentStatus.RESOLVED
                evt_res = TimelineEvent(
                    id=f"EVT_{run_id}_{step}_RESOLVE",
                    run_id=run_id,
                    incident_id=inc_id,
                    sim_time=sim_time_s,
                    wall_time=wall_time,
                    event_type="INCIDENT_RESOLVED",
                    title=f"Incident {inc_id} Operating Conditions Normalized",
                    description="Electrical states returned to nominal operating bounds.",
                    payload={"status": "RESOLVED"},
                    provenance=Provenance.OBSERVED
                )
                self.events.append(evt_res)
                step_events.append(evt_res)
                self._active_incident_id = None

        return incident, step_events

    def get_all_incidents(self) -> List[Incident]:
        return list(self.incidents.values())

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    def reset(self):
        self.incidents.clear()
        self.events.clear()
        self._incident_counter = 0
        self._active_incident_id = None
        self._normal_consecutive_steps = 0
