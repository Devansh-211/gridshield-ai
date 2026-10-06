import React, { useState } from 'react';
import { Incident } from '../../types/api';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { AlertTriangle, ShieldAlert, ArrowRight, Filter } from 'lucide-react';

interface IncidentsViewProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  onSelectIncident,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredIncidents = incidents.filter((i) => {
    if (filterSeverity === 'ALL') return true;
    return i.risk.risk_level === filterSeverity;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-mono">
      {/* Header */}
      <div className="bg-surface border border-border rounded p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase">
              Incident Management & Audit Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Continuous episode tracking with deduplication, hypothesis attribution, and mitigation audit trails.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-background border border-slate-700 rounded p-1.5 text-xs text-white outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="bg-surface/50 border border-border rounded p-8 text-center text-slate-500 text-xs">
            No incidents found matching the selected filter. Run a scenario or demo to generate incidents.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.incident_id}
              className="bg-surface border border-border hover:border-slate-600 rounded p-4 flex items-center justify-between transition-colors shadow-sm group cursor-pointer"
              onClick={() => onSelectIncident(inc)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded group-hover:border-slate-700">
                  <ShieldAlert
                    className={`w-5 h-5 ${
                      inc.risk.risk_level === 'CRITICAL' || inc.risk.risk_level === 'HIGH'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{inc.incident_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {inc.classification}
                    </span>
                    <ProvenanceBadge provenance="MODEL" />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cause: <span className="text-cyan-300 font-bold">{inc.attribution.likely_cause}</span> • Targets:{' '}
                    {inc.affected_components.join(', ')} • Certainty:{' '}
                    <span className="text-amber-400 font-bold">{inc.certainty}</span> • Risk:{' '}
                    <span className="text-rose-400 font-bold">{inc.risk.risk_level}</span> ({inc.risk.overall_risk_score.toFixed(1)}/100)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    inc.status === 'RESOLVED'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                  }`}
                >
                  {inc.status}
                </span>
                <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
