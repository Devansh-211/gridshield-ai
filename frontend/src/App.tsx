import React, { useState, useEffect, useRef } from 'react';
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
  stepGrid,
  resetSystem,
} from './api/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './features/auth/LoginView';
import { PreviewBanner } from './features/auth/PreviewBanner';
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
import { SupervisorDashboardView } from './views/supervisor/SupervisorDashboardView';
import { SupervisorTopologyView } from './views/supervisor/SupervisorTopologyView';
import { SupervisorIncidentsView } from './views/supervisor/SupervisorIncidentsView';
import { SupervisorGlossaryView } from './views/supervisor/SupervisorGlossaryView';
import { AdminConsoleView } from './views/admin/AdminConsoleView';
import { HelpDrawer } from './components/HelpDrawer';
import { NetworkImporterModal } from './features/network/NetworkImporterModal';
import { SensorConfigModal } from './features/sensors/SensorConfigModal';
import { formatSimStepTime } from './lib/formatters';

const WorkbenchContent: React.FC = () => {
  const { user, isLoading, isSupervisor, isAdmin, isTechnician } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId | string>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [topology, setTopology] = useState<GridTopology | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [telemetry, setTelemetry] = useState<ObservedTelemetryPoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isSensorsOpen, setIsSensorsOpen] = useState<boolean>(false);

  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const liveSessionIdRef = useRef<string | null>(null);
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const isAdvancingRef = useRef<boolean>(false);

  const [dbLatencyMs, setDbLatencyMs] = useState<number>(38);
  const [dbHealthy, setDbHealthy] = useState<boolean>(true);

  // Set default tab when role changes
  useEffect(() => {
    if (isAdmin) {
      setActiveTab('admin');
    } else {
      setActiveTab('overview');
    }
  }, [isAdmin, isSupervisor]);

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

  const [telemetryHistory, setTelemetryHistory] = useState<Array<{ step: number; values: Record<string, number> }>>([]);

  const loadData = async () => {
    if (!user) return;
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

      if (state) {
        const step = state.step ?? simStep;
        const b04 = state.buses?.find((b) => b.bus_id === 4)?.vm_pu ?? 1.0;
        const b02 = state.buses?.find((b) => b.bus_id === 2)?.vm_pu ?? 1.0;
        const b01 = state.buses?.find((b) => b.bus_id === 1)?.vm_pu ?? 1.0;
        const l01_02 = state.lines?.find((l) => l.line_id === 1 || l.line_id === 0)?.loading_pct ?? 50.0;
        const l02_05 = state.lines?.find((l) => l.line_id === 2)?.loading_pct ?? 40.0;
        const freq = state.frequency_hz ?? 50.0;

        setTelemetryHistory((prev) => {
          const exists = prev.some((p) => p.step === step);
          if (exists) return prev;
          const updated = [
            ...prev,
            {
              step,
              values: {
                b04_v: b04,
                b02_v: b02,
                b01_v: b01,
                l01_02_load: l01_02,
                l02_05_load: l02_05,
                freq_hz: freq,
              },
            },
          ];
          return updated.slice(-60);
        });
      }
    } catch (err) {
      console.error('Failed to load digital twin state:', err);
      setDbHealthy(false);
    }
  };

  const handleAdvanceStep = async (steps: number = 1) => {
    try {
      let runId = liveSessionIdRef.current;
      if (!runId) {
        const session = await createLiveSession();
        runId = session.run_id || 'RUN_LIVE';
        liveSessionIdRef.current = runId;
        setLiveSessionId(runId);
      }
      const updated = await advanceLiveSession(runId, steps);
      if (updated?.sim_step !== undefined) {
        setSimStep(updated.sim_step);
      } else {
        setSimStep((prev) => prev + steps);
      }
      if (updated?.grid_state) {
        setGridState(updated.grid_state);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to advance live session:', err);
    }
  };

  const handleAcknowledgeAlarm = async (alarmId: any, note: string) => {
    try {
      await acknowledgeAlarm(String(alarmId), user?.username || 'OPERATOR_1', note);
      loadData();
    } catch (err) {
      console.error('Failed to acknowledge alarm:', err);
    }
  };

  const handleResetSystem = async () => {
    try {
      await resetSystem();
      liveSessionIdRef.current = null;
      setLiveSessionId(null);
      setSimStep(0);
      setTelemetryHistory([]);
      loadData();
    } catch (err) {
      console.error('Failed to reset system:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  // Continuous active simulation loop
  useEffect(() => {
    if (!user || !isSimPlaying) {
      // Fallback polling when paused
      if (user && !isSimPlaying) {
        const fallbackInterval = setInterval(loadData, 4000);
        return () => clearInterval(fallbackInterval);
      }
      return;
    }

    const intervalMs = Math.max(200, Math.floor(1000 / simSpeed));
    const timer = setInterval(async () => {
      if (isAdvancingRef.current) return;
      isAdvancingRef.current = true;
      try {
        await handleAdvanceStep(1);
      } catch (err) {
        console.error('Auto-advance simulation step error:', err);
      } finally {
        isAdvancingRef.current = false;
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [user, isSimPlaying, simSpeed]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-app text-text-muted text-xs">
        Connecting to GridShield AI Workbench...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const unackAlarms = alarms.filter((a) => a.state === 'UNACK' || a.state === 'ACTIVE_UNACK' || a.state === 'RTN_UNACK');
  const hasCrit = unackAlarms.some((a) => a.priority === 'CRITICAL');
  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <div className="w-screen h-screen flex flex-col bg-app text-text-main font-ui select-none overflow-hidden">
      {/* Persistent Admin Preview Mode Banner */}
      <PreviewBanner />

      {/* Top Bar (40px) */}
      <TopBar
        sessionId={liveSessionId}
        isRunning={isSimPlaying}
        isSimPlaying={isSimPlaying}
        simSpeed={simSpeed}
        onTogglePlay={() => setIsSimPlaying((prev) => !prev)}
        onChangeSpeed={(spd) => setSimSpeed(spd)}
        simTime={formatSimStepTime(simStep)}
        simStep={simStep}
        onAdvanceStep={handleAdvanceStep}
        onReset={handleResetSystem}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSensors={() => setIsSensorsOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Center Workspace (LeftNav + Main Docked Area) */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Left Nav (200px) */}
        <LeftNav
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          unackAlarmsCount={unackAlarms.length}
          openIncidentsCount={openIncidents.length}
          hasCriticalAlarm={hasCrit}
        />

        {/* Main Content Body */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-app overflow-hidden">
          {import.meta.env.DEV && activeTab === 'kitchen' && <KitchenSinkView />}

          {/* SUPERVISOR VIEW MODE */}
          {isSupervisor && (
            <>
              {activeTab === 'overview' && (
                <SupervisorDashboardView
                  onSelectIncident={(id) => setActiveTab('incidents')}
                  onNavigateToTopology={() => setActiveTab('grid')}
                  onNavigateToGlossary={() => setActiveTab('glossary')}
                />
              )}

              {activeTab === 'grid' && <SupervisorTopologyView />}

              {activeTab === 'incidents' && <SupervisorIncidentsView />}

              {activeTab === 'scenarios' && (
                <ScenarioLabView
                  onRunCompleted={() => {
                    loadData();
                    setActiveTab('overview');
                  }}
                />
              )}

              {activeTab === 'explained' && (
                <ExplainedView
                  onNavigateTab={(tab) => setActiveTab(tab.toLowerCase())}
                  activeRunId={liveSessionId}
                />
              )}

              {activeTab === 'glossary' && <SupervisorGlossaryView />}
            </>
          )}

          {/* ADMIN VIEW MODE */}
          {isAdmin && activeTab === 'admin' && <AdminConsoleView />}

          {/* TECHNICIAN VIEW MODE / SHARED ENGINEERING CONSOLE */}
          {(!isSupervisor || !['overview', 'grid', 'incidents', 'scenarios', 'explained', 'glossary'].includes(activeTab)) && activeTab !== 'admin' && (
            <>
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
                  onNavigateToAlarms={() => setActiveTab('alarms')}
                  onAcknowledgeAlarm={handleAcknowledgeAlarm}
                />
              )}

              {activeTab === 'grid' && (
                <GridTopologyView
                  topology={topology}
                  gridState={gridState}
                  telemetry={telemetry}
                  compromisedBuses={openIncidents[0]?.affected_components || []}
                  onAdvanceStep={() => handleAdvanceStep(1)}
                  onResetSession={handleResetSystem}
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
                <TrendsView telemetryHistory={telemetryHistory} />
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

              {activeTab === 'glossary' && <SupervisorGlossaryView />}
            </>
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

      {/* Network Importer Modal */}
      <NetworkImporterModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={() => loadData()}
      />

      {/* Telemetry Sensor Configuration Modal */}
      <SensorConfigModal
        isOpen={isSensorsOpen}
        onClose={() => setIsSensorsOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TooltipProvider>
      <AuthProvider>
        <WorkbenchContent />
      </AuthProvider>
    </TooltipProvider>
  );
};
