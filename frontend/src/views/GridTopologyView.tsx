import React, { useState } from 'react';
import { GridTopology, GridState, BusTopology, LineTopology } from '../../types/api';
import { SingleLineDiagram } from '../components/SingleLineDiagram';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { Network, Zap, Shield, Activity } from 'lucide-react';

interface GridTopologyViewProps {
  topology: GridTopology | null;
  gridState: GridState | null;
}

export const GridTopologyView: React.FC<GridTopologyViewProps> = ({
  topology,
  gridState,
}) => {
  const [selectedBus, setSelectedBus] = useState<BusTopology | null>(null);
  const [selectedLine, setSelectedLine] = useState<LineTopology | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'buses' | 'lines' | 'generators'>('buses');

  if (!topology) {
    return (
      <div className="h-96 flex items-center justify-center bg-surface border border-border rounded font-mono text-xs text-slate-400">
        <Activity className="w-5 h-5 text-cyan-400 mr-2 animate-spin" />
        Loading IEEE 14-Bus Topology...
      </div>
    );
  }

  const busStateMap = new Map();
  if (gridState?.buses) {
    gridState.buses.forEach((b) => busStateMap.set(b.bus_id, b));
  }

  const lineStateMap = new Map();
  if (gridState?.lines) {
    gridState.lines.forEach((l) => lineStateMap.set(l.line_id, l));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface border border-border rounded p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
              IEEE 14-Bus Topology & State Inspector
            </h2>
            <ProvenanceBadge provenance="SIMULATED" />
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            AC Power Flow State • 14 Substation Buses • 20 Branches/Transformers • 5 Synch Generators
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">
            Sim Step: <strong className="text-cyan-300">t={gridState?.step ?? 0}s</strong>
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
            {gridState?.converged !== false ? 'NR-AC CONVERGED' : 'DIVERGED'}
          </span>
        </div>
      </div>

      {/* Main Single-Line Diagram */}
      <SingleLineDiagram
        topology={topology}
        gridState={gridState}
        onSelectBus={(b) => {
          setSelectedBus(b);
          setSelectedLine(null);
        }}
        onSelectLine={(l) => {
          setSelectedLine(l);
          setSelectedBus(null);
        }}
      />

      {/* Deep Inspection Tables */}
      <div className="bg-surface border border-border rounded p-4 font-mono">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSubTab('buses')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                activeSubTab === 'buses'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Buses (14)
            </button>
            <button
              onClick={() => setActiveSubTab('lines')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                activeSubTab === 'lines'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Transmission Lines (20)
            </button>
            <button
              onClick={() => setActiveSubTab('generators')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                activeSubTab === 'generators'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Generators (5)
            </button>
          </div>
          <ProvenanceBadge provenance="OBSERVED" />
        </div>

        {activeSubTab === 'buses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2">Bus Label</th>
                  <th className="py-2 px-2">Base kV</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">Voltage (p.u.)</th>
                  <th className="py-2 px-2">Angle (deg)</th>
                  <th className="py-2 px-2">Active P (MW)</th>
                  <th className="py-2 px-2">Reactive Q (MVAr)</th>
                  <th className="py-2 px-2">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topology.buses.map((bus) => {
                  const state = busStateMap.get(bus.id);
                  const vm = state?.vm_pu ?? 1.0;
                  const isViolation = vm < 0.95 || vm > 1.05;
                  return (
                    <tr
                      key={bus.id}
                      onClick={() => setSelectedBus(bus)}
                      className={`hover:bg-slate-800/40 cursor-pointer ${
                        selectedBus?.id === bus.id ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <td className="py-2 px-2 font-bold text-white">{bus.name}</td>
                      <td className="py-2 px-2 text-slate-300">{bus.vn_kv} kV</td>
                      <td className="py-2 px-2 text-slate-400">{bus.bus_type}</td>
                      <td className={`py-2 px-2 font-bold ${isViolation ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {vm.toFixed(4)}
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {state?.va_degree ? `${state.va_degree.toFixed(2)}°` : '0.00°'}
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {state?.p_mw ? state.p_mw.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {state?.q_mvar ? state.q_mvar.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isViolation
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {isViolation ? 'VOLT_VIOLATION' : 'NOMINAL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'lines' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2">Branch Label</th>
                  <th className="py-2 px-2">From Bus</th>
                  <th className="py-2 px-2">To Bus</th>
                  <th className="py-2 px-2">Length (km)</th>
                  <th className="py-2 px-2">Loading (%)</th>
                  <th className="py-2 px-2">P Flow (MW)</th>
                  <th className="py-2 px-2">In Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topology.lines.map((line) => {
                  const state = lineStateMap.get(line.id);
                  const loading = state?.loading_pct ?? 45.0;
                  const isOverloaded = loading > 100.0;
                  return (
                    <tr
                      key={line.id}
                      onClick={() => setSelectedLine(line)}
                      className={`hover:bg-slate-800/40 cursor-pointer ${
                        selectedLine?.id === line.id ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <td className="py-2 px-2 font-bold text-white">{line.name}</td>
                      <td className="py-2 px-2 text-slate-300">Bus {line.from_bus}</td>
                      <td className="py-2 px-2 text-slate-300">Bus {line.to_bus}</td>
                      <td className="py-2 px-2 text-slate-400">{line.length_km.toFixed(1)}</td>
                      <td className={`py-2 px-2 font-bold ${isOverloaded ? 'text-rose-400' : 'text-slate-200'}`}>
                        {loading.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {state?.p_from_mw ? state.p_from_mw.toFixed(1) : '0.0'} MW
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            line.in_service
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {line.in_service ? 'CLOSED' : 'TRIPPED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'generators' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2">Gen Name</th>
                  <th className="py-2 px-2">Substation Bus</th>
                  <th className="py-2 px-2">Setpoint P (MW)</th>
                  <th className="py-2 px-2">Voltage Target (pu)</th>
                  <th className="py-2 px-2">Rating (MVA)</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topology.generators.map((gen) => (
                  <tr key={gen.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2 font-bold text-white">{gen.name}</td>
                    <td className="py-2 px-2 text-cyan-300">Bus {gen.bus}</td>
                    <td className="py-2 px-2 text-slate-200">{gen.p_mw.toFixed(1)} MW</td>
                    <td className="py-2 px-2 text-slate-200">{gen.vm_pu.toFixed(3)}</td>
                    <td className="py-2 px-2 text-slate-400">{gen.sn_mva} MVA</td>
                    <td className="py-2 px-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {gen.in_service ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
