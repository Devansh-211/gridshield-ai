import React, { useState } from 'react';
import {
  ScenarioSpec,
  ScenarioType,
  AttackType,
} from '../../types/api';
import { createRun, triggerGoldenDemo } from '../api/client';
import { Sliders, Play, Zap, ShieldAlert } from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

interface ScenarioLabViewProps {
  onRunCompleted: () => void;
}

export const ScenarioLabView: React.FC<ScenarioLabViewProps> = ({ onRunCompleted }) => {
  const [scenarioType, setScenarioType] = useState<ScenarioType>('NORMAL');
  const [hasAttack, setHasAttack] = useState<boolean>(true);
  const [attackType, setAttackType] = useState<AttackType>('FALSE_DATA_INJECTION');
  const [targetBus, setTargetBus] = useState<string>('Bus 4');
  const [magnitude, setMagnitude] = useState<number>(-0.12);
  const [duration, setDuration] = useState<number>(20);
  const [seed, setSeed] = useState<number>(42);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const spec: ScenarioSpec = {
        scenario_type: scenarioType,
        parameter_value: 0.0,
        start_step: 0,
        duration_steps: 25,
        total_steps: 25,
        seed: seed,
        attack: hasAttack
          ? {
              attack_type: attackType,
              target_components: [targetBus],
              target_measurements: [],
              start_step: 5,
              duration_steps: duration,
              magnitude: magnitude,
              seed: seed,
            }
          : undefined,
      };
      const res = await createRun(spec);
      setLastResult(res);
      onRunCompleted();
    } catch (err) {
      console.error('Run failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunGoldenDemo = async () => {
    setIsRunning(true);
    try {
      const res = await triggerGoldenDemo();
      setLastResult(res);
      onRunCompleted();
    } catch (err) {
      console.error('Demo failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-mono font-bold text-white uppercase">
              Scenario & Attack Injection Lab
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Configure simulated physical contingencies and isolated cyberattack vectors on IEEE 14-bus.
          </p>
        </div>
        <ProvenanceBadge provenance="SIMULATED" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Physical & Attack Configuration */}
        <div className="bg-surface/90 border border-border rounded-xl p-5 space-y-4 font-mono text-xs">
          <h3 className="text-xs font-bold text-slate-200 uppercase border-b border-border pb-2 flex items-center justify-between">
            <span>1. Physical Grid Scenario</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </h3>

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Contingency Type:</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
              className="w-full bg-background border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
            >
              <option value="NORMAL">NORMAL (Baseline Quasi-Static Profile)</option>
              <option value="LOAD_INCREASE">LOAD_INCREASE (+25% on Bus 3)</option>
              <option value="LINE_FAILURE">LINE_FAILURE (Outage on Line 1-2)</option>
              <option value="GENERATOR_FAILURE">GENERATOR_FAILURE (Outage on Gen 2)</option>
            </select>
          </div>

          <h3 className="text-xs font-bold text-slate-200 uppercase border-b border-border pb-2 pt-2 flex items-center justify-between">
            <span>2. Cyber Attack Vector</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </h3>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="attack-toggle"
              checked={hasAttack}
              onChange={(e) => setHasAttack(e.target.checked)}
              className="rounded bg-background border-slate-700 text-cyan-500 focus:ring-0"
            />
            <label htmlFor="attack-toggle" className="text-slate-300 font-bold">
              Enable Simulated Cyberattack Injection
            </label>
          </div>

          {hasAttack && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-400 mb-1">Attack Type:</label>
                <select
                  value={attackType}
                  onChange={(e) => setAttackType(e.target.value as AttackType)}
                  className="w-full bg-background border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                >
                  <option value="FALSE_DATA_INJECTION">
                    FALSE_DATA_INJECTION (Sensor Spoofing)
                  </option>
                  <option value="MALICIOUS_CONTROL_COMMAND">
                    MALICIOUS_CONTROL_COMMAND (AVR Tampering)
                  </option>
                  <option value="REPLAY">REPLAY (Stale Window Replay)</option>
                  <option value="DENIAL_OF_SERVICE">
                    DENIAL_OF_SERVICE (Telemetry Dropout)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Component:</label>
                  <select
                    value={targetBus}
                    onChange={(e) => setTargetBus(e.target.value)}
                    className="w-full bg-background border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((b) => (
                      <option key={b} value={`Bus ${b}`}>
                        Bus {b} {b === 4 ? '(Demo Target)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Magnitude (p.u.):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={magnitude}
                    onChange={(e) => setMagnitude(parseFloat(e.target.value))}
                    className="w-full bg-background border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Duration (Steps):</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-background border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">RNG Seed:</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                    className="w-full bg-background border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center space-x-3">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
            <button
              onClick={handleRunGoldenDemo}
              disabled={isRunning}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Run Golden Demo</span>
            </button>
          </div>
        </div>

        {/* Right Column: Execution Results & Intelligence Output */}
        <div className="bg-surface/90 border border-border rounded-xl p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase">
              Resilience Intelligence Pipeline Output
            </h3>
            <ProvenanceBadge provenance="CALCULATED" />
          </div>

          {lastResult ? (
            <div className="space-y-3 text-slate-300">
              <div className="bg-background/90 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Run ID:</span>
                  <span className="text-cyan-400 font-bold">{lastResult.run_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Detection Alarm:</span>
                  <span
                    className={
                      lastResult.detection?.overall_anomaly_flag
                        ? 'text-rose-400 font-bold'
                        : 'text-emerald-400 font-bold'
                    }
                  >
                    {lastResult.detection?.overall_anomaly_flag ? 'ANOMALY DETECTED' : 'NORMAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classification:</span>
                  <span className="text-white font-bold">
                    {lastResult.detection?.l3?.predicted_class || 'NORMAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attribution Domain:</span>
                  <span className="text-cyan-300 font-bold">
                    {lastResult.attribution?.likely_cause || 'NORMAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Certainty Level:</span>
                  <span className="text-amber-400 font-bold">
                    {lastResult.certainty || 'HIGH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Operational Risk:</span>
                  <span className="text-rose-400 font-bold">
                    {lastResult.risk?.risk_level || 'LOW'} (
                    {lastResult.risk?.overall_risk_score?.toFixed(1) || 0}/100)
                  </span>
                </div>
              </div>

              {lastResult.incident && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-lg text-rose-300">
                  <span className="font-bold block text-white mb-1">
                    Incident Created: {lastResult.incident.incident_id}
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Mitigation recommendation generated with{' '}
                    {lastResult.incident.recommended_plan?.actions?.length || 1} action(s).
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-center">
              Configure parameters and click "Run Simulation" to execute the digital twin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
