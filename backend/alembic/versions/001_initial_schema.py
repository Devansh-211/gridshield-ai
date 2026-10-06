"""Initial Schema Creation for GridShield AI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-06 12:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Visitors
    op.create_table(
        'visitors',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('quota_counters_json', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Runs
    op.create_table(
        'runs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('visitor_id', sa.String(length=64), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('seed', sa.Integer(), nullable=False),
        sa.Column('scenario_type', sa.String(length=32), nullable=False),
        sa.Column('config_json', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('sim_step', sa.Integer(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('git_sha', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=32), nullable=False),
        sa.Column('error_json', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['visitor_id'], ['visitors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_runs_visitor_id', 'runs', ['visitor_id'])

    # 3. Checkpoints
    op.create_table(
        'session_checkpoints',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('controller_state_json', sa.JSON(), nullable=False),
        sa.Column('frequency_state_json', sa.JSON(), nullable=False),
        sa.Column('estimator_state_json', sa.JSON(), nullable=False),
        sa.Column('alarm_state_json', sa.JSON(), nullable=False),
        sa.Column('incident_state_json', sa.JSON(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('run_id')
    )
    op.create_index('ix_session_checkpoints_run_id', 'session_checkpoints', ['run_id'])

    # 4. Injections (Ground Truth)
    op.create_table(
        'injections',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step_start', sa.Integer(), nullable=False),
        sa.Column('step_end', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=64), nullable=False),
        sa.Column('params_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_injections_run_id', 'injections', ['run_id'])

    # 5. Ground Truth Steps
    op.create_table(
        'ground_truth_steps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('values_json', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('run_id', 'step', name='uq_ground_truth_run_step')
    )
    op.create_index('ix_ground_truth_steps_run_id', 'ground_truth_steps', ['run_id'])

    # 6. Observed Steps
    op.create_table(
        'observed_steps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('values_json', sa.JSON(), nullable=False),
        sa.Column('quality_json', sa.JSON(), nullable=False),
        sa.Column('sequence', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('run_id', 'step', name='uq_observed_run_step')
    )
    op.create_index('ix_observed_steps_run_id', 'observed_steps', ['run_id'])

    # 7. Cyber Events
    op.create_table(
        'cyber_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(length=64), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('details_json', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cyber_events_run_id', 'cyber_events', ['run_id'])

    # 8. Grid Steps
    op.create_table(
        'grid_steps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('summary_metrics_json', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_grid_steps_run_id', 'grid_steps', ['run_id'])

    # 9. Detections
    op.create_table(
        'detections',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('l1_stats_json', sa.JSON(), nullable=False),
        sa.Column('l2_score', sa.Float(), nullable=False),
        sa.Column('l3_probs_json', sa.JSON(), nullable=False),
        sa.Column('decision', sa.String(length=64), nullable=False),
        sa.Column('abstained', sa.Boolean(), nullable=False),
        sa.Column('suspect_ranking_json', sa.JSON(), nullable=False),
        sa.Column('feature_version', sa.String(length=32), nullable=False),
        sa.Column('feature_vector_json', sa.JSON(), nullable=False),
        sa.Column('model_version', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_detections_run_id', 'detections', ['run_id'])

    # 10. Attributions
    op.create_table(
        'attributions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('likely_cause', sa.String(length=64), nullable=False),
        sa.Column('domain', sa.String(length=32), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('hypotheses_json', sa.JSON(), nullable=False),
        sa.Column('supporting_evidence_json', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_attributions_run_id', 'attributions', ['run_id'])

    # 11. Risk Assessments
    op.create_table(
        'risk_assessments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('risk_level', sa.String(length=32), nullable=False),
        sa.Column('subscores_json', sa.JSON(), nullable=False),
        sa.Column('formula_version', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_risk_assessments_run_id', 'risk_assessments', ['run_id'])

    # 12. Incident Sequences
    op.create_table(
        'incident_sequences',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('last_val', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 13. Incidents
    op.create_table(
        'incidents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('incident_id', sa.String(length=32), nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('visitor_id', sa.String(length=64), nullable=False),
        sa.Column('opened_step', sa.Integer(), nullable=False),
        sa.Column('closed_step', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('classification', sa.String(length=64), nullable=False),
        sa.Column('likely_cause', sa.String(length=64), nullable=False),
        sa.Column('risk_level', sa.String(length=32), nullable=False),
        sa.Column('affected_components_json', sa.JSON(), nullable=False),
        sa.Column('plain_summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['visitor_id'], ['visitors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('incident_id')
    )
    op.create_index('ix_incidents_incident_id', 'incidents', ['incident_id'])
    op.create_index('ix_incidents_run_id', 'incidents', ['run_id'])
    op.create_index('ix_incidents_visitor_id', 'incidents', ['visitor_id'])

    # 14. Incident Evidence
    op.create_table(
        'incident_evidence',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('incident_id', sa.String(length=32), nullable=False),
        sa.Column('evidence_tag', sa.String(length=16), nullable=False),
        sa.Column('domain', sa.String(length=32), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('measured_value', sa.Float(), nullable=True),
        sa.Column('expected_value', sa.Float(), nullable=True),
        sa.Column('deviation', sa.Float(), nullable=True),
        sa.Column('provenance', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.incident_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_incident_evidence_incident_id', 'incident_evidence', ['incident_id'])

    # 15. Events (Append-only timeline)
    op.create_table(
        'events',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('severity', sa.String(length=32), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('details_json', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_events_run_id', 'events', ['run_id'])

    # 16. Alarms
    op.create_table(
        'alarms',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('step', sa.Integer(), nullable=False),
        sa.Column('tag', sa.String(length=64), nullable=False),
        sa.Column('priority', sa.String(length=32), nullable=False),
        sa.Column('state', sa.String(length=32), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('limit', sa.Float(), nullable=True),
        sa.Column('ack_by', sa.String(length=64), nullable=True),
        sa.Column('ack_note', sa.Text(), nullable=True),
        sa.Column('ack_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_alarms_run_id', 'alarms', ['run_id'])
    op.create_index('ix_alarms_tag', 'alarms', ['tag'])

    # 17. Mitigation Results
    op.create_table(
        'mitigation_results',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('incident_id', sa.String(length=32), nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('actions_json', sa.JSON(), nullable=False),
        sa.Column('baseline_metrics_json', sa.JSON(), nullable=False),
        sa.Column('unmitigated_impact_json', sa.JSON(), nullable=False),
        sa.Column('mitigated_metrics_json', sa.JSON(), nullable=False),
        sa.Column('delta_json', sa.JSON(), nullable=False),
        sa.Column('improved', sa.Boolean(), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.incident_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mitigation_results_incident_id', 'mitigation_results', ['incident_id'])
    op.create_index('ix_mitigation_results_run_id', 'mitigation_results', ['run_id'])

    # 18. Analyst Outputs
    op.create_table(
        'analyst_outputs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('incident_id', sa.String(length=32), nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('mode', sa.String(length=32), nullable=False),
        sa.Column('reading_level', sa.String(length=32), nullable=False),
        sa.Column('context_hash', sa.String(length=64), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('cited_ids_json', sa.JSON(), nullable=False),
        sa.Column('validated', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.incident_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_analyst_outputs_incident_id', 'analyst_outputs', ['incident_id'])

    # 19. Audit Log
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('visitor_id', sa.String(length=64), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('target_type', sa.String(length=64), nullable=False),
        sa.Column('target_id', sa.String(length=64), nullable=False),
        sa.Column('details_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_log_visitor_id', 'audit_log', ['visitor_id'])

    # 20. Model Registry
    op.create_table(
        'model_registry',
        sa.Column('version', sa.String(length=32), nullable=False),
        sa.Column('trained_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('dataset_version', sa.String(length=32), nullable=False),
        sa.Column('feature_version', sa.String(length=32), nullable=False),
        sa.Column('seed', sa.Integer(), nullable=False),
        sa.Column('metrics_json', sa.JSON(), nullable=False),
        sa.Column('artifact_path', sa.String(length=256), nullable=False),
        sa.Column('checksum', sa.String(length=64), nullable=False),
        sa.Column('library_versions_json', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('version')
    )

    # 21. App Settings
    op.create_table(
        'app_settings',
        sa.Column('key', sa.String(length=64), nullable=False),
        sa.Column('value_json', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )

def downgrade() -> None:
    op.drop_table('app_settings')
    op.drop_table('model_registry')
    op.drop_table('audit_log')
    op.drop_table('analyst_outputs')
    op.drop_table('mitigation_results')
    op.drop_table('alarms')
    op.drop_table('events')
    op.drop_table('incident_evidence')
    op.drop_table('incidents')
    op.drop_table('incident_sequences')
    op.drop_table('risk_assessments')
    op.drop_table('attributions')
    op.drop_table('detections')
    op.drop_table('grid_steps')
    op.drop_table('cyber_events')
    op.drop_table('observed_steps')
    op.drop_table('ground_truth_steps')
    op.drop_table('injections')
    op.drop_table('session_checkpoints')
    op.drop_table('runs')
    op.drop_table('visitors')
