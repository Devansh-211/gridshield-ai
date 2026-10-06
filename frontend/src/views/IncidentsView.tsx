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

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents = [],
  onSelectIncident,
}) => {
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
            Cyber-Physical Incident Queue ({incidents.length} Records)
          </span>
        }
      />
      <Pane noPadding className="flex-1 border-t-0">
        <Table
          data={incidents}
          columns={columns}
          onSelectRow={onSelectIncident}
          emptyMessage="No incidents recorded in the current session."
        />
      </Pane>
    </div>
  );
};
