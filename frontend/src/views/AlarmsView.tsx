import React, { useState } from 'react';
import { AlarmRecord } from '../../types/api';
import { Pane } from '../ui/Pane';
import { Toolbar, ToolbarSeparator } from '../ui/Toolbar';
import { Status } from '../ui/Status';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Drawer } from '../ui/Drawer';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { PropertyGrid } from '../ui/PropertyGrid';
import { ColumnDef } from '@tanstack/react-table';
import { formatTimestampUTC } from '../lib/formatters';

interface AlarmsViewProps {
  alarms: AlarmRecord[];
  onAcknowledgeAlarm: (alarmId: string, note: string) => void;
}

const DEMO_ALARMS: AlarmRecord[] = [
  {
    id: 'alm-001',
    run_id: 'RUN_DEMO',
    tag: 'BUS_04_V_CRIT_LOW',
    description: 'Severe under-voltage reported at Bus 4: 0.880 p.u. (Limit: 0.90 p.u.)',
    priority: 'CRITICAL',
    state: 'UNACK',
    source_component: 'Bus 4',
    current_value: 0.880,
    limit_value: 0.90,
    created_at_step: 5,
    created_at_wall: new Date().toISOString(),
    provenance: 'OBSERVED',
  },
  {
    id: 'alm-002',
    run_id: 'RUN_DEMO',
    tag: 'GEN_02_OVER_EXCITED',
    description: 'AVR supervisory controller forced Gen 2 excitation to 1.082 p.u.',
    priority: 'WARNING',
    state: 'UNACK',
    source_component: 'Gen 2',
    current_value: 1.082,
    limit_value: 1.05,
    created_at_step: 7,
    created_at_wall: new Date().toISOString(),
    provenance: 'OBSERVED',
  },
  {
    id: 'alm-003',
    run_id: 'RUN_DEMO',
    tag: 'LINE_01_02_OVERLOAD',
    description: 'Thermal line loading on Line 1-2 reached 108.5% of continuous rating',
    priority: 'WARNING',
    state: 'ACK',
    source_component: 'Line 1-2',
    current_value: 108.5,
    limit_value: 100.0,
    created_at_step: 3,
    created_at_wall: new Date().toISOString(),
    acknowledged_by: 'OPERATOR_1',
    provenance: 'OBSERVED',
  },
];

export const AlarmsView: React.FC<AlarmsViewProps> = ({
  alarms = [],
  onAcknowledgeAlarm,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmRecord | null>(null);
  const [ackDialogOpen, setAckDialogOpen] = useState<boolean>(false);
  const [ackTargetAlarm, setAckTargetAlarm] = useState<AlarmRecord | null>(null);
  const [ackNote, setAckNote] = useState<string>('Acknowledged by control room operator');
  const [localAlarms, setLocalAlarms] = useState<AlarmRecord[]>([]);

  const activeAlarmsList = alarms.length > 0 ? alarms : (localAlarms.length > 0 ? localAlarms : DEMO_ALARMS);

  const filteredAlarms = activeAlarmsList.filter((a) => {
    if (priorityFilter !== 'ALL' && a.priority !== priorityFilter) return false;
    if (stateFilter !== 'ALL') {
      if (stateFilter === 'UNACK' && a.state !== 'UNACK' && a.state !== 'ACTIVE_UNACK' && a.state !== 'RTN_UNACK') return false;
      if (stateFilter === 'ACK' && a.state !== 'ACK' && a.state !== 'ACTIVE_ACK') return false;
      if (stateFilter === 'CLEARED' && a.state !== 'CLEARED') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.tag.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.source_component && a.source_component.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAck = (alarm: AlarmRecord) => {
    setAckTargetAlarm(alarm);
    setAckDialogOpen(true);
  };

  const handleConfirmAck = () => {
    if (ackTargetAlarm) {
      onAcknowledgeAlarm(ackTargetAlarm.id, ackNote);
      // Optimistic update for responsive UI
      setLocalAlarms((prev) => {
        const base = prev.length > 0 ? prev : activeAlarmsList;
        return base.map((a) =>
          a.id === ackTargetAlarm.id
            ? { ...a, state: 'ACK', acknowledged_by: 'OPERATOR_1', acknowledged_at: new Date().toISOString() }
            : a
        );
      });
    }
    setAckDialogOpen(false);
  };

  const columns: ColumnDef<AlarmRecord, any>[] = [
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: (info) => <Status status={String(info.getValue())} />,
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: (info) => {
        const s = String(info.getValue());
        const isUnack = s === 'UNACK' || s === 'ACTIVE_UNACK' || s === 'RTN_UNACK';
        return (
          <span
            className={`font-mono text-[11px] ${
              isUnack ? 'text-alarm-critical font-bold' : 'text-text-muted'
            }`}
          >
            {s === 'ACTIVE_UNACK' ? 'UNACK' : s === 'ACTIVE_ACK' ? 'ACK' : s}
          </span>
        );
      },
    },
    {
      accessorKey: 'tag',
      header: 'Tag',
      cell: (info) => (
        <span className="font-mono font-bold text-accent">
          {String(info.getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const s = info.row.original.state;
        const isUnack = s === 'UNACK' || s === 'ACTIVE_UNACK' || s === 'RTN_UNACK';
        return (
          <span
            className={`truncate ${
              isUnack ? 'font-semibold text-text-main' : 'text-text-muted'
            }`}
          >
            {String(info.getValue())}
          </span>
        );
      },
    },
    {
      id: 'values',
      header: () => <span className="text-right block">Value / Limit</span>,
      cell: (info) => {
        const v = info.row.original.current_value ?? (info.row.original as any).value;
        const l = info.row.original.limit_value ?? (info.row.original as any).limit;
        return (
          <span className="font-mono text-right block tabular-nums text-text-muted">
            {v !== undefined && v !== null ? (typeof v === 'number' ? v.toFixed(3) : v) : '—'} /{' '}
            {l !== undefined && l !== null ? (typeof l === 'number' ? l.toFixed(3) : l) : '—'}
          </span>
        );
      },
    },
    {
      id: 'timestamp',
      header: 'Timestamp (UTC)',
      cell: (info) => {
        const ts = info.row.original.created_at_wall || (info.row.original as any).created_at;
        return (
          <span className="font-mono text-[11px] text-text-subtle">
            {formatTimestampUTC(ts as string)}
          </span>
        );
      },
    },
    {
      accessorKey: 'acknowledged_by',
      header: 'Ack By',
      cell: (info) => (
        <span className="font-mono text-[11px] text-text-subtle">
          {(info.getValue() as string) || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="text-right block">Action</span>,
      cell: (info) => {
        const alm = info.row.original;
        const s = alm.state;
        const isUnack = s === 'UNACK' || s === 'ACTIVE_UNACK' || s === 'RTN_UNACK';
        if (!isUnack) return null;
        return (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAck(alm);
              }}
            >
              Acknowledge
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Alarms Toolbar & Priority Segmented Buttons */}
      <Toolbar
        left={
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <span className="font-semibold text-text-main mr-1">
              ISA-18.2 Alarms
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((pri) => (
              <button
                key={pri}
                onClick={() => setPriorityFilter(pri)}
                className={`px-2 py-0.5 rounded-sm text-xs font-mono transition-colors ${
                  priorityFilter === pri
                    ? 'bg-accent text-[var(--sim-badge-fg)] font-semibold'
                    : 'bg-panel text-text-muted hover:text-text-main border border-border'
                }`}
              >
                {pri}
              </button>
            ))}
            <ToolbarSeparator />
            {['ALL', 'UNACK', 'ACK', 'CLEARED'].map((st) => (
              <button
                key={st}
                onClick={() => setStateFilter(st)}
                className={`px-2 py-0.5 rounded-sm text-xs font-mono transition-colors ${
                  stateFilter === st
                    ? 'bg-border-strong text-text-main font-semibold'
                    : 'bg-panel text-text-muted hover:text-text-main border border-border'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
        right={
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Filter alarms (/)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-6 w-36 px-2 text-xs bg-panel border border-border rounded-sm text-text-main placeholder:text-text-subtle focus:outline-none focus:border-accent"
            />
          </div>
        }
      />

      {/* Main Alarms Table */}
      <Pane noPadding className="flex-1 border-t-0">
        <Table
          data={filteredAlarms}
          columns={columns}
          selectedRowId={selectedAlarm?.id}
          onSelectRow={(r) => setSelectedAlarm(r)}
          emptyMessage="No active alarms matching current filter criteria."
        />
      </Pane>

      {/* Right-Side Alarm Detail Drawer */}
      <Drawer
        open={selectedAlarm !== null}
        onClose={() => setSelectedAlarm(null)}
        title={`Alarm Detail: ${selectedAlarm?.tag || ''}`}
        badge={selectedAlarm && <Status status={selectedAlarm.priority} />}
        footer={
          selectedAlarm &&
          (selectedAlarm.state === 'UNACK' || selectedAlarm.state === 'RTN_UNACK') && (
            <Button
              variant="primary"
              onClick={() => {
                handleOpenAck(selectedAlarm);
              }}
            >
              Acknowledge Alarm
            </Button>
          )
        }
      >
        {selectedAlarm && (
          <div className="space-y-3">
            <PropertyGrid
              items={[
                { label: 'Alarm Tag', value: selectedAlarm.tag },
                { label: 'Description', value: selectedAlarm.description, isNumeric: false },
                { label: 'State', value: selectedAlarm.state, isNumeric: false },
                {
                  label: 'Current Reading',
                  value: selectedAlarm.current_value !== undefined ? selectedAlarm.current_value?.toFixed(3) : '—',
                  provenance: 'OBS',
                },
                {
                  label: 'Configured Limit',
                  value: selectedAlarm.limit_value !== undefined ? selectedAlarm.limit_value?.toFixed(3) : '—',
                  provenance: 'CALC',
                },
                {
                  label: 'Raised at Step',
                  value: String(selectedAlarm.created_at_step),
                },
                {
                  label: 'Raised UTC',
                  value: formatTimestampUTC(selectedAlarm.created_at_wall),
                },
                {
                  label: 'Acknowledged By',
                  value: selectedAlarm.acknowledged_by || 'Unacknowledged',
                  isNumeric: false,
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* Acknowledge Confirmation Dialog */}
      <Dialog
        open={ackDialogOpen}
        onOpenChange={setAckDialogOpen}
        title={`Acknowledge Alarm: ${ackTargetAlarm?.tag || ''}`}
        description="Provide an operator note to audit log this alarm acknowledgment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAckDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAck}>
              Confirm Acknowledge
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Operator Log Note"
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
            helperText="Note is permanently logged to the incident audit trail."
          />
        </div>
      </Dialog>
    </div>
  );
};
