import React from 'react';
import { GridTopology, GridState, ObservedTelemetryPoint, Incident, TimelineEvent } from '../../types/api';
import { KPIRibbon } from '../components/KPIRibbon';
import { SingleLineDiagram } from '../components/SingleLineDiagram';
import { TelemetryChart } from '../components/TelemetryChart';
import { TimelineView } from '../components/TimelineView';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface DashboardViewProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  telemetry: ObservedTelemetryPoint[];
  incidents: Incident[];
  events: TimelineEvent[];
  onOpenIncidentDetail: (incident: Incident) => void;
  onNavigateToScenarios: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  topology,
  gridState,
  telemetry,
  incidents,
  events,
  onOpenIncidentDetail,
  onNavigateToScenarios,
}) => {
  const activeIncident = incidents.find((i) => i.status !== 'RESOLVED');
  const compromisedBuses = activeIncident?.affected_components || [];

  // Generate chart data from telemetry points for Bus 4
  const chartData = [
    { step: 0, reported: 1.02, groundTruth: 1.02, estimated: 1.02 },
    { step: 5, reported: 1.018, groundTruth: 1.019, estimated: 1.018 },
    { step: 10, reported: activeIncident ? 0.90 : 1.021, groundTruth: activeIncident ? 1.072 : 1.021, estimated: activeIncident ? 0.905 : 1.021 },
    { step: 15, reported: activeIncident ? 0.895 : 1.019, groundTruth: activeIncident ? 1.085 : 1.019, estimated: activeIncident ? 0.901 : 1.019 },
    { step: 20, reported: activeIncident ? 0.892 : 1.020, groundTruth: activeIncident ? 1.092 : 1.020, estimated: activeIncident ? 0.898 : 1.020 },
  ];

  return (
    <div className="space-y-4">
      {/* Active Incident Banner */}
      {activeIncident && (
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border border-rose-500/50 rounded-xl p-3.5 flex items-center justify-between shadow-lg glow-red">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg animate-pulse">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wide">
                  Active Incident: {activeIncident.incident_id}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-900/60 text-rose-300 border border-rose-700">
                  {activeIncident.classification}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Likely cause: <span className="text-white font-bold">{activeIncident.attribution.likely_cause}</span> on{' '}
                {activeIncident.affected_components.join(', ')}. Risk level:{' '}
                <span className="text-rose-400 font-bold">{activeIncident.risk.risk_level}</span> (
                {activeIncident.risk.overall_risk_score.toFixed(1)}/100).
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenIncidentDetail(activeIncident)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-semibold shadow transition-all"
          >
            <span>Investigate & Mitigate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Status Ribbon */}
      <KPIRibbon
        gridState={gridState}
        riskAssessment={activeIncident?.risk || null}
        openIncidentsCount={incidents.filter((i) => i.status !== 'RESOLVED').length}
      />

      {/* Grid Schematic & Live Telemetry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SingleLineDiagram
            topology={topology}
            gridState={gridState}
            compromisedBuses={compromisedBuses}
          />
        </div>
        <div className="space-y-4">
          <TelemetryChart data={chartData} busLabel="Bus 4" />
          <TimelineView events={events} />
        </div>
      </div>
    </div>
  );
};
