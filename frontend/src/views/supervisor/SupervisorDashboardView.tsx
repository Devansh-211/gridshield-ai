import React, { useEffect, useState } from 'react';
import {
  fetchSupervisorDashboard,
  fetchSupervisorGridState,
} from '../../api/client';
import {
  SupervisorDashboardData,
  SupervisorGridStateProjection,
  SupervisorIncidentProjection,
} from '../../../types/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Radio,
  Zap,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface SupervisorDashboardViewProps {
  onSelectIncident?: (incidentId: string) => void;
  onNavigateToTopology?: () => void;
  onNavigateToGlossary?: () => void;
}

export const SupervisorDashboardView: React.FC<SupervisorDashboardViewProps> = ({
  onSelectIncident,
  onNavigateToTopology,
  onNavigateToGlossary,
}) => {
  const [data, setData] = useState<SupervisorDashboardData | null>(null);
  const [gridState, setGridState] = useState<SupervisorGridStateProjection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [dash, state] = await Promise.all([
        fetchSupervisorDashboard(),
        fetchSupervisorGridState(),
      ]);
      setData(dash);
      setGridState(state);
    } catch (err) {
      console.error('Failed to load supervisor dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-text-muted text-xs">
        Loading plain-language grid briefing...
      </div>
    );
  }

  const isHealthy = data?.system_health === 'NORMAL';
  const hasUrgent = data?.recent_briefings.some((b) => b.severity_level === 'URGENT');

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Environment & Health Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border-main shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {data?.environment_badge_text || 'Practice Simulation'}
            </span>
            <span className="text-[10px] text-text-muted">
              Source: Cross-Checked Mathematical Simulation Twin
            </span>
          </div>
          <h1 className="text-lg font-bold text-text-main flex items-center gap-2">
            Power Grid Operational Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border text-xs font-semibold ${
              hasUrgent
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : isHealthy
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {hasUrgent ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isHealthy ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>
              {hasUrgent
                ? 'Urgent Attention Required'
                : isHealthy
                ? 'Grid Operating Stable'
                : 'Grid Under Observation'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Pulse Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Heartbeat */}
        <div className="p-4 rounded-xl bg-surface border border-border-main shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-400" />
              Grid Heartbeat
            </span>
            <span className="text-[10px] font-mono">50.0 Hz Standard</span>
          </div>
          <p className="text-xs text-text-main leading-relaxed">
            {data?.grid_frequency_status || 'Grid frequency is steady and balanced.'}
          </p>
        </div>

        {/* Corridor Strain */}
        <div className="p-4 rounded-xl bg-surface border border-border-main shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Equipment Strain
            </span>
            <button
              onClick={onNavigateToTopology}
              className="text-[10px] text-blue-400 hover:underline cursor-pointer"
            >
              View Map →
            </button>
          </div>
          <p className="text-xs text-text-main leading-relaxed">
            {data?.corridor_strain_status || 'All transmission corridors are operating within safe strain bounds.'}
          </p>
        </div>

        {/* Active Incidents */}
        <div className="p-4 rounded-xl bg-surface border border-border-main shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Active Situations
            </span>
            <span className="text-xs font-bold text-amber-400">
              {data?.active_incidents_count ?? 0}
            </span>
          </div>
          <p className="text-xs text-text-main leading-relaxed">
            {data?.active_incidents_count === 0
              ? 'No abnormal events or sensor tampering detected.'
              : `${data?.active_incidents_count} event(s) currently being monitored with plain briefings.`}
          </p>
        </div>
      </div>

      {/* Active Incident Plain Briefings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Active Plain Briefings (For Supervisors &amp; Decision Makers)
          </h2>
          {onNavigateToGlossary && (
            <button
              onClick={onNavigateToGlossary}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Plain Glossary
            </button>
          )}
        </div>

        {(!data?.recent_briefings || data.recent_briefings.length === 0) ? (
          <div className="p-8 rounded-xl bg-surface border border-border-main text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-text-main">No Active Grid Disruptions</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              The mathematical twin is running normally. All substations and transmission lines are cross-checked and verified.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.recent_briefings.map((briefing) => (
              <div
                key={briefing.incident_id}
                className="p-5 rounded-xl bg-surface border border-border-main shadow-sm space-y-4 hover:border-blue-500/40 transition-colors"
              >
                {/* Briefing Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border-main">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-main">
                        {briefing.incident_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          briefing.severity_level === 'URGENT'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : briefing.severity_level === 'NEEDS_ATTENTION'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}
                      >
                        {briefing.severity_level.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-text-main mt-1">
                      {briefing.status_summary}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-text-muted">
                      {briefing.provenance_summary}
                    </span>
                  </div>
                </div>

                {/* 4-Part Structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. What is Happening */}
                  <div className="p-3.5 rounded-lg bg-app border border-border-main space-y-1.5">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      1. What Is Happening
                    </span>
                    <p className="text-xs text-text-main leading-relaxed">
                      {briefing.what_is_happening}
                    </p>
                  </div>

                  {/* 2. How Sure We Are */}
                  <div className="p-3.5 rounded-lg bg-app border border-border-main space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      2. How Sure We Are
                    </span>
                    <p className="text-xs font-semibold text-text-main">
                      {briefing.how_sure_we_are.plain_confidence_summary}
                    </p>
                    <div className="text-[11px] text-text-muted space-y-0.5">
                      <div>• {briefing.how_sure_we_are.completeness_text}</div>
                      <div>• {briefing.how_sure_we_are.agreement_text}</div>
                      <div>• {briefing.how_sure_we_are.stability_text}</div>
                    </div>
                  </div>

                  {/* 3. What It Could Lead To */}
                  <div className="p-3.5 rounded-lg bg-app border border-border-main space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      3. What It Could Lead To
                    </span>
                    <p className="text-xs text-text-main leading-relaxed">
                      {briefing.what_it_could_lead_to}
                    </p>
                  </div>

                  {/* 4. Options Worth Discussing */}
                  <div className="p-3.5 rounded-lg bg-app border border-border-main space-y-2">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      4. Options Worth Discussing with a Technician
                    </span>
                    {briefing.options_to_discuss_with_technician.map((opt) => (
                      <div key={opt.option_id} className="p-2.5 rounded bg-surface border border-border-main space-y-1">
                        <div className="text-xs font-bold text-text-main flex items-center justify-between">
                          <span>{opt.option_title}</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                          {opt.plain_action_summary}
                        </p>
                        <p className="text-[10px] text-amber-400/90 italic">
                          {opt.not_guaranteed_safe_notice}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Affected Substations list */}
                {briefing.affected_substations.length > 0 && (
                  <div className="pt-2 border-t border-border-main flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-text-muted text-[11px] font-semibold">
                      Key Substations Involved:
                    </span>
                    {briefing.affected_substations.map((sub) => (
                      <span
                        key={sub.substation_id}
                        className="px-2 py-0.5 rounded bg-surface border border-border-main text-[11px] text-text-main"
                      >
                        {sub.friendly_name} ({sub.role}) — {sub.plain_status}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety & Educational Twin Non-Operability Notice */}
      <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-text-muted leading-relaxed">
        <strong className="text-blue-300">Decision-Support Notice:</strong> GridShield AI provides
        educational simulations, detection translations, and decision support. It does not replace certified
        system operators or protection relays. Candidate options carry operational trade-offs and must be verified
        with engineering personnel before live field execution.
      </div>
    </div>
  );
};
