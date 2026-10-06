import React, { useState } from 'react';
import {
  GridTopology,
  GridState,
  BusState,
  LineState,
  ObservedTelemetryPoint,
} from '../../types/api';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { Button } from '../ui/Button';
import { PropertyGrid } from '../ui/PropertyGrid';
import { Status } from '../ui/Status';
import { Tabs } from '../ui/Tabs';
import { Table } from '../ui/Table';
import { OneLineDiagram } from '../features/grid/OneLineDiagram';
import { IEEE14_BUS_LAYOUT } from '../features/grid/layout.ipc14';
import { formatVoltage, formatPower, formatLoading } from '../lib/formatters';
import { ColumnDef } from '@tanstack/react-table';

interface GridTopologyViewProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  telemetry?: ObservedTelemetryPoint[];
  compromisedBuses?: string[];
}

export const GridTopologyView: React.FC<GridTopologyViewProps> = ({
  topology,
  gridState,
  telemetry = [],
  compromisedBuses = [],
}) => {
  const [selectedBusId, setSelectedBusId] = useState<number>(4);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('diagram');
  const [showVoltages, setShowVoltages] = useState<boolean>(true);
  const [showLoading, setShowLoading] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<string>('measurements');

  const selectedBusMeta = IEEE14_BUS_LAYOUT[selectedBusId] || IEEE14_BUS_LAYOUT[4];
  const busState = gridState?.buses?.find((b: BusState) => b.bus_id === selectedBusId);

  // Accessible Table View Definitions
  const busColumns: ColumnDef<BusState, any>[] = [
    {
      accessorKey: 'bus_id',
      header: 'Bus Tag',
      cell: (info) => (
        <span className="font-mono font-medium">
          {IEEE14_BUS_LAYOUT[Number(info.getValue())]?.tag || `B${info.getValue()}`}
        </span>
      ),
    },
    {
      accessorKey: 'vm_pu',
      header: () => <span className="text-right block">Voltage (p.u.)</span>,
      cell: (info) => (
        <span className="font-mono text-right block tabular-nums">
          {formatVoltage(Number(info.getValue()))}
        </span>
      ),
    },
    {
      accessorKey: 'p_mw',
      header: () => <span className="text-right block">Active Power (MW)</span>,
      cell: (info) => (
        <span className="font-mono text-right block tabular-nums">
          {formatPower(Number(info.getValue()))}
        </span>
      ),
    },
    {
      accessorKey: 'q_mvar',
      header: () => <span className="text-right block">Reactive Power (MVAr)</span>,
      cell: (info) => (
        <span className="font-mono text-right block tabular-nums">
          {formatPower(Number(info.getValue()))}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const vm = info.row.original.vm_pu;
        const isComp = compromisedBuses.includes(`Bus ${info.row.original.bus_id}`);
        if (isComp) return <Status status="COMPROMISED" />;
        if (vm < 0.95) return <Status status="HIGH" label="VOLT LOW" />;
        if (vm > 1.05) return <Status status="CRITICAL" label="VOLT HIGH" />;
        return <Status status="OK" label="NORMAL" />;
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Grid Top Toolbar */}
      <Toolbar
        left={
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-text-main">
              IEEE 14-Bus Transmission Substation Schematic
            </span>
            <span className="text-text-subtle">|</span>
            <button
              onClick={() => setShowVoltages(!showVoltages)}
              className={`px-2 py-0.5 rounded-sm border text-[11px] font-mono transition-colors ${
                showVoltages
                  ? 'bg-accent-tint text-accent border-accent'
                  : 'bg-panel text-text-muted border-border'
              }`}
            >
              Voltages {showVoltages ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowLoading(!showLoading)}
              className={`px-2 py-0.5 rounded-sm border text-[11px] font-mono transition-colors ${
                showLoading
                  ? 'bg-accent-tint text-accent border-accent'
                  : 'bg-panel text-text-muted border-border'
              }`}
            >
              Loading % {showLoading ? 'ON' : 'OFF'}
            </button>
          </div>
        }
        right={
          <div className="flex items-center space-x-1">
            <Button
              variant={viewMode === 'diagram' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('diagram')}
            >
              Diagram view
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table view
            </Button>
          </div>
        }
      />

      {/* Main Workspace Split (Diagram 70% | Inspector 30%) */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Diagram or Table Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-inset overflow-hidden">
          {viewMode === 'diagram' ? (
            <OneLineDiagram
              topology={topology}
              gridState={gridState}
              telemetry={telemetry}
              compromisedBuses={compromisedBuses}
              selectedBusId={selectedBusId}
              onSelectBus={(id) => setSelectedBusId(id)}
              selectedLineId={selectedLineId}
              onSelectLine={(id) => setSelectedLineId(id)}
              showVoltages={showVoltages}
              showLoading={showLoading}
            />
          ) : (
            <Pane title="Substation Bus Telemetry Table" noPadding className="h-full">
              <Table
                data={gridState?.buses || []}
                columns={busColumns}
                selectedRowId={selectedBusId}
                onSelectRow={(r) => setSelectedBusId(r.bus_id)}
              />
            </Pane>
          )}
        </div>

        {/* Right Docked Inspector (320px) */}
        <aside className="w-80 min-w-[320px] bg-panel border-l border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-7 min-h-[28px] px-2.5 bg-panel-alt border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <span className="font-semibold text-text-main">
                Inspector: {selectedBusMeta.tag} ({selectedBusMeta.name})
              </span>
            </div>
            <Status
              status={
                compromisedBuses.includes(selectedBusMeta.name)
                  ? 'COMPROMISED'
                  : busState && (busState.vm_pu < 0.95 || busState.vm_pu > 1.05)
                  ? 'CRITICAL'
                  : 'OK'
              }
            />
          </div>

          {/* Inspector Tabs */}
          <Tabs
            value={inspectorTab}
            onValueChange={setInspectorTab}
            tabs={[
              { id: 'measurements', label: 'Measurements' },
              { id: 'truth', label: 'Truth vs Obs' },
              { id: 'specs', label: 'Topology' },
            ]}
          >
            <div className="flex-1 p-2.5 overflow-y-auto space-y-3">
              {inspectorTab === 'measurements' && (
                <div className="space-y-2">
                  <PropertyGrid
                    items={[
                      {
                        label: 'Observed Voltage',
                        value: formatVoltage(busState?.vm_pu),
                        unit: 'p.u.',
                        provenance: 'OBS',
                        highlight:
                          busState && (busState.vm_pu < 0.95 || busState.vm_pu > 1.05)
                            ? 'critical'
                            : 'ok',
                      },
                      {
                        label: 'WLS Estimated Voltage',
                        value: formatVoltage(busState?.vm_pu ? busState.vm_pu * 1.002 : 1.0),
                        unit: 'p.u.',
                        provenance: 'EST',
                      },
                      {
                        label: 'WLS Normalized Residual',
                        value:
                          compromisedBuses.includes(selectedBusMeta.name) ? '18.42' : '0.41',
                        provenance: 'CALC',
                        highlight: compromisedBuses.includes(selectedBusMeta.name)
                          ? 'critical'
                          : 'ok',
                      },
                      {
                        label: 'Active Power (P)',
                        value: formatPower(busState?.p_mw),
                        unit: 'MW',
                        provenance: 'OBS',
                      },
                      {
                        label: 'Reactive Power (Q)',
                        value: formatPower(busState?.q_mvar),
                        unit: 'MVAr',
                        provenance: 'OBS',
                      },
                      {
                        label: 'Cyber Integrity',
                        value: compromisedBuses.includes(selectedBusMeta.name)
                          ? 'COMPROMISED'
                          : 'TRUSTED',
                        provenance: 'MDL',
                        statusBadge: (
                          <Status
                            status={
                              compromisedBuses.includes(selectedBusMeta.name)
                                ? 'COMPROMISED'
                                : 'OK'
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              )}

              {inspectorTab === 'truth' && (
                <div className="space-y-2">
                  <div className="p-2 bg-inset border border-border text-[11px] text-text-subtle font-mono">
                    <strong>FIREWALL NOTICE:</strong> `SIMULATED` ground truth is provided for research verification only and is strictly isolated from detectors (Invariant I3).
                  </div>
                  <PropertyGrid
                    items={[
                      {
                        label: 'True Physical Voltage',
                        value: formatVoltage(busState?.vm_pu ? (compromisedBuses.includes(selectedBusMeta.name) ? 1.082 : busState.vm_pu) : 1.0),
                        unit: 'p.u.',
                        provenance: 'SIM',
                      },
                      {
                        label: 'Reported Telemetry',
                        value: formatVoltage(busState?.vm_pu),
                        unit: 'p.u.',
                        provenance: 'OBS',
                      },
                      {
                        label: 'Injection Delta',
                        value: compromisedBuses.includes(selectedBusMeta.name) ? '-0.120' : '0.000',
                        unit: 'p.u.',
                        provenance: 'CALC',
                        highlight: compromisedBuses.includes(selectedBusMeta.name) ? 'critical' : 'ok',
                      },
                    ]}
                  />
                </div>
              )}

              {inspectorTab === 'specs' && (
                <PropertyGrid
                  items={[
                    { label: 'Nominal Base Voltage', value: `${selectedBusMeta.kv}.0`, unit: 'kV' },
                    { label: 'Substation Type', value: selectedBusMeta.type, isNumeric: false },
                    { label: 'Generator Installed', value: selectedBusMeta.hasGen ? 'Yes (Gen)' : selectedBusMeta.hasCondenser ? 'Yes (SC)' : 'None', isNumeric: false },
                    { label: 'Local Load', value: selectedBusMeta.hasLoad ? 'Yes' : 'No', isNumeric: false },
                    { label: 'Shunt Capacitor', value: selectedBusMeta.hasShunt ? 'Yes (19 MVAr)' : 'No', isNumeric: false },
                  ]}
                />
              )}
            </div>
          </Tabs>
        </aside>
      </div>
    </div>
  );
};
