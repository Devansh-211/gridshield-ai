import React, { useState, useEffect } from 'react';
import {
  GridTopology,
  GridState,
  ObservedTelemetryPoint,
  Incident,
  TimelineEvent,
} from '../types/api';
import {
  fetchGridTopology,
  fetchGridState,
  fetchLatestTelemetry,
  fetchIncidents,
} from './api/client';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { ScenarioLabView } from './views/ScenarioLabView';
import { IncidentsView } from './views/IncidentsView';
import { IncidentDetailModal } from './views/IncidentDetailModal';
import { ModelSystemView } from './views/ModelSystemView';
import { AnalystPanel } from './views/AnalystPanel';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [topology, setTopology] = useState<GridTopology | null>(null);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [telemetry, setTelemetry] = useState<ObservedTelemetryPoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const loadData = async () => {
    try {
      const [top, state, tel, incs] = await Promise.all([
        fetchGridTopology(),
        fetchGridState(),
        fetchLatestTelemetry(),
        fetchIncidents(),
      ]);
      setTopology(top);
      setGridState(state);
      setTelemetry(tel);
      setIncidents(incs);
    } catch (err) {
      console.error('Failed to load digital twin state:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openIncidentsCount={incidents.filter((i) => i.status !== 'RESOLVED').length}
        onDemoCompleted={loadData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            topology={topology}
            gridState={gridState}
            telemetry={telemetry}
            incidents={incidents}
            events={events}
            onOpenIncidentDetail={(inc) => setSelectedIncident(inc)}
            onNavigateToScenarios={() => setActiveTab('scenarios')}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioLabView
            onRunCompleted={() => {
              loadData();
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsView
            incidents={incidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        )}

        {activeTab === 'analyst' && <AnalystPanel incidents={incidents} />}

        {activeTab === 'models' && <ModelSystemView />}
      </main>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdated={loadData}
        />
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-border py-4 text-center text-xs font-mono text-slate-500 bg-surface/50">
        GridShield AI — Research & Educational Digital Twin • Built with pandapower, FastAPI & Next/Vite • IEEE 14-Bus Benchmark
      </footer>
    </div>
  );
};
