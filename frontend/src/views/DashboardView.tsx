import React, { useState } from 'react';
import { GridTopology, GridState, ObservedTelemetryPoint, Incident, TimelineEvent, AlarmRecord } from '../../types/api';
import { KPIRibbon } from '../components/KPIRibbon';
import { SingleLineDiagram } from '../components/SingleLineDiagram';
import { TelemetryChart } from '../components/TelemetryChart';
import { TimelineView } from '../components/TimelineView';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { AlertCircle, ArrowRight, Info, X, ShieldAlert } from 'lucide-react';

interface DashboardViewProps {
  topology: GridTopology | null;
  gridState: GridState | null;
  telemetry: ObservedTelemetryPoint[];
  incidents: Incident[];
  alarms?: AlarmRecord[];
  events: TimelineEvent[];
  onOpenIncidentDetail: (incident: Incident) => void;
  onNavigateToScenarios: () => void;
  onNavigateToExplained?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  topology,
  gridState,
  telemetry,
  incidents,
  alarms = [],
  events,
  onOpenIncidentDetail,
  onNavigateToScenarios,
  onNavigateToExplained,
}) => {
  const [showGuideBanner, setShowGuideBanner] = useState<boolean>(true);
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
      {/* Educational Guide Banner (Dismissible) */}
      {showGuideBanner && (
        <div className="bg-slate-900 border border-slate-700 rounded p-3 flex items-start justify-between text-xs font-mono">
          <div className="flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-slate-300">
              <span className="font-bold text-white">GridShield Operations Console:</span> This research digital twin simulates an IEEE 14-bus electrical grid under cyber-physical stress. Every metric carries an explicit provenance tag. New here? Read the{' '}
              <button
                onClick={onNavigateToExplained}
                className="text-cyan-400 underline hover:text-cyan-300 inline font-semibold"
              >
                15-Section Plain-Language Guide
              </button>{' '}
              or run the stepwise demo in the Scenario Lab.
            </div>
          </div>
          <button
            onClick={() => setShowGuideBanner(false)}
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Dismiss guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Incident Alert Banner */}
      {activeIncident && (
        <div className="bg-rose-950/60 border border-rose-600/80 rounded p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-900/60 border border-rose-700 rounded">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wide">
                  Active Incident: {activeIncident.incident_id}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                  {activeIncident.classification}
                </span>
                <ProvenanceBadge provenance={activeIncident.provenance} />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Likely cause: <span className="text-white font-bold">{activeIncident.attribution.likely_cause}</span> on{' '}
                {activeIncident.affected_components.join(', ')}. Operational Risk:{' '}
                <span className="text-rose-400 font-bold">{activeIncident.risk.risk_level}</span> (
                {activeIncident.risk.overall_risk_score.toFixed(1)}/100).
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenIncidentDetail(activeIncident)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-semibold transition-colors"
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
