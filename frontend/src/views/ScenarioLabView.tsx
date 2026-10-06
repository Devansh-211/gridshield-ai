import React, { useState } from 'react';
import {
  ScenarioSpec,
  ScenarioType,
  AttackType,
} from '../../types/api';
import { createRun, triggerGoldenDemo } from '../api/client';
import { Pane } from '../ui/Pane';
import { Toolbar, ToolbarSeparator } from '../ui/Toolbar';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { PropertyGrid } from '../ui/PropertyGrid';
import { Status } from '../ui/Status';
import { ProvenanceChip } from '../ui/ProvenanceChip';

interface ScenarioLabViewProps {
  onRunCompleted: () => void;
}

export const ScenarioLabView: React.FC<ScenarioLabViewProps> = ({
  onRunCompleted,
}) => {
  const [scenarioType, setScenarioType] = useState<ScenarioType>('NORMAL');
  const [hasAttack, setHasAttack] = useState<boolean>(true);
  const [attackType, setAttackType] = useState<AttackType>('FALSE_DATA_INJECTION');
  const [targetBus, setTargetBus] = useState<string>('Bus 4');
  const [magnitude, setMagnitude] = useState<number>(-0.12);
  const [startStep, setStartStep] = useState<number>(5);
  const [duration, setDuration] = useState<number>(20);
  const [seed, setSeed] = useState<number>(42);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleRunBatch = async () => {
    setIsRunning(true);
    try {
      const spec: ScenarioSpec = {
        scenario_type: scenarioType,
        parameter_value: 0.0,
        start_step: startStep,
        duration_steps: duration,
        total_steps: 25,
        seed: seed,
        attack: hasAttack
          ? {
              attack_type: attackType,
              target_components: [targetBus],
              target_measurements: [],
              start_step: startStep,
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
      console.error('Run execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunDemo = async (demoType: 'primary' | 'secondary') => {
    setIsRunning(true);
    try {
      const res = await triggerGoldenDemo(demoType);
      setLastResult(res);
      onRunCompleted();
    } catch (err) {
      console.error('Demo execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Top Toolbar */}
      <Toolbar
        left={
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-text-main">
              Scenario & Contingency Injection Lab
            </span>
            <span className="text-text-subtle">|</span>
            <span className="text-text-muted">
              IEEE 14-bus AC power flow digital twin
            </span>
          </div>
        }
        right={
          <div className="flex items-center space-x-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRunDemo('primary')}
              disabled={isRunning}
              title="Run golden FDI on Bus 4 demo sequence"
            >
              Run primary demo (FDI)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRunDemo('secondary')}
              disabled={isRunning}
              title="Run physical line 1-2 outage demo sequence"
            >
              Run secondary demo (Line Trip)
            </Button>
          </div>
        }
      />

      {/* 2-Pane Split: Left Config (360px) | Right Output & Truth Pane */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden p-1.5 gap-1.5">
        {/* Left: Compact Parameter Form (360px) */}
        <Pane title="Contingency Parameters" className="w-[360px] min-w-[360px]">
          <div className="space-y-3">
            {/* Physical Contingency */}
            <Select
              label="Physical Grid Contingency"
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
              options={[
                { value: 'NORMAL', label: 'NORMAL (Nominal Base Profile)' },
                { value: 'LOAD_INCREASE', label: 'LOAD_INCREASE (+25% on Bus 3)' },
                { value: 'LINE_FAILURE', label: 'LINE_FAILURE (Line 1-2 Outage)' },
                { value: 'GENERATOR_FAILURE', label: 'GENERATOR_FAILURE (Gen 2 Loss)' },
              ]}
            />

            {/* Cyber Attack Toggle */}
            <div className="pt-1 border-t border-border/60">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAttack}
                  onChange={(e) => setHasAttack(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-border text-accent focus:ring-0"
                />
                <span className="font-semibold text-text-main">
                  Enable Cyberattack Injection
                </span>
              </label>
            </div>

            {hasAttack && (
              <div className="space-y-2 pt-1">
                <Select
                  label="Cyber Attack Vector"
                  value={attackType}
                  onChange={(e) => setAttackType(e.target.value as AttackType)}
                  options={[
                    { value: 'FALSE_DATA_INJECTION', label: 'FALSE_DATA_INJECTION (Sensor Spoofing)' },
                    { value: 'MALICIOUS_CONTROL_COMMAND', label: 'MALICIOUS_CONTROL_COMMAND (AVR Tampering)' },
                    { value: 'REPLAY', label: 'REPLAY (Stale Window Replay)' },
                    { value: 'DENIAL_OF_SERVICE', label: 'DENIAL_OF_SERVICE (Telemetry Dropout)' },
                  ]}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Target Bus"
                    value={targetBus}
                    onChange={(e) => setTargetBus(e.target.value)}
                    options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((b) => ({
                      value: `Bus ${b}`,
                      label: `Bus ${b}${b === 4 ? ' (Demo)' : ''}`,
                    }))}
                  />
                  <Input
                    label="Magnitude"
                    type="number"
                    step="0.01"
                    value={magnitude}
                    unitSuffix="p.u."
                    onChange={(e) => setMagnitude(parseFloat(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Start Step"
                    type="number"
                    value={startStep}
                    unitSuffix="s"
                    onChange={(e) => setStartStep(parseInt(e.target.value, 10))}
                  />
                  <Input
                    label="Duration"
                    type="number"
                    value={duration}
                    unitSuffix="s"
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  />
                </div>

                <Input
                  label="Counter RNG Seed"
                  type="number"
                  value={seed}
                  helperText="Enforces O(1) step determinism (Invariant I4)"
                  onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                />
              </div>
            )}

            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={handleRunBatch}
              disabled={isRunning}
            >
              {isRunning ? 'Executing Simulation…' : 'Run Batch Simulation'}
            </Button>
          </div>
        </Pane>

        {/* Right: Results & Simulator Ground Truth */}
        <div className="flex-1 flex flex-col space-y-1.5 min-w-0 min-h-0 overflow-hidden">
          {/* Intelligence Pipeline Output */}
          <Pane title="Simulation Pipeline Assessment" className="flex-1">
            {lastResult ? (
              <div className="space-y-3">
                <PropertyGrid
                  items={[
                    { label: 'Run Identifier', value: lastResult.run_id || 'RUN_DEMO_01' },
                    {
                      label: 'Anomaly Detection',
                      value: lastResult.detection?.overall_anomaly_flag ? 'ANOMALY DETECTED' : 'NORMAL',
                      provenance: 'MDL',
                      statusBadge: <Status status={lastResult.detection?.overall_anomaly_flag ? 'CRITICAL' : 'OK'} />,
                    },
                    {
                      label: 'Attribution Likely Cause',
                      value: lastResult.attribution?.likely_cause || lastResult.demo_type || 'NORMAL',
                      provenance: 'MDL',
                    },
                    {
                      label: 'Certainty Band',
                      value: lastResult.certainty || 'HIGH',
                      provenance: 'CALC',
                    },
                    {
                      label: 'Operational Risk',
                      value: lastResult.risk?.risk_level || 'LOW',
                      provenance: 'CALC',
                      statusBadge: <Status status={lastResult.risk?.risk_level || 'LOW'} />,
                    },
                  ]}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-text-subtle">
                Select contingency parameters and execute a simulation run.
              </div>
            )}
          </Pane>

          {/* SIMULATOR TRUTH (Ground Truth Firewall) */}
          <Pane
            title="Simulator Truth (Ground Truth Firewall)"
            className="h-44 min-h-[176px]"
          >
            <div className="space-y-2">
              <div className="p-2 bg-inset border border-border text-[11px] text-text-subtle font-mono">
                <strong>INVARIANT I3:</strong> This pane displays ground-truth physics state. Detection and attribution engines receive only noisy observed telemetry and cyber events, never ground truth.
              </div>
              <PropertyGrid
                items={[
                  {
                    label: 'Active Attack Injection',
                    value: hasAttack ? `${attackType} on ${targetBus} (Δ = ${magnitude} p.u.)` : 'None (Clean Baseline)',
                    provenance: 'SIM',
                    isNumeric: false,
                  },
                  {
                    label: 'Simulation Engine',
                    value: 'pandapower IEEE 14-bus AC Power Flow Solver (v3.5.5)',
                    provenance: 'SIM',
                    isNumeric: false,
                  },
                ]}
              />
            </div>
          </Pane>
        </div>
      </div>
    </div>
  );
};
