"""GridShield AI — Demo Runner Service.

Orchestrates real end-to-end execution for:
1. Primary Demo: False Data Injection (FDI) on Bus 4 with closed-loop SCADA overcorrection, detection, attribution, impact simulation, allowlisted mitigation, and 3-way verification.
2. Secondary Demo: Physical Line Failure demonstrating physical vs cyber contrast (coherent electrical propagation, physical explainability match, zero cyber anomalies).

Invariant I1: No fabricated results. Everything executes through the real simulator, estimator, ML models, and attribution engine.
"""

from typing import Dict, Any, Optional
from backend.app.schemas.contracts import (
    ScenarioType, AttackType, AttackSpec, ScenarioSpec, AnalystContext
)
from backend.app.api.v1.endpoints import (
    create_run, _incident_manager, recommend_mitigation, simulate_mitigation, _analyst_service
)


class DemoRunner:
    def __init__(self):
        self.analyst = _analyst_service

    def run_primary_fdi_demo(self, seed: int = 42, target_bus: str = "Bus 4") -> Dict[str, Any]:
        """Runs the primary FDI demo through the real pipeline."""
        demo_spec = ScenarioSpec(
            scenario_type=ScenarioType.NORMAL,
            total_steps=25,
            seed=seed,
            attack=AttackSpec(
                attack_type=AttackType.FALSE_DATA_INJECTION,
                target_components=[target_bus],
                start_step=5,
                duration_steps=20,
                magnitude=-0.12,
            )
        )
        run_result = create_run(demo_spec)
        incidents = _incident_manager.get_all_incidents()
        active_inc = incidents[-1] if incidents else None

        mitigation_res = None
        plan = None
        explanation = None

        if active_inc:
            plan = recommend_mitigation(active_inc)
            active_inc.recommended_plan = plan
            mitigation_res = simulate_mitigation(active_inc, plan)
            active_inc.mitigation_result = mitigation_res
            
            ctx = AnalystContext(
                incident_id=active_inc.incident_id,
                run_id=active_inc.run_id,
                classification=active_inc.classification,
                likely_cause=active_inc.attribution.likely_cause,
                certainty=active_inc.certainty,
                risk_level=active_inc.risk.risk_level,
                evidence=active_inc.evidence,
                affected_components=active_inc.affected_components,
                recommended_actions=[a.justification for a in active_inc.recommended_plan.actions] if active_inc.recommended_plan else [],
                model_version=active_inc.model_version,
            )
            explanation = self.analyst.explain_incident(ctx)

        return {
            "demo_type": "PRIMARY_FDI",
            "status": "COMPLETED",
            "run_id": run_result["run_id"],
            "seed": seed,
            "target_bus": target_bus,
            "steps_simulated": run_result["total_steps"],
            "incidents_created": len(incidents),
            "active_incident": active_inc.model_dump() if active_inc else None,
            "detection": run_result["detection"],
            "attribution": run_result["attribution"],
            "risk": run_result["risk"],
            "mitigation_plan": plan.model_dump() if plan else None,
            "verification_result": mitigation_res.model_dump() if mitigation_res else None,
            "explanation": explanation.model_dump() if explanation else None,
        }

    def run_secondary_physical_demo(self, seed: int = 42, line_target: str = "Line 1-2") -> Dict[str, Any]:
        """Runs the secondary demo (Line Failure physical fault) demonstrating physical vs cyber contrast."""
        demo_spec = ScenarioSpec(
            scenario_type=ScenarioType.LINE_FAILURE,
            target_components=[line_target],
            total_steps=25,
            seed=seed,
            attack=None
        )
        run_result = create_run(demo_spec)
        incidents = _incident_manager.get_all_incidents()
        active_inc = incidents[-1] if incidents else None

        explanation = None
        if active_inc:
            ctx = AnalystContext(
                incident_id=active_inc.incident_id,
                run_id=active_inc.run_id,
                classification=active_inc.classification,
                likely_cause=active_inc.attribution.likely_cause,
                certainty=active_inc.certainty,
                risk_level=active_inc.risk.risk_level,
                evidence=active_inc.evidence,
                affected_components=active_inc.affected_components,
                recommended_actions=[],
                model_version=active_inc.model_version,
            )
            explanation = self.analyst.explain_incident(ctx)

        return {
            "demo_type": "SECONDARY_PHYSICAL_FAULT",
            "status": "COMPLETED",
            "run_id": run_result["run_id"],
            "seed": seed,
            "target_component": line_target,
            "steps_simulated": run_result["total_steps"],
            "incidents_created": len(incidents),
            "active_incident": active_inc.model_dump() if active_inc else None,
            "detection": run_result["detection"],
            "attribution": run_result["attribution"],
            "risk": run_result["risk"],
            "explanation": explanation.model_dump() if explanation else None,
        }
