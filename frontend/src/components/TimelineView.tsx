import React from 'react';
import { TimelineEvent } from '../../types/api';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Clock, Cpu, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface TimelineViewProps {
  events: TimelineEvent[];
  maxEvents?: number;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  maxEvents = 20,
}) => {
  const displayEvents = events.slice(-maxEvents).reverse();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ANOMALY_DETECTED':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'SCADA_CONTROL_ACTION':
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
      case 'INCIDENT_RESOLVED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SIMULATION_STARTED':
        return <Clock className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-surface/90 border border-border rounded p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            SOC Event Timeline ({events.length} Events)
          </h4>
        </div>
        <ProvenanceBadge provenance="OBSERVED" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[280px]">
        {displayEvents.length === 0 ? (
          <p className="text-xs font-mono text-slate-500 text-center py-6">
            No events recorded in current simulation session.
          </p>
        ) : (
          displayEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-background/90 border border-slate-800 rounded p-2.5 flex items-start space-x-2.5 text-xs font-mono transition-colors hover:border-slate-700"
            >
              <div className="p-1 rounded bg-slate-900 border border-slate-800 mt-0.5">
                {getEventIcon(evt.event_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 truncate">{evt.title}</span>
                  <span className="text-[10px] text-slate-400">t={evt.sim_time}s</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{evt.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
