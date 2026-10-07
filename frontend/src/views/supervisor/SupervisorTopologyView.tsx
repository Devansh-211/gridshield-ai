import React, { useEffect, useState, useRef } from 'react';
import {
  fetchSupervisorTopology,
  fetchSupervisorGridState,
} from '../../api/client';
import {
  SupervisorGridTopologyProjection,
  SupervisorGridStateProjection,
  SubstationTopologyPlain,
  SubstationReadingPlain,
} from '../../../types/api';
import {
  Shield,
  Layers,
  MapPin,
  Activity,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { IEEE14_BUS_LAYOUT } from '../../features/grid/layout.ipc14';

export const SupervisorTopologyView: React.FC = () => {
  const [topology, setTopology] = useState<SupervisorGridTopologyProjection | null>(null);
  const [gridState, setGridState] = useState<SupervisorGridStateProjection | null>(null);
  const [selectedSubstation, setSelectedSubstation] = useState<SubstationTopologyPlain | null>(null);
  const [filterStrain, setFilterStrain] = useState<'ALL' | 'ELEVATED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Zoom and Pan controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const loadData = async () => {
    try {
      const [top, state] = await Promise.all([
        fetchSupervisorTopology(),
        fetchSupervisorGridState(),
      ]);
      setTopology(top);
      setGridState(state);

      // Default selection to first substation or elevated substation if none selected
      if (!selectedSubstation && top?.substations && top.substations.length > 0) {
        const elevated = top.substations.find((s: SubstationTopologyPlain) => {
          const r = state?.substation_readings?.find((sr: SubstationReadingPlain) => sr.substation_id === s.substation_id);
          return r?.strain_level === 'HIGH' || r?.strain_level === 'MEDIUM';
        });
        setSelectedSubstation(elevated || top.substations[0]);
      }
    } catch (err) {
      console.error('Failed to load supervisor topology:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Safe coordinate parser: handles both absolute 0..800 coords and normalized 0..1 fractions
  const getSubstationCoordinates = (sub?: SubstationTopologyPlain): [number, number] => {
    if (!sub) return [100, 100];
    let rawX = sub.coordinates?.[0];
    let rawY = sub.coordinates?.[1];

    // Fallback to IEEE layout if missing
    if (rawX === undefined || rawY === undefined) {
      const layoutNode = IEEE14_BUS_LAYOUT[sub.substation_id];
      rawX = layoutNode ? layoutNode.x : 100 + (sub.substation_id * 40);
      rawY = layoutNode ? layoutNode.y : 100 + (sub.substation_id * 30);
    }

    // Scale if normalized fraction (<= 1.0) or use direct pixel value
    const x = rawX <= 1.0 && rawX > 0 ? rawX * 800 : rawX;
    const y = rawY <= 1.0 && rawY > 0 ? rawY * 600 : rawY;
    return [Math.max(40, Math.min(860, x)), Math.max(40, Math.min(560, y))];
  };

  // Get reading for a substation
  const getSubstationReading = (id: number): SubstationReadingPlain | undefined => {
    return gridState?.substation_readings?.find((r) => r.substation_id === id);
  };

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

  if (isLoading && !topology) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-text-muted text-xs">
        Loading regional power grid map...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-app">
      {/* Left / Main Map Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden">
        {/* Top Control Strip */}
        <div className="p-3 border-b border-border bg-panel flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-main flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4 text-emerald-400" />
              Regional Power Corridors & Substations
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
              {topology?.environment_badge_text || 'Educational Twin'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-[11px]">Filter Strain:</span>
              <button
                onClick={() => setFilterStrain('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterStrain === 'ALL'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-panel-alt text-text-muted hover:text-text-main border border-border'
                }`}
              >
                All Substations ({topology?.substations?.length || 14})
              </button>
              <button
                onClick={() => setFilterStrain('ELEVATED')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterStrain === 'ELEVATED'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-panel-alt text-text-muted hover:text-text-main border border-border'
                }`}
              >
                Elevated Strain Only
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Plain Grid Canvas (SVG) */}
        <div
          className="flex-1 relative bg-app overflow-hidden select-none cursor-grab active:cursor-grabbing flex items-center justify-center p-4"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom / Pan Controls Overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 bg-panel border border-border px-2 py-1 rounded text-[11px] font-mono text-text-muted shadow-sm">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 hover:text-text-main hover:bg-surface rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-text-main min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1 hover:text-text-main hover:bg-surface rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-border mx-0.5" />
            <button
              onClick={resetView}
              className="flex items-center gap-1 px-1.5 py-0.5 hover:text-text-main hover:bg-surface rounded"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <svg
            className="w-full h-full max-w-[900px] max-h-[600px]"
            viewBox="0 0 900 600"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 100ms ease-out',
            }}
          >
            <defs>
              {/* Subtle grid background pattern */}
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-border/30" strokeWidth="0.5" />
              </pattern>
            </defs>

            <rect width="900" height="600" fill="url(#grid-pattern)" />

            {/* Plain Corridor Transmission Lines */}
            {topology?.corridors?.map((c) => {
              const fromSub = topology.substations?.find(
                (s) => s.friendly_name === c.from_substation_name || s.substation_id === c.corridor_id
              );
              const toSub = topology.substations?.find(
                (s) => s.friendly_name === c.to_substation_name
              );

              const [x1, y1] = getSubstationCoordinates(fromSub);
              const [x2, y2] = getSubstationCoordinates(toSub);

              const isArterial = c.capacity_tier.includes('Main Arterial');

              return (
                <g key={`corridor-${c.corridor_id}`}>
                  {/* Outer glow line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isArterial ? '#3b82f6' : '#64748b'}
                    strokeWidth={isArterial ? 4.5 : 2.5}
                    strokeOpacity={0.4}
                  />
                  {/* Inner line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isArterial ? '#60a5fa' : '#94a3b8'}
                    strokeWidth={isArterial ? 2.5 : 1.5}
                    strokeDasharray={isArterial ? undefined : '6 3'}
                  />
                </g>
              );
            })}

            {/* Substation Nodes */}
            {topology?.substations?.map((sub) => {
              const reading = getSubstationReading(sub.substation_id);
              const isElevated = reading?.strain_level === 'MEDIUM' || reading?.strain_level === 'HIGH';
              if (filterStrain === 'ELEVATED' && !isElevated) return null;

              const [cx, cy] = getSubstationCoordinates(sub);
              const isSelected = selectedSubstation?.substation_id === sub.substation_id;

              const statusColor =
                reading?.strain_level === 'HIGH' || reading?.status === 'DEVIATION'
                  ? '#ef4444'
                  : reading?.strain_level === 'MEDIUM'
                  ? '#f59e0b'
                  : '#10b981';

              return (
                <g
                  key={`substation-${sub.substation_id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSubstation(sub);
                  }}
                  className="cursor-pointer transition-transform group"
                >
                  {/* Selection Pulse Ring */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={26}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      className="animate-spin"
                    />
                  )}

                  {/* Node Background Glow */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={18}
                    fill={statusColor}
                    fillOpacity={0.15}
                  />

                  {/* Substation Outer Shell */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={15}
                    fill="#0f172a"
                    stroke={statusColor}
                    strokeWidth={3}
                  />

                  {/* Center Dot */}
                  <circle cx={cx} cy={cy} r={6} fill={statusColor} />

                  {/* Substation Tag Badge */}
                  <g transform={`translate(${cx}, ${cy - 22})`}>
                    <rect
                      x={-18}
                      y={-9}
                      width={36}
                      height={18}
                      rx={3}
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-slate-200"
                    >
                      S{sub.substation_id.toString().padStart(2, '0')}
                    </text>
                  </g>

                  {/* Plain Name Label */}
                  <text
                    x={cx}
                    y={cy + 28}
                    textAnchor="middle"
                    className="text-[11px] font-bold fill-slate-100 dark:fill-slate-100"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                  >
                    {sub.friendly_name}
                  </text>
                  <text
                    x={cx}
                    y={cy + 42}
                    textAnchor="middle"
                    className="text-[9.5px] font-medium fill-slate-400 dark:fill-slate-400"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  >
                    {sub.substation_role}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Plain Legend Strip */}
        <div className="p-3 border-t border-border bg-panel flex flex-wrap items-center justify-between gap-4 text-[11px] text-text-muted">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-text-main">Operating Strain:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm" />
              <span>Low Strain (Normal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-sm" />
              <span>Medium Strain (Watch)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shadow-sm" />
              <span>High Strain (Investigate)</span>
            </div>
          </div>
          <div className="text-[11px] text-text-muted">
            <span>💡 Click any substation icon on the map to inspect its real-time briefing.</span>
          </div>
        </div>
      </div>

      {/* Right Drawer: Selected Substation Plain Details */}
      <div className="w-full md:w-88 bg-panel flex flex-col h-full border-t md:border-t-0 md:border-l border-border overflow-y-auto p-5 space-y-4">
        {selectedSubstation ? (
          <>
            <div className="pb-3 border-b border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Regional Substation Briefing
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  Substation #{selectedSubstation.substation_id}
                </span>
              </div>
              <h2 className="text-base font-bold text-text-main pt-1">
                {selectedSubstation.friendly_name}
              </h2>
              <p className="text-xs text-text-muted font-medium">
                {selectedSubstation.substation_role}
              </p>
            </div>

            {/* Plain Strain Reading */}
            {(() => {
              const reading = getSubstationReading(selectedSubstation.substation_id);
              const strain = reading?.strain_level || 'LOW';
              return (
                <div className="p-4 rounded bg-app border border-border space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-muted">Current Strain Level</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        strain === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : strain === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {strain} STRAIN
                    </span>
                  </div>
                  <p className="text-xs text-text-main leading-relaxed font-medium">
                    {reading?.plain_reading || 'Operating normally with balanced voltage pressure and comfortable transmission loading.'}
                  </p>
                  <div className="text-[10px] text-text-muted flex items-center gap-1 pt-1 border-t border-border/50">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>Provenance: {reading?.provenance_text || 'Physics Mathematical Twin'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Role & Description in Plain English */}
            <div className="space-y-2 p-3.5 rounded bg-panel-alt border border-border">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                What this Substation Does:
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {selectedSubstation.plain_description}
              </p>
            </div>

            {/* Connected Corridors */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Connected Power Corridors:
              </h3>
              <div className="space-y-1.5 text-xs text-text-muted">
                {selectedSubstation.connected_corridor_ids?.map((cid) => {
                  const corr = topology?.corridors?.find((c) => c.corridor_id === cid);
                  return (
                    <div key={cid} className="p-2.5 rounded-lg bg-app border border-border text-[11px] space-y-0.5">
                      <div className="font-semibold text-text-main">
                        {corr ? `${corr.from_substation_name} ↔ ${corr.to_substation_name}` : `Power Corridor #${cid}`}
                      </div>
                      <div className="text-[10px] text-blue-400 font-medium">{corr?.capacity_tier || 'Regional Feeder Line'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted space-y-2">
            <MapPin className="w-8 h-8 text-text-muted/50" />
            <h4 className="text-xs font-bold text-text-main">No Substation Selected</h4>
            <p className="text-[11px]">
              Click on any regional substation node on the map to view its plain-language role and operating status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
