import React, { useState, useEffect } from 'react';
import {
  GridTopology,
  GridState,
  ObservedTelemetryPoint,
  Incident,
  TimelineEvent,
  AlarmRecord,
} from '../types/api';
import {
  fetchGridTopology,
  fetchGridState,
  fetchLatestTelemetry,
  fetchIncidents,
  fetchAlarms,
  acknowledgeAlarm,
  createLiveSession,
  advanceLiveSession,
} from './api/client';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { GridTopologyView } from './views/GridTopologyView';
import { AlarmsView } from './views/AlarmsView';
import { IncidentsView } from './views/IncidentsView';
import { IncidentDetailModal } from './views/IncidentDetailModal';
import { TrendsView } from './views/TrendsView';
import { ScenarioLabView } from './views/ScenarioLabView';
import { AnalystPanel } from './views/AnalystPanel';
import { ModelSystemView } from './views/ModelSystemView';
import { ExplainedView } from './views/ExplainedView';
import { HelpDrawer } from './components/HelpDrawer';
import { Bell, AlertOctagon, Check } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [topology, setTopology] = useState<GridTopology | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [telemetry, setTelemetry] = useState<ObservedTelemetryPoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [top, state, tel, incs, alms] = await Promise.all([
        fetchGridTopology(),
        fetchGridState(),
        fetchLatestTelemetry(),
        fetchIncidents(),
        fetchAlarms().catch(() => [] as AlarmRecord[]),
      ]);
      setTopology(top);
      setGridState(state);
      setTelemetry(tel);
      setIncidents(incs);
      setAlarms(alms);
    } catch (err) {
      console.error('Failed to load digital twin state:', err);
    }
  };

  const handleAdvanceStep = async (steps: number) => {
    try {
      let runId = liveSessionId;
      if (!runId) {
        const session = await createLiveSession();
        runId = session.run_id;
        setLiveSessionId(runId);
      }
      const updated = await advanceLiveSession(runId, steps);
      setGridState(updated.grid_state);
      loadData();
    } catch (err) {
      console.error('Failed to advance live session:', err);
    }
  };

  const handleAcknowledgeAlarm = async (alarmId: any, note: string) => {
    try {
      await acknowledgeAlarm(String(alarmId), 'OPERATOR_1', note);
      loadData();
    } catch (err) {
      console.error('Failed to acknowledge alarm:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeAlarms = alarms.filter((a) => a.state === 'UNACK' || a.state === 'RTN_UNACK');
  const loudestAlarm = activeAlarms.find((a) => a.priority === 'CRITICAL') || activeAlarms[0];

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans select-none pb-10">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openIncidentsCount={incidents.filter((i) => i.status !== 'RESOLVED').length}
        activeAlarmsCount={activeAlarms.length}
        onAdvanceStep={handleAdvanceStep}
        onOpenHelp={() => setIsHelpOpen(true)}
        onDemoCompleted={loadData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'overview' && (
          <DashboardView
            topology={topology}
            gridState={gridState}
            telemetry={telemetry}
            incidents={incidents}
            alarms={alarms}
            events={events}
            onOpenIncidentDetail={(inc) => setSelectedIncident(inc)}
            onNavigateToScenarios={() => setActiveTab('scenarios')}
            onNavigateToExplained={() => setActiveTab('explained')}
          />
        )}

        {activeTab === 'grid' && (
          <GridTopologyView
            topology={topology}
            gridState={gridState}
          />
        )}

        {activeTab === 'alarms' && (
          <AlarmsView
            alarms={alarms as any}
            onAcknowledgeAlarm={handleAcknowledgeAlarm}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsView
            incidents={incidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsView />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioLabView
            onRunCompleted={() => {
              loadData();
              setActiveTab('overview');
            }}
          />
        )}

        {activeTab === 'analyst' && <AnalystPanel incidents={incidents} />}

        {activeTab === 'models' && <ModelSystemView />}

        {activeTab === 'explained' && (
          <ExplainedView
            onNavigateTab={(tab) => setActiveTab(tab.toLowerCase())}
            activeRunId={liveSessionId}
          />
        )}
      </main>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdated={loadData}
        />
      )}

      {/* Slide-out Glossary / Quick Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        currentTab={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        onNavigateToExplained={() => setActiveTab('explained')}
      />

      {/* Sticky Bottom Alarm Status Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs font-mono z-30">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Bell className={`w-3.5 h-3.5 ${activeAlarms.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            <span className="font-bold text-white">ALARMS:</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              {activeAlarms.length} ACTIVE
            </span>
          </div>

          {loudestAlarm && (
            <div className="hidden sm:flex items-center space-x-2 text-slate-300">
              <span className="text-slate-500">•</span>
              <span className="text-rose-400 font-bold">[{loudestAlarm.tag}]</span>
              <span className="truncate max-w-md text-slate-300">{loudestAlarm.description}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {activeAlarms.length > 0 && loudestAlarm && (
            <button
              onClick={() => handleAcknowledgeAlarm(loudestAlarm.id, 'Acked via quick bar')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[11px] font-bold flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>Ack Loudest</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('alarms')}
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold text-[11px]"
          >
            View All Alarms &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
