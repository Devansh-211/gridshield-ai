import React from 'react';
import { Incident } from '../../types/api';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { Status } from '../ui/Status';
import { Table } from '../ui/Table';
import { ColumnDef } from '@tanstack/react-table';
import { formatTimestampUTC } from '../lib/formatters';

interface IncidentsViewProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

const DEFAULT_DEMO_INCIDENTS: Incident[] = [
  {
    incident_id: 'INC-2026-001',
    run_id: 'RUN_DEMO',
    scenario_ref: 'DEMO_FDI_BUS4',
    status: 'INVESTIGATING',
    classification: 'FALSE_DATA_INJECTION',
    attribution: {
      likely_cause: 'Bus 4 Sensor Telemetry Spoofing (FDI)',
      hypothesis_scores: { FALSE_DATA_INJECTION: 0.92, PHYSICAL_FAULT: 0.08 },
      supporting_evidence: [],
      contradicting_evidence: [],
      alternatives_considered: ['NORMAL', 'PHYSICAL_FAULT'],
      provenance: 'MODEL',
    },
    risk: {
      overall_risk_score: 78.5,
      risk_level: 'CRITICAL',
      sub_scores: [],
      cyber_integrity_map: { 'Bus 4': 'COMPROMISED' },
      provenance: 'CALCULATED',
    },
    certainty: 'HIGH',
    affected_components: ['Bus 4', 'Gen 2', 'Line 1-2'],
    created_at_step: 5,
    created_at_wall: new Date().toISOString(),
    evidence: [
      {
        id: 'ev-01',
        domain: 'TELEMETRY',
        metric_name: 'WLS Chi-Square Residual (Chi2)',
        observed_value: 28.4,
        expected_value: 12.0,
        description: 'Large measurement residual violating physical network constraints on Bus 4.',
        provenance: 'CALCULATED',
      },
      {
        id: 'ev-02',
        domain: 'CYBER',
        metric_name: 'SCADA Telemetry Delta',
        observed_value: -0.12,
        expected_value: 0.0,
        description: 'Reported voltage at Bus 4 dropped to 0.88 p.u. without corresponding line load changes.',
        provenance: 'OBSERVED',
      },
    ],
    recommended_plan: {
      plan_id: 'PLAN-001',
      incident_id: 'INC-2026-001',
      actions: [
        {
          action_type: 'QUARANTINE_MEASUREMENT',
          target_component: 'Bus 4',
          justification: 'Isolate compromised Bus 4 voltage telemetry and switch AVR to synthetic estimator state.',
          parameter_value: 0.0,
        },
        {
          action_type: 'REDISPATCH_GEN',
          target_component: 'Gen 2',
          justification: 'Restore Generator 2 AVR setpoint to nominal 1.02 p.u.',
          parameter_value: 1.02,
        },
      ],
      evidence_citations: ['ev-01', 'ev-02'],
      provenance: 'MODEL',
    },
    model_version: 'v1.0.0',
    provenance: 'MODEL',
  },
];

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents = [],
  onSelectIncident,
}) => {
  const activeIncidents = incidents.length > 0 ? incidents : DEFAULT_DEMO_INCIDENTS;

  const columns: ColumnDef<Incident, any>[] = [
    {
      accessorKey: 'incident_id',
      header: 'Incident ID',
      cell: (info) => (
        <span className="font-mono font-bold text-accent">
          {String(info.getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => <Status status={String(info.getValue())} />,
    },
    {
      accessorKey: 'classification',
      header: 'Classification',
      cell: (info) => {
        const val = String(info.getValue());
        const isCyber = val.includes('CYBER') || val.includes('INJECTION') || val.includes('COMMAND');
        return (
          <span
            className={`font-mono text-[11px] font-semibold ${
              isCyber ? 'text-[var(--compromised)]' : 'text-text-main'
            }`}
          >
            {val}
          </span>
        );
      },
    },
    {
      id: 'likely_cause',
      header: 'Likely Cause',
      cell: (info) => (
        <span className="truncate text-text-main">
          {info.row.original.attribution?.likely_cause || 'Under Investigation'}
        </span>
      ),
    },
    {
      id: 'affected',
      header: 'Affected Components',
      cell: (info) => (
        <span className="font-mono text-[11px] text-text-muted">
          {info.row.original.affected_components?.join(', ') || '—'}
        </span>
      ),
    },
    {
      id: 'risk',
      header: 'Risk Level',
      cell: (info) => (
        <Status
          status={info.row.original.risk?.risk_level || 'LOW'}
          label={`${info.row.original.risk?.risk_level || 'LOW'} (${(
            info.row.original.risk?.overall_risk_score || 0
          ).toFixed(1)}/100)`}
        />
      ),
    },
    {
      accessorKey: 'certainty',
      header: 'Certainty',
      cell: (info) => (
        <span className="font-mono text-[11px] font-bold text-text-muted">
          {String(info.getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'created_at_wall',
      header: 'Opened UTC',
      cell: (info) => (
        <span className="font-mono text-[11px] text-text-subtle">
          {formatTimestampUTC(info.getValue() as string)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      <Toolbar
        left={
          <span className="font-semibold text-text-main">
            Cyber-Physical Incident Queue ({activeIncidents.length} Records)
          </span>
        }
      />
      <Pane noPadding className="flex-1 border-t-0">
        <Table
          data={activeIncidents}
          columns={columns}
          onSelectRow={onSelectIncident}
          emptyMessage="No incidents recorded in the current session."
        />
      </Pane>
    </div>
  );
};
