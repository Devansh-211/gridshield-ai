import React, { useState, useRef } from 'react';
import {
  GridTopology,
  GridState,
  BusState,
  LineState,
  ObservedTelemetryPoint,
} from '../../../types/api';
import { IEEE14_BUS_LAYOUT, IEEE14_LINE_LAYOUT, BusLayoutNode, LineLayoutEdge } from './layout.ipc14';
import { formatVoltage, formatLoading, formatPower } from '../../lib/formatters';

export interface OneLineDiagramProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  telemetry?: ObservedTelemetryPoint[];
  compromisedBuses?: string[];
  selectedBusId?: number | null;
  onSelectBus?: (busId: number) => void;
  selectedLineId?: number | null;
  onSelectLine?: (lineId: number) => void;
  showVoltages?: boolean;
  showFlows?: boolean;
  showLoading?: boolean;
  className?: string;
}

export const OneLineDiagram: React.FC<OneLineDiagramProps> = ({
  topology,
  gridState,
  telemetry = [],
  compromisedBuses = [],
  selectedBusId,
  onSelectBus,
  selectedLineId,
  onSelectLine,
  showVoltages = true,
  showFlows = false,
  showLoading = false,
  className = '',
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const busStateMap = new Map<number, BusState>();
  if (gridState?.buses) {
    gridState.buses.forEach((b: BusState) => busStateMap.set(b.bus_id, b));
  }

  const lineStateMap = new Map<number, LineState>();
  if (gridState?.lines) {
    gridState.lines.forEach((l: LineState) => lineStateMap.set(l.line_id, l));
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(2.5, Math.max(0.6, z + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const getBusStatus = (busId: number) => {
    const busName = `Bus ${busId}`;
    if (compromisedBuses.includes(busName)) {
      return { isCompromised: true, stroke: 'var(--compromised)', fill: 'var(--compromised)' };
    }
    const state = busStateMap.get(busId);
    const vm = state?.vm_pu ?? 1.0;
    if (vm < 0.95) {
      return { isLow: true, stroke: 'var(--alarm-high)', fill: 'var(--alarm-high)' };
    }
    if (vm > 1.05) {
      return { isHigh: true, stroke: 'var(--alarm-critical)', fill: 'var(--alarm-critical)' };
    }
    return { isNormal: true, stroke: 'var(--text)', fill: 'var(--text)' };
  };

  return (
    <div
      className={`relative w-full h-full bg-inset border border-border overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === '0') resetView();
      }}
    >
      {/* Zoom / Reset Tool Overlay */}
      <div className="absolute top-2 left-2 z-10 flex items-center space-x-1 bg-panel border border-border px-1.5 py-0.5 rounded-sm text-[11px] font-mono text-text-muted shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="px-1 hover:text-text-main"
          title="Zoom in (+)"
        >
          +
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="px-1 hover:text-text-main"
          title="Zoom out (-)"
        >
          −
        </button>
        <div className="w-[1px] h-3 bg-border mx-0.5" />
        <button
          onClick={resetView}
          className="px-1 hover:text-text-main"
          title="Reset zoom & pan (0)"
        >
          Reset (0)
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 900 480"
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 100ms ease-out',
        }}
      >
        <g id="grid-lines-layer">
          {IEEE14_LINE_LAYOUT.map((line: LineLayoutEdge) => {
            const isSelected = selectedLineId === line.id;
            const state = lineStateMap.get(line.id);
            const loading = state?.loading_pct ?? 35.0;
            const isOverloaded = loading > 100.0;

            // Compute SVG path string from waypoints
            const pathD = line.waypoints
              .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`)
              .join(' ');

            const strokeWidth = isSelected ? 3.5 : isOverloaded ? 3.0 : loading > 75 ? 2.5 : 1.5;
            const strokeColor = isOverloaded
              ? 'var(--alarm-critical)'
              : isSelected
              ? 'var(--accent)'
              : 'var(--text-2)';

            const midPt = line.waypoints[Math.floor(line.waypoints.length / 2)];

            return (
              <g
                key={`line-${line.id}`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLine?.(line.id);
                }}
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={line.isTransformer ? '5 3' : undefined}
                />

                {/* Transformer 2 Interlocking Circles */}
                {line.isTransformer && (
                  <g transform={`translate(${midPt[0]}, ${midPt[1]})`}>
                    <circle cx="-5" cy="0" r="7" fill="var(--bg-inset)" stroke={strokeColor} strokeWidth="1.5" />
                    <circle cx="5" cy="0" r="7" fill="none" stroke={strokeColor} strokeWidth="1.5" />
                  </g>
                )}

                {/* Optional Line Loading % Tag */}
                {showLoading && (
                  <text
                    x={midPt[0]}
                    y={midPt[1] - 8}
                    textAnchor="middle"
                    className="text-halo font-mono text-[10px] fill-text-main select-none pointer-events-none"
                  >
                    {formatLoading(loading)}%
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Bus Bars & Components Layer */}
        <g id="grid-buses-layer">
          {Object.values(IEEE14_BUS_LAYOUT).map((bus: BusLayoutNode) => {
            const isSelected = selectedBusId === bus.id;
            const status = getBusStatus(bus.id);
            const state = busStateMap.get(bus.id);
            const vm = state?.vm_pu ?? 1.0;

            const halfLen = bus.length / 2;
            const isHoriz = bus.orientation === 'horizontal';

            const x1 = isHoriz ? bus.x - halfLen : bus.x;
            const x2 = isHoriz ? bus.x + halfLen : bus.x;
            const y1 = isHoriz ? bus.y : bus.y - halfLen;
            const y2 = isHoriz ? bus.y : bus.y + halfLen;

            return (
              <g
                key={`bus-${bus.id}`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBus?.(bus.id);
                }}
              >
                {/* Selection Outline */}
                {isSelected && (
                  <rect
                    x={x1 - 6}
                    y={y1 - 6}
                    width={isHoriz ? bus.length + 12 : 16}
                    height={isHoriz ? 16 : bus.length + 12}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Compromised Cyber Outline */}
                {status.isCompromised && (
                  <rect
                    x={x1 - 8}
                    y={y1 - 8}
                    width={isHoriz ? bus.length + 16 : 20}
                    height={isHoriz ? 20 : bus.length + 16}
                    fill="none"
                    stroke="var(--compromised)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Bus Bar Solid Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={status.stroke}
                  strokeWidth="4.5"
                  strokeLinecap="square"
                />

                {/* Bus Tag Label */}
                <text
                  x={x1}
                  y={y1 - 8}
                  className="text-halo font-mono font-semibold text-[11px] fill-text-main select-none pointer-events-none"
                >
                  {bus.tag}
                </text>

                {/* Bus Voltage Label */}
                {showVoltages && (
                  <text
                    x={x1}
                    y={y1 + 16}
                    className={`text-halo font-mono text-[11px] select-none pointer-events-none ${
                      vm < 0.95
                        ? 'fill-[var(--alarm-high)] font-semibold'
                        : vm > 1.05
                        ? 'fill-[var(--alarm-critical)] font-semibold'
                        : 'fill-text-muted'
                    }`}
                  >
                    {formatVoltage(vm)} pu
                  </text>
                )}

                {/* Generator Symbol (Circle with G) */}
                {bus.hasGen && (
                  <g transform={`translate(${bus.x - 20}, ${bus.y - 30})`}>
                    <line x1="10" y1="20" x2="10" y2="30" stroke="var(--text-main)" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="10" fill="var(--bg-panel)" stroke="var(--text-main)" strokeWidth="1.5" />
                    <text x="10" y="14" textAnchor="middle" className="font-ui font-bold text-[11px] fill-text-main select-none pointer-events-none">
                      G
                    </text>
                  </g>
                )}

                {/* Synchronous Condenser (Circle with SC) */}
                {bus.hasCondenser && (
                  <g transform={`translate(${bus.x - 20}, ${bus.y - 30})`}>
                    <line x1="10" y1="20" x2="10" y2="30" stroke="var(--text-main)" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="10" fill="var(--bg-panel)" stroke="var(--text-main)" strokeWidth="1.5" />
                    <text x="10" y="13" textAnchor="middle" className="font-ui font-semibold text-[9px] fill-text-main select-none pointer-events-none">
                      SC
                    </text>
                  </g>
                )}

                {/* Load Symbol (Downward Triangle) */}
                {bus.hasLoad && (
                  <g transform={`translate(${bus.x + 15}, ${bus.y})`}>
                    <line x1="0" y1="0" x2="0" y2="15" stroke="var(--text-main)" strokeWidth="1.5" />
                    <polygon points="-5,15 5,15 0,23" fill="var(--text-main)" />
                  </g>
                )}

                {/* Shunt Capacitor (Parallel Plates) */}
                {bus.hasShunt && (
                  <g transform={`translate(${bus.x - 15}, ${bus.y})`}>
                    <line x1="0" y1="0" x2="0" y2="10" stroke="var(--text-main)" strokeWidth="1.5" />
                    <line x1="-6" y1="10" x2="6" y2="10" stroke="var(--text-main)" strokeWidth="1.5" />
                    <line x1="-6" y1="14" x2="6" y2="14" stroke="var(--text-main)" strokeWidth="1.5" />
                    <line x1="0" y1="14" x2="0" y2="20" stroke="var(--text-main)" strokeWidth="1.5" />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
