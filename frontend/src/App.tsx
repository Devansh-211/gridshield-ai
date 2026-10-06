import React, { useState, useEffect } from 'react';
import {
  GridTopology,
  GridState,
  ObservedTelemetryPoint,
  Incident,
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
  resetSystem,
} from './api/client';
import { TopBar } from './features/shell/TopBar';
import { LeftNav, NavTabId } from './features/shell/LeftNav';
import { StatusBar } from './features/shell/StatusBar';
import { TooltipProvider } from './ui/Tooltip';
import { KitchenSinkView } from './features/kitchen/KitchenSinkView';
import { DashboardView } from './views/DashboardView';
import { GridTopologyView } from './views/GridTopologyView';
import { AlarmsView } from './views/AlarmsView';
import { IncidentsView } from './views/IncidentsView';
import { IncidentDetailModal } from './views/IncidentDetailModal';
import { TrendsView } from './views/TrendsView';
import { ScenarioLabView } from './views/ScenarioLabView';
import { ModelSystemView } from './views/ModelSystemView';
import { ExplainedView } from './views/ExplainedView';
import { HelpDrawer } from './components/HelpDrawer';
import { formatSimStepTime } from './lib/formatters';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId | string>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [topology, setTopology] = useState<GridTopology | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [telemetry, setTelemetry] = useState<ObservedTelemetryPoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [simStep, setSimStep] = useState<number>(0);
  const [dbLatencyMs, setDbLatencyMs] = useState<number>(38);
  const [dbHealthy, setDbHealthy] = useState<boolean>(true);

  // Toggle light/dark theme class on html document
  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadData = async () => {
    const start = performance.now();
    try {
      const [top, state, tel, incs, alms] = await Promise.all([
        fetchGridTopology(),
        fetchGridState(),
        fetchLatestTelemetry(),
        fetchIncidents(),
        fetchAlarms().catch(() => [] as AlarmRecord[]),
      ]);
      const latency = Math.round(performance.now() - start);
      setDbLatencyMs(latency > 0 ? latency : 32);
      setDbHealthy(true);

      setTopology(top);
      setGridState(state);
      setTelemetry(tel);
      setIncidents(incs);
      setAlarms(alms);
    } catch (err) {
      console.error('Failed to load digital twin state:', err);
      setDbHealthy(false);
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
      setSimStep((prev) => prev + steps);
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

  const handleResetSystem = async () => {
    try {
      await resetSystem();
      setLiveSessionId(null);
      setSimStep(0);
      loadData();
    } catch (err) {
      console.error('Failed to reset system:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const unackAlarms = alarms.filter((a) => a.state === 'UNACK' || a.state === 'RTN_UNACK');
  const hasCrit = unackAlarms.some((a) => a.priority === 'CRITICAL');
  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <TooltipProvider>
      <div className="w-screen h-screen flex flex-col bg-app text-text-main font-ui select-none overflow-hidden">
        {/* Top Bar (36px) */}
        <TopBar
          sessionId={liveSessionId}
          isRunning={liveSessionId !== null}
          simTime={formatSimStepTime(simStep)}
          onAdvanceStep={handleAdvanceStep}
          onReset={handleResetSystem}
          onOpenHelp={() => setIsHelpOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Center Workspace (LeftNav + Main Docked Area) */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          {/* Left Nav (168px) */}
          <LeftNav
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            unackAlarmsCount={unackAlarms.length}
            openIncidentsCount={openIncidents.length}
            hasCriticalAlarm={hasCrit}
          />

          {/* Main Content Body */}
          <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-app overflow-hidden">
            {activeTab === 'kitchen' && <KitchenSinkView />}

            {activeTab === 'overview' && (
              <DashboardView
                topology={topology}
                gridState={gridState}
                telemetry={telemetry}
                incidents={incidents}
                alarms={alarms}
                events={[]}
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

            {activeTab === 'models' && <ModelSystemView />}

            {activeTab === 'explained' && (
              <ExplainedView
                onNavigateTab={(tab) => setActiveTab(tab.toLowerCase())}
                activeRunId={liveSessionId}
              />
            )}
          </main>
        </div>

        {/* Status Bar (28px) */}
        <StatusBar
          alarms={alarms}
          dbLatencyMs={dbLatencyMs}
          dbHealthy={dbHealthy}
          onNavigateToAlarms={() => setActiveTab('alarms')}
          version="v1.0.0"
        />

        {/* Incident Detail Modal */}
        {selectedIncident && (
          <IncidentDetailModal
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
            onUpdated={loadData}
          />
        )}

        {/* Quick Help / Glossary Drawer */}
        <HelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentTab={typeof activeTab === 'string' ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : ''}
          onNavigateToExplained={() => setActiveTab('explained')}
        />
      </div>
    </TooltipProvider>
  );
};
