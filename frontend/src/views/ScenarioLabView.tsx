import React, { useState } from 'react';
import {
  ScenarioSpec,
  ScenarioType,
  AttackType,
  DemoStepResult,
} from '../../types/api';
import { createRun, triggerGoldenDemo, advanceDemoStep, createLiveSession } from '../api/client';
import { Sliders, Play, Zap, ShieldAlert, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

interface ScenarioLabViewProps {
  onRunCompleted: () => void;
}

export const ScenarioLabView: React.FC<ScenarioLabViewProps> = ({ onRunCompleted }) => {
  const [activeMode, setActiveMode] = useState<'stepwise_demo' | 'custom_scenario'>('stepwise_demo');

  // Stepwise Demo State
  const [demoRunId, setDemoRunId] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState<DemoStepResult | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);

  // Custom Scenario State
  const [scenarioType, setScenarioType] = useState<ScenarioType>('NORMAL');
  const [hasAttack, setHasAttack] = useState<boolean>(true);
  const [attackType, setAttackType] = useState<AttackType>('FALSE_DATA_INJECTION');
  const [targetBus, setTargetBus] = useState<string>('Bus 4');
  const [magnitude, setMagnitude] = useState<number>(-0.12);
  const [duration, setDuration] = useState<number>(20);
  const [seed, setSeed] = useState<number>(42);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const startStepwiseDemo = async () => {
    setIsDemoRunning(true);
    try {
      // Initialize a live session for the demo
      const session = await createLiveSession({ scenario_type: 'NORMAL', seed: 42 });
      setDemoRunId(session.run_id);
      // Advance first step
      const step1 = await advanceDemoStep(session.run_id);
      setDemoStep(step1);
    } catch (err) {
      console.error('Failed to start stepwise demo:', err);
    } finally {
      setIsDemoRunning(false);
    }
  };

  const nextDemoStep = async () => {
    if (!demoRunId) return;
    setIsDemoRunning(true);
    try {
      const nextStep = await advanceDemoStep(demoRunId);
      setDemoStep(nextStep);
      onRunCompleted();
    } catch (err) {
      console.error('Failed to advance demo step:', err);
    } finally {
      setIsDemoRunning(false);
    }
  };

  const handleRunCustom = async () => {
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

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-mono text-xs">
      {/* Header & Mode Switcher */}
      <div className="bg-surface border border-border rounded p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Scenario & Stepwise Demo Lab
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute 8-stage interactive guided cyberattack walkthroughs or inject custom cyber-physical contingencies.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveMode('stepwise_demo')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              activeMode === 'stepwise_demo'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Stepwise Demo (8 Stages)
          </button>
          <button
            onClick={() => setActiveMode('custom_scenario')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              activeMode === 'custom_scenario'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Injection Lab
          </button>
        </div>
      </div>

      {/* MODE 1: STEPWISE DEMO */}
      {activeMode === 'stepwise_demo' && (
        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-sm font-bold text-white uppercase block">
                False Data Injection & Line Trip Golden Demo
              </span>
              <span className="text-slate-400 text-[11px]">
                Walk through detection, residual testing, attribution, consequence simulation, and mitigation.
              </span>
            </div>
            <ProvenanceBadge provenance="SIMULATED" />
          </div>

          {!demoStep ? (
            <div className="p-8 text-center bg-background rounded border border-slate-800 space-y-3">
              <p className="text-slate-400">
                Ready to begin the 8-stage cyber-physical resilience walkthrough.
              </p>
              <button
                onClick={startStepwiseDemo}
                disabled={isDemoRunning}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow transition-colors disabled:opacity-50"
              >
                {isDemoRunning ? 'Initializing Session...' : 'Start Guided Demo'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step Progress Tracker */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800 text-[11px]">
                    Stage {demoStep.step_index + 1} of {demoStep.total_steps}
                  </span>
                  <span className="font-bold text-white text-sm">{demoStep.title}</span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  Sim Step: <strong className="text-white">t={demoStep.sim_step}s</strong>
                </span>
              </div>

              {/* Step Explanations (Plain + Technical) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-background rounded border border-slate-800 p-4 space-y-2">
                  <span className="font-bold text-cyan-400 uppercase text-[11px] block">
                    In Plain Words (What is happening?)
                  </span>
                  <p className="text-slate-200 leading-relaxed">{demoStep.summary_plain}</p>
                </div>
                <div className="bg-background rounded border border-slate-800 p-4 space-y-2">
                  <span className="font-bold text-amber-400 uppercase text-[11px] block">
                    Engineering & Security Detail
                  </span>
                  <p className="text-slate-300 leading-relaxed">{demoStep.summary_technical}</p>
                </div>
              </div>

              {/* Alarms and Actions in this Step */}
              <div className="bg-background rounded border border-slate-800 p-3.5 space-y-2">
                <span className="font-bold text-slate-300 text-[11px] block">
                  Actions Applied & Alarms Raised in this Stage:
                </span>
                <div className="flex flex-wrap gap-2">
                  {demoStep.actions_applied.length > 0 ? (
                    demoStep.actions_applied.map((act, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-800 text-[10px]">
                        Action: {act}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px]">No manual intervention applied in this step.</span>
                  )}
                  {demoStep.alarms_raised.map((alm, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                      Alarm: {alm.tag} ({alm.priority})
                    </span>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  onClick={startStepwiseDemo}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Walkthrough</span>
                </button>

                {!demoStep.is_complete ? (
                  <button
                    onClick={nextDemoStep}
                    disabled={isDemoRunning}
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow transition-colors disabled:opacity-50"
                  >
                    <span>{isDemoRunning ? 'Advancing Physics...' : 'Advance to Next Stage'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Demo Sequence Completed (Grid Mitigated & Verified)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: CUSTOM SCENARIO */}
      {activeMode === 'custom_scenario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Spec Config */}
          <div className="bg-surface border border-border rounded p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase border-b border-border pb-2 flex items-center justify-between">
              <span>1. Physical Grid Scenario</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">Contingency Type:</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
                className="w-full bg-background border border-slate-700 rounded p-1.5 text-white outline-none"
              >
                <option value="NORMAL">NORMAL (Quasi-Static Profile)</option>
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
                className="rounded bg-background border-slate-700 text-cyan-500"
              >
              </input>
              <label htmlFor="attack-toggle" className="text-slate-300 font-bold">
                Enable Simulated Cyberattack Injection
              </label>
            </div>

            {hasAttack && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1">Attack Type:</label>
                  <select
                    value={attackType}
                    onChange={(e) => setAttackType(e.target.value as AttackType)}
                    className="w-full bg-background border border-slate-700 rounded p-1.5 text-white outline-none"
                  >
                    <option value="FALSE_DATA_INJECTION">FALSE_DATA_INJECTION (Sensor Spoofing)</option>
                    <option value="MALICIOUS_CONTROL_COMMAND">MALICIOUS_CONTROL_COMMAND (AVR Tampering)</option>
                    <option value="REPLAY">REPLAY (Stale Window Replay)</option>
                    <option value="DENIAL_OF_SERVICE">DENIAL_OF_SERVICE (Telemetry Dropout)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Target Component:</label>
                    <select
                      value={targetBus}
                      onChange={(e) => setTargetBus(e.target.value)}
                      className="w-full bg-background border border-slate-700 rounded p-1.5 text-white outline-none"
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
                      className="w-full bg-background border border-slate-700 rounded p-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Duration (Steps):</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                      className="w-full bg-background border border-slate-700 rounded p-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">RNG Seed:</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                      className="w-full bg-background border border-slate-700 rounded p-1.5 text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleRunCustom}
              disabled={isRunning}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Simulating...' : 'Run Custom Simulation'}</span>
            </button>
          </div>

          {/* Right: Output */}
          <div className="bg-surface border border-border rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase">
                Intelligence Pipeline Result
              </h3>
              <ProvenanceBadge provenance="CALCULATED" />
            </div>

            {lastResult ? (
              <div className="space-y-2 text-slate-300">
                <div className="bg-background p-3 rounded border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Run ID:</span>
                    <span className="text-cyan-400 font-bold">{lastResult.run_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Detection Alarm:</span>
                    <span className={lastResult.detection?.overall_anomaly_flag ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {lastResult.detection?.overall_anomaly_flag ? 'ANOMALY DETECTED' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Classification:</span>
                    <span className="text-white font-bold">{lastResult.detection?.l3?.predicted_class || 'NORMAL'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attribution Domain:</span>
                    <span className="text-cyan-300 font-bold">{lastResult.attribution?.likely_cause || 'NORMAL'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operational Risk:</span>
                    <span className="text-rose-400 font-bold">{lastResult.risk?.risk_level || 'LOW'} ({lastResult.risk?.overall_risk_score?.toFixed(1) || 0}/100)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-center">
                Configure parameters and click "Run Custom Simulation" to execute the digital twin.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
