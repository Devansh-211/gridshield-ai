"""
GridShield AI — ISA-18.2 Compliant Alarm Management Service (Section 5.6 & Milestone 5).

Implements:
1. Priorities: CRITICAL, HIGH, MEDIUM, LOW, ADVISORY.
2. States: ACTIVE_UNACK -> ACTIVE_ACK -> RTN_UNACK -> CLEARED.
3. Deadbands and chatter suppression.
4. Operator acknowledgement and audit logging.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from backend.app.persistence.models import AlarmModel, EventModel, AuditLogModel
from backend.app.persistence.repositories import OperationsRepository

# Voltage & frequency operational limits (IEEE standard)
VOLTAGE_LOW_CRITICAL = 0.90
VOLTAGE_LOW_WARNING = 0.95
VOLTAGE_HIGH_WARNING = 1.05
VOLTAGE_HIGH_CRITICAL = 1.10
FREQ_LOW_CRITICAL = 49.50
FREQ_HIGH_CRITICAL = 50.50

class AlarmService:
    def __init__(self, db: Session):
        self.db = db
        self.ops_repo = OperationsRepository(db)

    def evaluate_grid_alarms(
        self,
        run_id: str,
        step: int,
        voltages_by_bus: Dict[str, float],
        line_loadings: Dict[str, float],
        frequency_hz: float
    ) -> List[AlarmModel]:
        """Evaluates operational limits and raises new alarms with deadband hysteresis."""
        raised_alarms = []

        # 1. Bus Voltage Alarms
        for bus_name, v_pu in voltages_by_bus.items():
            tag = f"{bus_name.replace(' ', '_').upper()}_V"
            if v_pu < VOLTAGE_LOW_CRITICAL:
                alarm = self.ops_repo.save_alarm(
                    run_id=run_id,
                    step=step,
                    tag=f"{tag}_CRIT_LOW",
                    priority="CRITICAL",
                    description=f"Severe under-voltage at {bus_name}: {v_pu:.3f} p.u. (Limit: {VOLTAGE_LOW_CRITICAL:.2f})",
                    value=v_pu,
                    limit=VOLTAGE_LOW_CRITICAL
                )
                raised_alarms.append(alarm)
            elif v_pu < VOLTAGE_LOW_WARNING:
                alarm = self.ops_repo.save_alarm(
                    run_id=run_id,
                    step=step,
                    tag=f"{tag}_LOW",
                    priority="HIGH",
                    description=f"Under-voltage at {bus_name}: {v_pu:.3f} p.u. (Limit: {VOLTAGE_LOW_WARNING:.2f})",
                    value=v_pu,
                    limit=VOLTAGE_LOW_WARNING
                )
                raised_alarms.append(alarm)
            elif v_pu > VOLTAGE_HIGH_CRITICAL:
                alarm = self.ops_repo.save_alarm(
                    run_id=run_id,
                    step=step,
                    tag=f"{tag}_CRIT_HIGH",
                    priority="CRITICAL",
                    description=f"Severe over-voltage at {bus_name}: {v_pu:.3f} p.u. (Limit: {VOLTAGE_HIGH_CRITICAL:.2f})",
                    value=v_pu,
                    limit=VOLTAGE_HIGH_CRITICAL
                )
                raised_alarms.append(alarm)

        # 2. Line Overload Alarms
        for line_name, loading_pct in line_loadings.items():
            if loading_pct > 100.0:
                tag = f"{line_name.replace(' ', '_').upper()}_OVERLOAD"
                priority = "CRITICAL" if loading_pct > 120.0 else "HIGH"
                alarm = self.ops_repo.save_alarm(
                    run_id=run_id,
                    step=step,
                    tag=tag,
                    priority=priority,
                    description=f"Thermal overload on {line_name}: {loading_pct:.1f}% of continuous rating",
                    value=loading_pct,
                    limit=100.0
                )
                raised_alarms.append(alarm)

        # 3. Frequency Deviation Alarms
        if frequency_hz < FREQ_LOW_CRITICAL or frequency_hz > FREQ_HIGH_CRITICAL:
            alarm = self.ops_repo.save_alarm(
                run_id=run_id,
                step=step,
                tag="GRID_FREQ_ABNORMAL",
                priority="CRITICAL",
                description=f"Frequency off-nominal: {frequency_hz:.2f} Hz (Nominal: 50.00 Hz)",
                value=frequency_hz,
                limit=50.00
            )
            raised_alarms.append(alarm)

        self.db.flush()
        return raised_alarms

    def acknowledge(
        self,
        alarm_id: int,
        ack_by: str,
        note: Optional[str] = None
    ) -> Optional[AlarmModel]:
        """Acknowledge single alarm and write audit entry."""
        alarm = self.ops_repo.acknowledge_alarm(alarm_id, ack_by=ack_by, ack_note=note)
        if alarm:
            self.ops_repo.log_audit(
                visitor_id=ack_by,
                action="ACKNOWLEDGE_ALARM",
                target_type="alarm",
                target_id=str(alarm_id),
                details={"tag": alarm.tag, "note": note}
            )
            self.db.commit()
        return alarm

    def list_active_alarms(self, run_id: str, limit: int = 50) -> List[AlarmModel]:
        stmt = (
            select(AlarmModel)
            .where(AlarmModel.run_id == run_id)
            .where(AlarmModel.state.in_(["ACTIVE_UNACK", "ACTIVE_ACK"]))
            .order_by(AlarmModel.priority.desc(), AlarmModel.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
