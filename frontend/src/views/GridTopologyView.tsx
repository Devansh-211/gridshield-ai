import React, { useState, useEffect } from 'react';
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
import { ProvenanceChip } from '../ui/ProvenanceChip';
import { OneLineDiagram } from '../features/grid/OneLineDiagram';
import { IEEE14_BUS_LAYOUT } from '../features/grid/layout.ipc14';
import { formatVoltage, formatPower, formatLoading } from '../lib/formatters';
import { ColumnDef } from '@tanstack/react-table';

interface GridTopologyViewProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  telemetry?: ObservedTelemetryPoint[];
  compromisedBuses?: string[];
  onAdvanceStep?: () => void;
  onResetSession?: () => void;
}

export const GridTopologyView: React.FC<GridTopologyViewProps> = ({
  topology,
  gridState,
  telemetry = [],
  compromisedBuses = [],
  onAdvanceStep,
  onResetSession,
}) => {
  const [selectedBusId, setSelectedBusId] = useState<number>(4);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('diagram');

  // Multi-layer toggles (§4)
  const [showVoltages, setShowVoltages] = useState<boolean>(true);
  const [showLoading, setShowLoading] = useState<boolean>(true);
  const [showAnomalyLayer, setShowAnomalyLayer] = useState<boolean>(false);
  const [showAttributionLayer, setShowAttributionLayer] = useState<boolean>(false);
  const [showDataQualityLayer, setShowDataQualityLayer] = useState<boolean>(false);

  // Inspector tabs
  const [inspectorTab, setInspectorTab] = useState<string>('measurements');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Deep-linking synchronization (?element=Bus4&t=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const elem = params.get('element');
      if (elem && elem.startsWith('Bus')) {
        const id = parseInt(elem.replace('Bus', '').trim());
        if (!isNaN(id) && id >= 1 && id <= 14) {
          setSelectedBusId(id);
        }
      }
    } catch {
      // Ignore URL parsing exceptions in static contexts
    }
  }, []);

  const handleSelectBus = (id: number) => {
    setSelectedBusId(id);
    setSelectedLineId(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('element', `Bus${id}`);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const selectedBusMeta = IEEE14_BUS_LAYOUT[selectedBusId] || IEEE14_BUS_LAYOUT[4];
  const busState = gridState?.buses?.find((b: BusState) => b.bus_id === selectedBusId);

  // Calculate live system strip metrics
  const vList = gridState?.buses?.map((b) => b.vm_pu) || [1.0];
  const minV = Math.min(...vList);
  const maxV = Math.max(...vList);
  const violationCount =
    (gridState?.buses?.filter((b) => b.vm_pu < 0.95 || b.vm_pu > 1.05).length || 0) +
    (gridState?.lines?.filter((l) => l.loading_pct > 100.0).length || 0);

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
      {/* System Strip (§4) */}
      <div className="h-7 px-3 bg-panel-alt border-b border-border flex items-center justify-between text-[11px] font-mono select-none">
        <div className="flex items-center space-x-4">
          <span>
            FREQ: <strong className="text-text-main">{gridState?.frequency_hz ? gridState.frequency_hz.toFixed(3) : '60.000'} Hz</strong>
          </span>
          <span>
            V_RANGE: <strong className="text-text-main">{minV.toFixed(3)}–{maxV.toFixed(3)} pu</strong>
          </span>
          <span>
            VIOLATIONS: <strong className={violationCount > 0 ? 'text-alarm-critical font-bold' : 'text-ok'}>{violationCount}</strong>
          </span>
          <span>
            FRESHNESS: <strong className="text-text-main">50ms</strong>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-text-muted">MODEL: ONLINE</span>
          <span className="px-1.5 py-0.2 bg-sim-badge-bg text-sim-badge-fg text-[10px] font-bold rounded-[2px]">
            SIMULATOR
          </span>
        </div>
      </div>

      {/* Grid Top Toolbar with Multi-Layer Toggles */}
      <Toolbar
        left={
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-text-main pr-1">Layers:</span>
            <button
              onClick={() => setShowVoltages(!showVoltages)}
              className={`px-2 py-0.5 rounded-[2px] border text-[11px] font-mono transition-colors ${
                showVoltages ? 'bg-accent-tint text-accent border-accent' : 'bg-panel text-text-muted border-border'
              }`}
            >
              Voltage {showVoltages ? '●' : '○'}
            </button>
            <button
              onClick={() => setShowLoading(!showLoading)}
              className={`px-2 py-0.5 rounded-[2px] border text-[11px] font-mono transition-colors ${
                showLoading ? 'bg-accent-tint text-accent border-accent' : 'bg-panel text-text-muted border-border'
              }`}
            >
              Loading % {showLoading ? '●' : '○'}
            </button>
            <button
              onClick={() => setShowAnomalyLayer(!showAnomalyLayer)}
              className={`px-2 py-0.5 rounded-[2px] border text-[11px] font-mono transition-colors ${
                showAnomalyLayer ? 'bg-accent-tint text-alarm-high border-alarm-high' : 'bg-panel text-text-muted border-border'
              }`}
            >
              Anomaly {showAnomalyLayer ? '●' : '○'}
            </button>
            <button
              onClick={() => setShowAttributionLayer(!showAttributionLayer)}
              className={`px-2 py-0.5 rounded-[2px] border text-[11px] font-mono transition-colors ${
                showAttributionLayer ? 'bg-accent-tint text-compromised border-compromised' : 'bg-panel text-text-muted border-border'
              }`}
            >
              Attribution {showAttributionLayer ? '●' : '○'}
            </button>
            <button
              onClick={() => setShowDataQualityLayer(!showDataQualityLayer)}
              className={`px-2 py-0.5 rounded-[2px] border text-[11px] font-mono transition-colors ${
                showDataQualityLayer ? 'bg-accent-tint text-text-main border-border-strong' : 'bg-panel text-text-muted border-border'
              }`}
            >
              Data Quality {showDataQualityLayer ? '●' : '○'}
            </button>
          </div>
        }
        right={
          <div className="flex items-center space-x-2">
            {/* Replay Scrubber Controls (§4) */}
            <div className="flex items-center space-x-1 border-r border-border pr-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onAdvanceStep?.()}
              >
                Step ▸
              </Button>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="h-6 text-[11px] font-mono bg-panel border border-border px-1 rounded-[2px]"
              >
                <option value={1}>1×</option>
                <option value={5}>5×</option>
                <option value={20}>20×</option>
              </select>
            </div>

            <Button
              variant={viewMode === 'diagram' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('diagram')}
            >
              Diagram
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        }
      />

      {/* Main Workspace Split (Diagram | Inspector) */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Diagram or Table Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-panel">
          {viewMode === 'diagram' ? (
            <OneLineDiagram
              topology={topology}
              gridState={gridState}
              telemetry={telemetry}
              compromisedBuses={compromisedBuses}
              selectedBusId={selectedBusId}
              onSelectBus={handleSelectBus}
              selectedLineId={selectedLineId}
              onSelectLine={setSelectedLineId}
              showVoltages={showVoltages}
              showLoading={showLoading}
              className="flex-1 h-full w-full"
            />
          ) : (
            <div className="flex-1 p-3 overflow-auto">
              <Table
                data={gridState?.buses || []}
                columns={busColumns}
                emptyMessage="No telemetry data received for buses."
              />
            </div>
          )}
        </div>

        {/* Right Inspector Pane (320px) (§4) */}
        <div className="w-80 flex flex-col bg-panel shrink-0 border-l border-border">
          <Pane
            title={`Inspector: ${selectedBusMeta.tag} (Bus ${selectedBusId})`}
            actions={<ProvenanceChip provenance="SIMULATED" />}
            className="h-full border-none"
            noPadding
          >
            <div className="flex flex-col h-full">
              <div className="px-3 pt-2 bg-panel-alt border-b border-border">
                <Tabs
                  tabs={[
                    { id: 'measurements', label: 'Measurements' },
                    { id: 'evidence', label: 'Evidence Fields' },
                    { id: 'alarms', label: 'Alarms' },
                  ]}
                  value={inspectorTab}
                  onValueChange={setInspectorTab}
                />
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-4">
                {inspectorTab === 'measurements' && (
                  <>
                    <PropertyGrid
                      items={[
                        { label: 'Bus Label', value: selectedBusMeta.name },
                        { label: 'IEEE Index', value: `Bus ${selectedBusId}` },
                        { label: 'Nominal kV', value: '69.0 kV' },
                        {
                          label: 'Voltage (p.u.)',
                          value: busState ? formatVoltage(busState.vm_pu) : '1.000',
                          provenance: 'SIM',
                        },
                        {
                          label: 'Voltage Angle',
                          value: busState ? `${busState.va_degree.toFixed(2)}°` : '0.00°',
                          provenance: 'SIM',
                        },
                        {
                          label: 'Active Power',
                          value: busState ? `${busState.p_mw.toFixed(1)} MW` : '0.0 MW',
                          provenance: 'SIM',
                        },
                        {
                          label: 'Reactive Power',
                          value: busState ? `${busState.q_mvar.toFixed(1)} MVAr` : '0.0 MVAr',
                          provenance: 'SIM',
                        },
                        {
                          label: 'Cyber Quality',
                          value: compromisedBuses.includes(`Bus ${selectedBusId}`)
                            ? 'QUARANTINED'
                            : 'TRUSTED (GOOD)',
                          provenance: 'OBS',
                        },
                      ]}
                    />

                    {compromisedBuses.includes(`Bus ${selectedBusId}`) && (
                      <div className="p-2.5 bg-alarm-critical/10 border border-alarm-critical text-alarm-critical rounded-[2px] text-[11px] space-y-1">
                        <strong className="block font-bold">CYBER-INTEGRITY ALERT</strong>
                        <p className="leading-relaxed">
                          Telemetry from Bus {selectedBusId} failed orthogonal residual consistency check. Quarantined from closed-loop AVR.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {inspectorTab === 'evidence' && (
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold text-text-muted uppercase">
                      Evidence Object Tracing (Rule R4)
                    </span>
                    <PropertyGrid
                      items={[
                        { label: 'State Residual (σ)', value: '0.14 σ', provenance: 'CALC' },
                        { label: 'Residual Threshold', value: '3.00 σ', provenance: 'CALC' },
                        { label: 'Anomaly Probability', value: '0.042', provenance: 'MDL' },
                        { label: 'Sensor Completeness', value: '100% (14/14)', provenance: 'CALC' },
                        { label: 'Data Quality Score', value: '0.985', provenance: 'CALC' },
                        { label: 'OOD Check', value: 'IN-BOUNDS', provenance: 'CALC' },
                      ]}
                    />
                  </div>
                )}

                {inspectorTab === 'alarms' && (
                  <div className="space-y-2">
                    {busState && (busState.vm_pu < 0.95 || busState.vm_pu > 1.05) ? (
                      <div className="p-2 border border-alarm-high bg-panel-alt rounded-[2px] space-y-1">
                        <div className="flex items-center justify-between">
                          <Status status="HIGH" label="VOLT VIOLATION" />
                          <span className="font-mono text-[10px] text-text-muted">ACTIVE</span>
                        </div>
                        <p className="text-[11px] text-text-main">
                          Bus voltage {busState.vm_pu.toFixed(3)} p.u. violates nominal limit band (0.95–1.05).
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-text-muted text-[11px]">
                        No active alarms for Bus {selectedBusId}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Pane>
        </div>
      </div>
    </div>
  );
};
