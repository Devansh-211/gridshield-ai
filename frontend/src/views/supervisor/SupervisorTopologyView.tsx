import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

export const SupervisorTopologyView: React.FC = () => {
  const [topology, setTopology] = useState<SupervisorGridTopologyProjection | null>(null);
  const [gridState, setGridState] = useState<SupervisorGridStateProjection | null>(null);
  const [selectedSubstation, setSelectedSubstation] = useState<SubstationTopologyPlain | null>(null);
  const [filterStrain, setFilterStrain] = useState<'ALL' | 'ELEVATED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [top, state] = await Promise.all([
        fetchSupervisorTopology(),
        fetchSupervisorGridState(),
      ]);
      setTopology(top);
      setGridState(state);
    } catch (err) {
      console.error('Failed to load supervisor topology:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !topology) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-text-muted text-xs">
        Loading plain grid canvas...
      </div>
    );
  }

  // Get reading for a substation
  const getSubstationReading = (id: number): SubstationReadingPlain | undefined => {
    return gridState?.substation_readings.find((r) => r.substation_id === id);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-app">
      {/* Left / Main Map Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border-main overflow-hidden">
        {/* Top Control Strip */}
        <div className="p-3 border-b border-border-main bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-main flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Regional Power Corridors
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold">
              {topology?.environment_badge_text || 'Practice Twin'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-[11px]">Filter Strain:</span>
              <button
                onClick={() => setFilterStrain('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterStrain === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-app text-text-muted hover:text-text-main'
                }`}
              >
                All Substations
              </button>
              <button
                onClick={() => setFilterStrain('ELEVATED')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterStrain === 'ELEVATED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-app text-text-muted hover:text-text-main'
                }`}
              >
                Elevated Strain Only
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Plain Grid Canvas (SVG) */}
        <div className="flex-1 relative bg-surface/50 overflow-auto flex items-center justify-center p-4">
          <svg
            className="w-full h-full max-w-[800px] max-h-[600px] select-none"
            viewBox="0 0 800 600"
          >
            {/* Plain Corridor Lines */}
            {topology?.corridors.map((c) => {
              // Find coordinates for from and to
              const fromSub = topology.substations.find(
                (s) => s.friendly_name === c.from_substation_name
              );
              const toSub = topology.substations.find(
                (s) => s.friendly_name === c.to_substation_name
              );
              if (!fromSub || !toSub) return null;

              const x1 = fromSub.coordinates[0] * 800;
              const y1 = fromSub.coordinates[1] * 600;
              const x2 = toSub.coordinates[0] * 800;
              const y2 = toSub.coordinates[1] * 600;

              const isArterial = c.capacity_tier.includes('Main Arterial');

              return (
                <g key={c.corridor_id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isArterial ? '#3b82f6' : '#64748b'}
                    strokeWidth={isArterial ? 4 : 2}
                    strokeOpacity={0.6}
                    strokeDasharray={isArterial ? 'none' : '4,2'}
                  />
                </g>
              );
            })}

            {/* Substation Nodes */}
            {topology?.substations.map((sub) => {
              const reading = getSubstationReading(sub.substation_id);
              const isElevated = reading?.strain_level === 'MEDIUM' || reading?.strain_level === 'HIGH';
              if (filterStrain === 'ELEVATED' && !isElevated) return null;

              const cx = sub.coordinates[0] * 800;
              const cy = sub.coordinates[1] * 600;
              const isSelected = selectedSubstation?.substation_id === sub.substation_id;

              const statusColor =
                reading?.status === 'DEVIATION' || reading?.strain_level === 'HIGH'
                  ? '#ef4444'
                  : reading?.strain_level === 'MEDIUM'
                  ? '#f59e0b'
                  : '#10b981';

              return (
                <g
                  key={sub.substation_id}
                  onClick={() => setSelectedSubstation(sub)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  {/* Selection pulse */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={24}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="4,2"
                      className="animate-spin"
                    />
                  )}

                  {/* Substation outer ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={16}
                    fill="#1e293b"
                    stroke={statusColor}
                    strokeWidth={3}
                  />

                  {/* Center icon / dot */}
                  <circle cx={cx} cy={cy} r={6} fill={statusColor} />

                  {/* Plain Name Label */}
                  <text
                    x={cx}
                    y={cy + 30}
                    textAnchor="middle"
                    className="text-[11px] font-semibold fill-current text-slate-200"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  >
                    {sub.friendly_name}
                  </text>
                  <text
                    x={cx}
                    y={cy + 42}
                    textAnchor="middle"
                    className="text-[9px] fill-current text-slate-400"
                  >
                    {sub.substation_role}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Plain Legend Strip */}
        <div className="p-3 border-t border-border-main bg-surface flex flex-wrap items-center justify-between gap-4 text-[11px] text-text-muted">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-text-main">Plain Strain Indicators:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Low Strain (Normal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Medium Strain (Watch)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>High Strain (Action Required)</span>
            </div>
          </div>
          <div>
            <span>Click any substation to view non-technical summary.</span>
          </div>
        </div>
      </div>

      {/* Right Drawer: Selected Substation Plain Details */}
      <div className="w-full md:w-80 bg-surface flex flex-col h-full border-t md:border-t-0 md:border-l border-border-main overflow-y-auto p-5 space-y-4">
        {selectedSubstation ? (
          <>
            <div className="pb-3 border-b border-border-main space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Substation Briefing
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  ID #{selectedSubstation.substation_id}
                </span>
              </div>
              <h2 className="text-sm font-bold text-text-main">
                {selectedSubstation.friendly_name}
              </h2>
              <p className="text-xs text-text-muted font-medium">
                {selectedSubstation.substation_role}
              </p>
            </div>

            {/* Plain Strain Reading */}
            {(() => {
              const reading = getSubstationReading(selectedSubstation.substation_id);
              return (
                <div className="p-3.5 rounded-lg bg-app border border-border-main space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-muted">Operational Strain</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        reading?.strain_level === 'HIGH'
                          ? 'bg-red-500/20 text-red-400'
                          : reading?.strain_level === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {reading?.strain_level || 'LOW'} STRAIN
                    </span>
                  </div>
                  <p className="text-xs text-text-main">
                    {reading?.plain_reading || 'Operating normally with balanced voltage pressure.'}
                  </p>
                  <div className="text-[10px] text-text-muted flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Data Source: {reading?.provenance_text || 'Cross-Checked Estimate'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Role & Description in Plain English */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-text-main">What this Substation Does:</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {selectedSubstation.plain_description}
              </p>
            </div>

            {/* Connected Corridors */}
            <div className="space-y-1.5 pt-3 border-t border-border-main">
              <h3 className="text-xs font-semibold text-text-main">Connected Power Routes:</h3>
              <div className="space-y-1 text-xs text-text-muted">
                {selectedSubstation.connected_corridor_ids.map((cid) => {
                  const corr = topology?.corridors.find((c) => c.corridor_id === cid);
                  return (
                    <div key={cid} className="p-2 rounded bg-app border border-border-main text-[11px]">
                      <div>{corr ? `${corr.from_substation_name} ↔ ${corr.to_substation_name}` : `Route #${cid}`}</div>
                      <div className="text-[10px] text-blue-400">{corr?.capacity_tier}</div>
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
