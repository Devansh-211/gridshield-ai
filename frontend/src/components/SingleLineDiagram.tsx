import React, { useState } from 'react';
import { GridTopology, GridState, BusTopology, LineTopology, BusState, LineState } from '../../types/api';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Zap, Activity } from 'lucide-react';

interface SingleLineDiagramProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  compromisedBuses?: string[];
  onSelectBus?: (bus: BusTopology) => void;
  onSelectLine?: (line: LineTopology) => void;
}

export const SingleLineDiagram: React.FC<SingleLineDiagramProps> = ({
  topology,
  gridState,
  compromisedBuses = [],
  onSelectBus,
  onSelectLine,
}) => {
  const [selectedBusId, setSelectedBusId] = useState<number | null>(4); // Default to Bus 4
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);

  if (!topology || !topology.buses || topology.buses.length === 0) {
    return (
      <div className="h-[480px] flex items-center justify-center bg-surface/50 border border-border rounded-xl">
        <div className="text-center">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono text-slate-400">Loading IEEE 14-Bus Schematic...</p>
        </div>
      </div>
    );
  }

  const busMap = new Map<number, BusTopology>();
  topology.buses.forEach((b: BusTopology) => busMap.set(b.id, b));

  const busStateMap = new Map<number, BusState>();
  if (gridState?.buses) {
    gridState.buses.forEach((b: BusState) => busStateMap.set(b.bus_id, b));
  }

  const lineStateMap = new Map<number, LineState>();
  if (gridState?.lines) {
    gridState.lines.forEach((l: LineState) => lineStateMap.set(l.line_id, l));
  }

  const getBusColor = (busId: number) => {
    const busName = `Bus ${busId}`;
    if (compromisedBuses.includes(busName)) {
      return { fill: '#F43F5E', stroke: '#FB7185', text: 'text-rose-400', glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' };
    }
    const state = busStateMap.get(busId);
    const vm = state?.vm_pu ?? 1.0;
    if (vm < 0.95) {
      return { fill: '#38BDF8', stroke: '#0284C7', text: 'text-sky-400', glow: 'drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]' };
    }
    if (vm > 1.05) {
      return { fill: '#F43F5E', stroke: '#E11D48', text: 'text-rose-400', glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' };
    }
    return { fill: '#10B981', stroke: '#059669', text: 'text-emerald-400', glow: 'drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]' };
  };

  const selectedBus = selectedBusId ? busMap.get(selectedBusId) : null;
  const selectedBusState = selectedBus ? busStateMap.get(selectedBus.id) : null;

  return (
    <div className="bg-surface/90 border border-border rounded-xl p-4 relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            IEEE 14-Bus Single-Line Diagram
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>0.95-1.05 p.u.</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span>&lt; 0.95 p.u.</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse" />
            <span>&gt; 1.05 / FDI</span>
          </span>
          <ProvenanceBadge provenance="SIMULATED" />
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="relative w-full h-[460px] bg-background/80 border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 760 540"
          className="w-full h-full select-none"
          style={{ maxHeight: '100%' }}
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />

          {/* Transmission Lines & Transformers */}
          {topology.lines.map((line: LineTopology) => {
            const b1 = busMap.get(line.from_bus);
            const b2 = busMap.get(line.to_bus);
            if (!b1 || !b2) return null;

            const isSelected = selectedLineId === line.id;
            const lineState = lineStateMap.get(line.id);
            const loading = lineState?.loading_pct ?? 45.0;
            const isOverloaded = loading > 100.0;

            const strokeColor = isOverloaded
              ? '#F43F5E'
              : isSelected
              ? '#38BDF8'
              : '#334155';

            return (
              <g key={`line-${line.id}`} className="cursor-pointer group" onClick={() => {
                setSelectedLineId(line.id);
                if (onSelectLine) onSelectLine(line);
              }}>
                <line
                  x1={b1.x}
                  y1={b1.y}
                  x2={b2.x}
                  y2={b2.y}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3.5 : isOverloaded ? 3.0 : 1.8}
                  strokeDasharray={line.name.includes('Trafo') ? '4 3' : undefined}
                  className="transition-all group-hover:stroke-cyan-400"
                />
                <circle
                  cx={(b1.x + b2.x) / 2}
                  cy={(b1.y + b2.y) / 2}
                  r="3.5"
                  fill="#0F172A"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* Bus Nodes */}
          {topology.buses.map((bus: BusTopology) => {
            const isSelected = selectedBusId === bus.id;
            const isCompromised = compromisedBuses.includes(bus.name);
            const color = getBusColor(bus.id);
            const state = busStateMap.get(bus.id);
            const vm = state?.vm_pu ?? 1.0;

            return (
              <g
                key={`bus-${bus.id}`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedBusId(bus.id);
                  setSelectedLineId(null);
                  if (onSelectBus) onSelectBus(bus);
                }}
              >
                {(isSelected || isCompromised) && (
                  <circle
                    cx={bus.x}
                    cy={bus.y}
                    r="22"
                    fill="none"
                    stroke={isCompromised ? '#F43F5E' : '#06B6D4'}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ transformOrigin: `${bus.x}px ${bus.y}px`, animationDuration: '6s' }}
                  />
                )}

                <circle
                  cx={bus.x}
                  cy={bus.y}
                  r={bus.bus_type === 'SLACK' ? 14 : bus.bus_type === 'PV' ? 12 : 10}
                  fill="#0F172A"
                  stroke={color.stroke}
                  strokeWidth={isSelected ? 3 : 2}
                  className={color.glow}
                />

                <circle
                  cx={bus.x}
                  cy={bus.y}
                  r="5"
                  fill={color.fill}
                />

                <text
                  x={bus.x}
                  y={bus.y - 16}
                  textAnchor="middle"
                  className="fill-slate-200 text-[11px] font-mono font-bold select-none drop-shadow"
                >
                  {bus.name}
                </text>
                <text
                  x={bus.x}
                  y={bus.y + 22}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-semibold select-none ${
                    vm < 0.95 ? 'fill-sky-400' : vm > 1.05 ? 'fill-rose-400' : 'fill-emerald-400'
                  }`}
                >
                  {vm.toFixed(3)} p.u.
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Bus Inspector Box */}
        {selectedBus && (
          <div className="absolute top-3 right-3 bg-surface/95 border border-cyan-500/40 rounded-lg p-3 w-56 backdrop-blur shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
              <span className="font-bold text-white text-sm">{selectedBus.name}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800">
                {selectedBus.bus_type}
              </span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Voltage:</span>
                <span className="text-white">{selectedBus.vn_kv} kV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Actual Voltage:</span>
                <span
                  className={
                    selectedBusState && (selectedBusState.vm_pu < 0.95 || selectedBusState.vm_pu > 1.05)
                      ? 'text-rose-400 font-bold'
                      : 'text-emerald-400 font-bold'
                  }
                >
                  {selectedBusState?.vm_pu ? `${selectedBusState.vm_pu.toFixed(4)} p.u.` : '1.0200 p.u.'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Power (P):</span>
                <span className="text-white">
                  {selectedBusState?.p_mw ? `${selectedBusState.p_mw.toFixed(1)} MW` : '0.0 MW'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reactive Power (Q):</span>
                <span className="text-white">
                  {selectedBusState?.q_mvar ? `${selectedBusState.q_mvar.toFixed(1)} MVAr` : '0.0 MVAr'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Cyber Status:</span>
                <span
                  className={
                    compromisedBuses.includes(selectedBus.name)
                      ? 'text-rose-400 font-bold animate-pulse'
                      : 'text-emerald-400'
                  }
                >
                  {compromisedBuses.includes(selectedBus.name) ? 'COMPROMISED' : 'TRUSTED'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
