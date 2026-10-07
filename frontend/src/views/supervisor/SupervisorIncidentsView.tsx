import React, { useEffect, useState } from 'react';
import { fetchSupervisorIncidents } from '../../api/client';
import { SupervisorIncidentProjection } from '../../../types/api';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Info,
  Layers,
} from 'lucide-react';

export const SupervisorIncidentsView: React.FC = () => {
  const [incidents, setIncidents] = useState<SupervisorIncidentProjection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchSupervisorIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load supervisor incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 bg-app">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded bg-surface border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Supervisor Briefings
            </span>
            <span className="text-xs text-text-muted">
              {incidents.length} situation(s) on file
            </span>
          </div>
          <h1 className="text-base font-bold text-text-main mt-1">
            Plain-Language Incident Log &amp; Candidate Actions
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-xs text-text-muted py-12">
          Loading active incident briefings...
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-12 rounded bg-surface border border-border text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-text-main">No Incidents Detected</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            All regional substations and power transmission lines are operating normally.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {incidents.map((incident) => (
            <div
              key={incident.incident_id}
              className="p-6 rounded bg-surface border border-border shadow-sm space-y-5"
            >
              {/* Top Meta Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border-main">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-text-main">
                      {incident.incident_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        incident.severity_level === 'URGENT'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : incident.severity_level === 'NEEDS_ATTENTION'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}
                    >
                      {incident.severity_level.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-main mt-1">
                    {incident.status_summary}
                  </h3>
                </div>

                <div className="text-right text-[11px] text-text-muted">
                  <div>Environment: <strong className="text-blue-400">{incident.environment_badge_text}</strong></div>
                  <div>Provenance: {incident.provenance_summary}</div>
                </div>
              </div>

              {/* 4-Part Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. What is Happening */}
                <div className="p-4 rounded-lg bg-app border border-border-main space-y-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    1. What Is Happening
                  </h4>
                  <p className="text-xs text-text-main leading-relaxed">
                    {incident.what_is_happening}
                  </p>
                </div>

                {/* 2. How Sure We Are */}
                <div className="p-4 rounded-lg bg-app border border-border-main space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    2. How Sure We Are
                  </h4>
                  <p className="text-xs font-semibold text-text-main">
                    {incident.how_sure_we_are.plain_confidence_summary}
                  </p>
                  <div className="text-[11px] text-text-muted space-y-1">
                    <div>• {incident.how_sure_we_are.completeness_text}</div>
                    <div>• {incident.how_sure_we_are.agreement_text}</div>
                    <div>• {incident.how_sure_we_are.stability_text}</div>
                  </div>
                </div>

                {/* 3. What It Could Lead To */}
                <div className="p-4 rounded-lg bg-app border border-border-main space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    3. What It Could Lead To
                  </h4>
                  <p className="text-xs text-text-main leading-relaxed">
                    {incident.what_it_could_lead_to}
                  </p>
                </div>

                {/* 4. Options to Discuss */}
                <div className="p-4 rounded-lg bg-app border border-border-main space-y-2">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    4. Options Worth Discussing with a Technician
                  </h4>
                  {incident.options_to_discuss_with_technician.map((opt) => (
                    <div
                      key={opt.option_id}
                      className="p-3 rounded bg-surface border border-border-main space-y-1.5"
                    >
                      <div className="text-xs font-bold text-text-main">
                        {opt.option_title}
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        {opt.plain_action_summary}
                      </p>
                      <p className="text-[10px] text-amber-400/90 italic font-medium">
                        {opt.not_guaranteed_safe_notice}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Substations Involved */}
              {incident.affected_substations.length > 0 && (
                <div className="pt-3 border-t border-border-main flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-text-muted text-[11px] font-semibold">
                    Substations Involved:
                  </span>
                  {incident.affected_substations.map((sub) => (
                    <span
                      key={sub.substation_id}
                      className="px-2.5 py-1 rounded bg-app border border-border-main text-xs text-text-main"
                    >
                      <strong>{sub.friendly_name}</strong> ({sub.role}) — {sub.plain_status}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
