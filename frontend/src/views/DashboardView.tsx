import React from 'react';
import {
  GridTopology,
  GridState,
  ObservedTelemetryPoint,
  Incident,
  TimelineEvent,
  AlarmRecord,
} from '../../types/api';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { PropertyGrid } from '../ui/PropertyGrid';
import { Status } from '../ui/Status';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { OneLineDiagram } from '../features/grid/OneLineDiagram';
import { UPlotChart } from '../features/trends/UPlotChart';
import { formatVoltage, formatFrequency, formatRiskScore } from '../lib/formatters';
import { ColumnDef } from '@tanstack/react-table';

interface DashboardViewProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  telemetry: ObservedTelemetryPoint[];
  incidents: Incident[];
  alarms?: AlarmRecord[];
  events: TimelineEvent[];
  onOpenIncidentDetail: (incident: Incident) => void;
  onNavigateToScenarios: () => void;
  onNavigateToExplained?: () => void;
  onStartSession?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  topology,
  gridState,
  telemetry,
  incidents,
  alarms = [],
  events,
  onOpenIncidentDetail,
  onNavigateToScenarios,
  onNavigateToExplained,
  onStartSession,
}) => {
  const activeIncident = incidents.find((i) => i.status !== 'RESOLVED');
  const compromisedBuses = activeIncident?.affected_components || [];

  const busesCount = gridState?.buses?.length || 14;
  const busesInBand =
    gridState?.buses?.filter((b) => b.vm_pu >= 0.95 && b.vm_pu <= 1.05).length ?? 14;
  const linesCount = gridState?.lines?.length || 20;
  const linesUnder100 =
    gridState?.lines?.filter((l) => l.loading_pct <= 100.0).length ?? 20;

  const freqHz = gridState?.frequency_hz ?? 50.0;
  const riskScore = activeIncident?.risk?.overall_risk_score ?? 0.0;
  const riskLevel = activeIncident?.risk?.risk_level ?? 'LOW';

  const unackAlarms = alarms.filter((a) => a.state === 'UNACK' || a.state === 'RTN_UNACK');

  // Mini trend data
  const trendSteps = [0, 5, 10, 15, 20];
  const bus4Voltage = activeIncident ? [1.02, 1.018, 0.90, 0.895, 0.892] : [1.02, 1.019, 1.021, 1.02, 1.02];
  const bus4Est = [1.02, 1.018, 1.021, 1.02, 1.02];
  const miniTrendData = [trendSteps, bus4Voltage, bus4Est];

  const alarmColumns: ColumnDef<AlarmRecord, any>[] = [
    {
      accessorKey: 'priority',
      header: 'Pri',
      cell: (info) => <Status status={String(info.getValue())} />,
    },
    {
      accessorKey: 'tag',
      header: 'Tag',
      cell: (info) => <span className="font-mono font-bold text-accent">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => <span className="truncate text-text-main">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: (info) => <span className="font-mono text-[11px] text-text-muted">{String(info.getValue())}</span>,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* 2-Column Resizable Layout: Left 62% | Right 38% */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-1.5 p-1.5 min-h-0 overflow-hidden">
        {/* Left Column (8 cols = ~66%) */}
        <div className="lg:col-span-8 flex flex-col space-y-1.5 min-h-0 overflow-hidden">
          {/* Top: One-Line Diagram */}
          <Pane
            title="Single-Line Grid Telemetry (IEEE 14-Bus)"
            className="flex-1 min-h-[300px]"
            noPadding
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={onNavigateToScenarios}
              >
                Scenario Lab
              </Button>
            }
          >
            <OneLineDiagram
              topology={topology}
              gridState={gridState}
              telemetry={telemetry}
              compromisedBuses={compromisedBuses}
              selectedBusId={4}
            />
          </Pane>

          {/* Bottom: Historian Trend Traces */}
          <div className="h-44 min-h-[176px] grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <Pane title="Trend: Bus 04 Voltage (Obs vs Est)" noPadding>
              <div className="p-1 h-full">
                <UPlotChart
                  data={miniTrendData as any}
                  pens={[
                    { id: 'obs', label: 'Observed', unit: 'p.u.', color: '#2B5C8A' },
                    { id: 'est', label: 'Estimated', unit: 'p.u.', color: '#6B7686', dash: [4, 2] },
                  ]}
                  height={132}
                />
              </div>
            </Pane>

            <Pane title="Trend: Frequency (COI Droop)" noPadding>
              <div className="p-1 h-full">
                <UPlotChart
                  data={[trendSteps, [50.0, 50.001, 50.002, 49.998, freqHz]] as any}
                  pens={[
                    { id: 'freq', label: 'Frequency', unit: 'Hz', color: '#2E7D4F' },
                  ]}
                  height={132}
                />
              </div>
            </Pane>
          </div>
        </div>

        {/* Right Column (4 cols = ~34%) */}
        <div className="lg:col-span-4 flex flex-col space-y-1.5 min-h-0 overflow-hidden">
          {/* Key Operational Values Property Grid */}
          <Pane title="Operational Telemetry & Risk">
            <PropertyGrid
              items={[
                {
                  label: 'Buses in Voltage Band (0.95–1.05 p.u.)',
                  value: `${busesInBand}/${busesCount}`,
                  provenance: 'CALC',
                  highlight: busesInBand === busesCount ? 'ok' : 'critical',
                },
                {
                  label: 'Lines below 100% Thermal Rating',
                  value: `${linesUnder100}/${linesCount}`,
                  provenance: 'CALC',
                  highlight: linesUnder100 === linesCount ? 'ok' : 'high',
                },
                {
                  label: 'Grid Center of Inertia Frequency',
                  value: formatFrequency(freqHz),
                  unit: 'Hz',
                  provenance: 'SIM',
                },
                {
                  label: 'Operational Risk Level',
                  value: riskLevel,
                  provenance: 'CALC',
                  statusBadge: <Status status={riskLevel} />,
                  highlight: riskLevel === 'CRITICAL' ? 'critical' : riskLevel === 'HIGH' ? 'high' : 'ok',
                },
                {
                  label: 'Cyber Integrity Map',
                  value: activeIncident ? 'SUSPECT DETECTED' : 'ALL RTUs TRUSTED',
                  provenance: 'MDL',
                  statusBadge: <Status status={activeIncident ? 'COMPROMISED' : 'OK'} />,
                },
              ]}
            />
          </Pane>

          {/* Active Alarms Pane */}
          <Pane
            title={`Active Alarms (${unackAlarms.length})`}
            noPadding
            className="flex-1 min-h-[140px]"
          >
            <Table
              data={unackAlarms.slice(0, 8)}
              columns={alarmColumns}
              emptyMessage="No unacknowledged alarms."
            />
          </Pane>

          {/* Active Incident / Resolution Action */}
          {activeIncident ? (
            <Pane title={`Active Incident: ${activeIncident.incident_id}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-main">
                    {activeIncident.attribution?.likely_cause}
                  </span>
                  <Status status={activeIncident.risk.risk_level} />
                </div>
                <p className="text-[11px] text-text-muted">
                  Affected: <strong>{activeIncident.affected_components.join(', ')}</strong> • Certainty: <strong>{activeIncident.certainty}</strong>
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => onOpenIncidentDetail(activeIncident)}
                >
                  Investigate & Mitigate Incident
                </Button>
              </div>
            </Pane>
          ) : (
            <Pane title="Incident Status">
              <div className="p-3 text-center text-text-subtle">
                No active cyber-physical incidents detected.
              </div>
            </Pane>
          )}
        </div>
      </div>
    </div>
  );
};
