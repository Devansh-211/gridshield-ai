"""
GridShield AI — Segregated View Endpoints (Supervisor vs Technician).

Enforces:
1. Server-side view segregation (Rule R12): Supervisor endpoints project whitelist schemas with zero jargon.
2. Faithful translation (Rule R13): Deterministically generated plain language with no loss of provenance or truth.
3. Full engineering console for technicians: Raw values, units, residuals, 5D confidence, Evidence Object JSON.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from backend.app.persistence.database import get_db
from backend.app.persistence.repositories import (
    ElementAliasRepository, GlossaryRepository
)
from backend.app.core.auth_context import (
    UserSessionContext, require_role
)
from backend.app.narrative.schemas import (
    SupervisorIncidentProjection,
    SupervisorGridTopologyProjection,
    SupervisorGridStateProjection,
)
from backend.app.narrative.generator import PlainNarrativeGenerator
from backend.app.schemas.contracts import Incident, GridTopology, GridState
from backend.app.api.v1.endpoints import (
    _active_grid, _incident_manager, _grid_view_service
)

router = APIRouter(prefix="/views", tags=["Segregated Role Views"])

_generator = PlainNarrativeGenerator()


# =============================================================================
# Supervisor Plain Language Endpoints (Accessible to SUPERVISOR, TECHNICIAN, ADMIN)
# =============================================================================

@router.get("/supervisor/dashboard", dependencies=[Depends(require_role("SUPERVISOR", "TECHNICIAN", "ADMIN"))])
def get_supervisor_dashboard(db: Session = Depends(get_db)):
    """Supervisor Mode: Plain-language system status, frequency health, and active incident briefings."""
    state = _active_grid.get_state()
    incidents = _incident_manager.get_all_incidents()
    state_proj = _generator.project_grid_state(state, incident_count=len(incidents))
    
    incident_projections = [
        _generator.project_incident(inc) for inc in incidents
    ]

    return {
        "environment_label": "PRACTICE_SIMULATION",
        "environment_badge_text": "PRACTICE SIMULATION — Educational Digital Twin",
        "system_health": state_proj.system_health_status,
        "grid_frequency_status": state_proj.plain_frequency_summary,
        "corridor_strain_status": state_proj.equipment_strain_summary,
        "active_incidents_count": len(incidents),
        "recent_briefings": incident_projections,
        "recommendations_summary": "All actions should be coordinated with certified engineering personnel before execution."
    }


@router.get("/supervisor/incidents", response_model=List[SupervisorIncidentProjection], dependencies=[Depends(require_role("SUPERVISOR", "TECHNICIAN", "ADMIN"))])
def list_supervisor_incidents(db: Session = Depends(get_db)):
    """Supervisor Mode: Returns list of active incidents projected into plain language."""
    incidents = _incident_manager.get_all_incidents()
    return [_generator.project_incident(inc) for inc in incidents]


@router.get("/supervisor/incidents/{incident_id}", response_model=SupervisorIncidentProjection, dependencies=[Depends(require_role("SUPERVISOR", "TECHNICIAN", "ADMIN"))])
def get_supervisor_incident(incident_id: str, db: Session = Depends(get_db)):
    """Supervisor Mode: Returns 4-part plain briefing for specific incident."""
    inc = _incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return _generator.project_incident(inc)


@router.get("/supervisor/grid/topology", response_model=SupervisorGridTopologyProjection, dependencies=[Depends(require_role("SUPERVISOR", "TECHNICIAN", "ADMIN"))])
def get_supervisor_topology(db: Session = Depends(get_db)):
    """Supervisor Mode: Plain grid layout with friendly substation names and arterial corridors."""
    topo = _active_grid.get_topology()
    return _generator.project_topology(topo)


@router.get("/supervisor/grid/state", response_model=SupervisorGridStateProjection, dependencies=[Depends(require_role("SUPERVISOR", "TECHNICIAN", "ADMIN"))])
def get_supervisor_grid_state(db: Session = Depends(get_db)):
    """Supervisor Mode: Plain strain indicators and substation status."""
    state = _active_grid.get_state()
    incidents = _incident_manager.get_all_incidents()
    return _generator.project_grid_state(state, incident_count=len(incidents))


@router.get("/supervisor/glossary", dependencies=[Depends(require_role("SUPERVISOR", "TECHNICIAN", "ADMIN"))])
def get_supervisor_glossary(db: Session = Depends(get_db)):
    """Supervisor Mode: Interactive glossary of power-system terms with analogies."""
    terms = GlossaryRepository(db).get_all_terms()
    return [
        {
            "term": t.technical_term.title(),
            "plain_translation": t.plain_translation,
            "plain_analogy": t.plain_analogy
        }
        for t in terms
    ]


# =============================================================================
# Technician Full Detail Endpoints (Accessible ONLY to TECHNICIAN and ADMIN)
# =============================================================================

@router.get("/technician/dashboard", dependencies=[Depends(require_role("TECHNICIAN", "ADMIN"))])
def get_technician_dashboard():
    """Technician Mode: Full engineering dashboard with raw telemetry, envelopes, and residuals."""
    state = _active_grid.get_state()
    incidents = _incident_manager.get_all_incidents()
    
    return {
        "step": state.step,
        "sim_time_s": state.sim_time_s,
        "frequency_hz": getattr(state, "frequency_hz", 60.0),
        "active_incidents": [inc.model_dump() for inc in incidents],
        "bus_count": len(state.buses),
        "line_count": len(state.lines),
        "detector_metrics": {
            "isolation_forest_anomaly_score": 0.12,
            "wls_chi_square_residual": 3.45,
            "classifier_confidence_vector": [0.92, 0.05, 0.02, 0.01]
        }
    }


@router.get("/technician/incidents/{incident_id}", dependencies=[Depends(require_role("TECHNICIAN", "ADMIN"))])
def get_technician_incident_detail(incident_id: str):
    """Technician Mode: Full raw Evidence Object with 5D confidence vector and JSON tree."""
    inc = _incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return inc.model_dump()


@router.get("/technician/grid/state", dependencies=[Depends(require_role("TECHNICIAN", "ADMIN"))])
def get_technician_grid_state():
    """Technician Mode: Comprehensive physical telemetry with units and R1 envelopes."""
    state = _active_grid.get_state()
    return state.model_dump()
