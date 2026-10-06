import React from 'react';
import { GridState, RiskAssessment, RiskLevel, BusState, LineState } from '../../types/api';
import { ShieldCheck, Zap, Activity, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';

interface KPIRibbonProps {
  gridState: GridState | null;
  riskAssessment: RiskAssessment | null;
  openIncidentsCount: number;
}

export const KPIRibbon: React.FC<KPIRibbonProps> = ({
  gridState,
  riskAssessment,
  openIncidentsCount,
}) => {
  const busesCount = gridState?.buses?.length || 14;
  const busesInBand =
    gridState?.buses?.filter((b: BusState) => b.vm_pu >= 0.95 && b.vm_pu <= 1.05).length ?? 14;
  const linesCount = gridState?.lines?.length || 20;
  const linesUnder100 =
    gridState?.lines?.filter((l: LineState) => l.loading_pct <= 100.0).length ?? 20;

  const freqHz = gridState?.frequency_hz ?? 60.0;
  const riskScore = riskAssessment?.overall_risk_score ?? 12.5;
  const riskLevel: RiskLevel = riskAssessment?.risk_level ?? 'LOW';

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/40';
      case 'HIGH':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-950/40 border-yellow-500/40';
      default:
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
      {/* 1. Voltage Stability KPI */}
      <div className="bg-surface/80 border border-border rounded-lg p-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Voltage Bounds</span>
          <ProvenanceBadge provenance="SIMULATED" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl font-mono font-bold text-white">
            {busesInBand}/{busesCount}
          </div>
          <span
            className={`text-xs font-mono font-medium ${
              busesInBand === busesCount ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {busesInBand === busesCount ? 'Nominal (0.95-1.05)' : 'Violations Detected'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-sm mt-2 overflow-hidden">
          <div
            className={`h-full ${
              busesInBand === busesCount ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${(busesInBand / busesCount) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. Thermal Line Loading KPI */}
      <div className="bg-surface/80 border border-border rounded-lg p-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Line Ratings</span>
          <ProvenanceBadge provenance="SIMULATED" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl font-mono font-bold text-white">
            {linesUnder100}/{linesCount}
          </div>
          <span
            className={`text-xs font-mono font-medium ${
              linesUnder100 === linesCount ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {linesUnder100 === linesCount ? '< 100% Loading' : 'Thermal Overload'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-sm mt-2 overflow-hidden">
          <div
            className={`h-full ${
              linesUnder100 === linesCount ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${(linesUnder100 / linesCount) * 100}%` }}
          />
        </div>
      </div>

      {/* 3. Frequency Stability */}
      <div className="bg-surface/80 border border-border rounded-lg p-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Grid Frequency</span>
          <ProvenanceBadge provenance="SIMULATED" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl font-mono font-bold text-white">
            {freqHz.toFixed(2)} <span className="text-xs text-slate-400">Hz</span>
          </div>
          <span
            className={`text-xs font-mono font-medium ${
              Math.abs(freqHz - 60.0) < 0.2 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            COI Droop Model
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-sm mt-2 overflow-hidden">
          <div
            className={`h-full ${
              Math.abs(freqHz - 60.0) < 0.2 ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, ((freqHz - 59.0) / 2.0) * 100))}%` }}
          />
        </div>
      </div>

      {/* 4. Operational Risk Score */}
      <div
        className={`border rounded-lg p-3 relative overflow-hidden transition-all ${getRiskColor(
          riskLevel
        )}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium opacity-80">Operational Risk</span>
          <ProvenanceBadge provenance="CALCULATED" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl font-mono font-bold">
            {riskScore.toFixed(1)} <span className="text-xs opacity-75">/100</span>
          </div>
          <span className="text-xs font-mono font-bold uppercase">{riskLevel}</span>
        </div>
        <div className="w-full bg-slate-900/60 h-1 rounded-sm mt-2 overflow-hidden">
          <div
            className={`h-full ${
              riskLevel === 'CRITICAL'
                ? 'bg-rose-500'
                : riskLevel === 'HIGH'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${riskScore}%` }}
          />
        </div>
      </div>

      {/* 5. Cyber Integrity & Incidents */}
      <div className="bg-surface/80 border border-border rounded-lg p-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Cyber Integrity</span>
          <ProvenanceBadge provenance="MODEL" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl font-mono font-bold text-white">
            {openIncidentsCount > 0 ? (
              <span className="text-rose-400">{openIncidentsCount} ACTIVE</span>
            ) : (
              <span className="text-emerald-400">SECURE</span>
            )}
          </div>
          <span className="text-xs font-mono text-slate-400">
            {openIncidentsCount > 0 ? 'Tamper Detected' : 'All RTUs Trusted'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-sm mt-2 overflow-hidden">
          <div
            className={`h-full ${openIncidentsCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: openIncidentsCount > 0 ? '100%' : '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
