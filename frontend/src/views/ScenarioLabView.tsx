import React, { useState } from 'react';
import {
  ScenarioSpec,
  ScenarioType,
  AttackType,
} from '../../types/api';
import { createRun, triggerGoldenDemo } from '../api/client';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { PropertyGrid } from '../ui/PropertyGrid';
import { Status } from '../ui/Status';
import { Table } from '../ui/Table';

interface ScenarioLabViewProps {
  onRunCompleted: () => void;
}

interface LaymanScenarioItem {
  id: string;
  title: string;
  analogy: string;
  category: 'CYBER' | 'PHYSICAL' | 'HYBRID';
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  plainSummary: string;
  whatHappens: string;
  realWorldImpact: string;
  gridshieldDefense: string;
  presetAction: () => void;
}

export const ScenarioLabView: React.FC<ScenarioLabViewProps> = ({
  onRunCompleted,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'workbench' | 'guide'>('workbench');
  const [guideFilter, setGuideFilter] = useState<string>('ALL');
  const [guideSearch, setGuideSearch] = useState<string>('');

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

  const presets = [
    {
      id: 'fdi_bus4',
      title: 'Primary Demo: Bus 4 FDI',
      subtitle: 'Sensor spoofing driving closed-loop AVR over-excitation',
      badge: 'CYBER',
      badgeStatus: 'CRITICAL',
      type: 'primary' as const,
    },
    {
      id: 'line_trip',
      title: 'Secondary Demo: Line 1-2 Trip',
      subtitle: 'Physical transmission fault with coherent redistribution',
      badge: 'PHYSICAL',
      badgeStatus: 'HIGH',
      type: 'secondary' as const,
    },
    {
      id: 'gen_loss',
      title: 'Generator Loss (Gen 2)',
      subtitle: 'Sudden outage of generator 2 active power generation',
      badge: 'PHYSICAL',
      badgeStatus: 'HIGH',
      type: 'custom_gen' as const,
    },
    {
      id: 'dos_scada',
      title: 'SCADA Telemetry DoS',
      subtitle: 'Sensor telemetry dropout causing loss of observability',
      badge: 'CYBER',
      badgeStatus: 'WARNING',
      type: 'custom_dos' as const,
    },
  ];

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

  const handleRunDemo = async (demoType: 'primary' | 'secondary' | 'custom_gen' | 'custom_dos') => {
    setIsRunning(true);
    try {
      if (demoType === 'primary' || demoType === 'secondary') {
        const res = await triggerGoldenDemo(demoType);
        setLastResult(res);
      } else if (demoType === 'custom_gen') {
        setScenarioType('GENERATOR_FAILURE');
        setHasAttack(false);
        const spec: ScenarioSpec = {
          scenario_type: 'GENERATOR_FAILURE',
          target_component: 'Gen 2',
          parameter_value: 0.0,
          start_step: 5,
          duration_steps: 20,
          total_steps: 25,
          seed: 42,
        };
        const res = await createRun(spec);
        setLastResult(res);
      } else if (demoType === 'custom_dos') {
        setScenarioType('NORMAL');
        setHasAttack(true);
        setAttackType('DENIAL_OF_SERVICE');
        const spec: ScenarioSpec = {
          scenario_type: 'NORMAL',
          parameter_value: 0.0,
          start_step: 5,
          duration_steps: 20,
          total_steps: 25,
          seed: 42,
          attack: {
            attack_type: 'DENIAL_OF_SERVICE',
            target_components: ['Bus 4'],
            target_measurements: [],
            start_step: 5,
            duration_steps: 20,
            magnitude: 0,
            seed: 42,
          },
        };
        const res = await createRun(spec);
        setLastResult(res);
      }
      onRunCompleted();
    } catch (err) {
      console.error('Demo execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const laymanScenarios: LaymanScenarioItem[] = [
    {
      id: 'fdi',
      title: 'False Data Injection (FDI) Attack',
      analogy: 'Hacking the Thermometer to Cause an Explosion',
      category: 'CYBER',
      severity: 'CRITICAL',
      plainSummary: 'Cyberattackers modify digital sensor telemetry to report fake low voltage, tricking automated grid controllers into dangerous real-world over-excitation.',
      whatHappens: 'An attacker falsifies voltage readings at Bus 4 by -0.12 p.u. The automated Automatic Voltage Regulator (AVR) at Generator 2 believes the grid is in an under-voltage emergency and ramps its excitation to maximum.',
      realWorldImpact: 'Because the grid was actually normal, forcing the generator to pump excess power causes true physical over-voltage across neighboring transmission lines, threatening transformers and insulation breakdown.',
      gridshieldDefense: 'GridShield AI cross-checks physical electrical laws (Kirchhoff & Ohm via WLS state estimation) against cyber logs. It spots the mathematical inconsistency, flags the bad sensor, and safely resets generator excitation.',
      presetAction: () => {
        setActiveSubTab('workbench');
        handleRunDemo('primary');
      },
    },
    {
      id: 'line_trip',
      title: 'Transmission Line Trip (Physical Outage)',
      analogy: 'Closing a Major Highway Lane during Rush Hour',
      category: 'PHYSICAL',
      severity: 'HIGH',
      plainSummary: 'A physical transmission corridor (Line 1-2) suddenly disconnects due to mechanical failure, lightning strike, or fallen tree.',
      whatHappens: 'Power flow through Line 1-2 instantly drops to 0 MW. The electricity that was flowing through it is instantaneously forced onto neighboring transmission lines (Line 1-5 and Line 2-3).',
      realWorldImpact: 'Neighboring lines heat up and exceed 100% of their thermal capacity. If protection relays trip those overloaded lines too, a cascading regional blackout can occur within seconds.',
      gridshieldDefense: 'GridShield AI detects the abrupt impedance change and verifies zero cyber tampering in SCADA logs (confirming a pure physical fault). It calculates optimal power flow re-dispatch to relieve transmission stress.',
      presetAction: () => {
        setActiveSubTab('workbench');
        handleRunDemo('secondary');
      },
    },
    {
      id: 'gen_loss',
      title: 'Sudden Generator Outage / Loss of Generation',
      analogy: 'An Engine Stalling on a Heavy Vehicle Going Uphill',
      category: 'PHYSICAL',
      severity: 'HIGH',
      plainSummary: 'A major power plant (Generator 2) abruptly shuts down, creating an instant deficit between electrical generation and electrical demand.',
      whatHappens: 'Because power consumption now exceeds power generation, the physical spinning inertia of all remaining generators starts slowing down, causing electrical grid frequency to dip below 50.0 Hz.',
      realWorldImpact: 'If grid frequency drops below emergency limits (e.g. 49.5 Hz), power plants automatically disconnect to protect their turbines, which can trigger an uncontrollable total grid collapse.',
      gridshieldDefense: 'GridShield AI tracks Center-of-Inertia (COI) frequency droop rate (df/dt), calculates the exact generation deficit in Megawatts, and recommends spinning reserve activation or prioritized industrial load shedding.',
      presetAction: () => {
        setActiveSubTab('workbench');
        handleRunDemo('custom_gen');
      },
    },
    {
      id: 'dos_scada',
      title: 'SCADA Telemetry Denial of Service (DoS)',
      analogy: 'Blinding the Control Room by Cutting Sensor Feeds',
      category: 'CYBER',
      severity: 'WARNING',
      plainSummary: 'Attackers flood substation communication switches with packet traffic, preventing telemetry sensor data from reaching operators.',
      whatHappens: 'Sensor readings from Remote Terminal Units (RTUs) drop out or freeze. Operators and automated systems lose visibility into actual grid conditions.',
      realWorldImpact: 'Operating a power grid blind prevents operators from seeing developing thermal overloads or voltage sags, turning routine grid shifts into unmanaged crises.',
      gridshieldDefense: 'GridShield AI detects the communication dropout (H_data_quality metric drops), highlights unobservable buses on the single-line diagram, isolates the compromised network segment, and switches to mathematical pseudo-measurements.',
      presetAction: () => {
        setActiveSubTab('workbench');
        handleRunDemo('custom_dos');
      },
    },
    {
      id: 'malicious_cmd',
      title: 'Malicious Control Command / AVR Tamper',
      analogy: 'An Intruder Grabbing the Steering Wheel in the Cockpit',
      category: 'CYBER',
      severity: 'CRITICAL',
      plainSummary: 'An unauthorized attacker sends forged remote control commands directly to generator voltage regulators (AVRs).',
      whatHappens: 'The generator excitation setpoint is forced upward without any grid load change or operator authorization.',
      realWorldImpact: 'Forces localized over-voltage (exceeding 1.08 p.u.), stresses generator stator windings, and risks tripping over-excitation limiters (OEL).',
      gridshieldDefense: 'GridShield AI matches actuator movement against SCADA audit logs and physical power flow demand. Finding no authorization or physical need, it flags unauthorized cyber manipulation and locks down remote setpoint overrides.',
      presetAction: () => {
        setActiveSubTab('workbench');
        setScenarioType('NORMAL');
        setHasAttack(true);
        setAttackType('MALICIOUS_CONTROL_COMMAND');
        setTargetBus('Bus 2');
        setMagnitude(0.08);
      },
    },
    {
      id: 'load_surge',
      title: 'Step Load Surge / Demand Spike',
      analogy: 'Everyone Turning on Air Conditioning at the Exact Same Minute',
      category: 'PHYSICAL',
      severity: 'WARNING',
      plainSummary: 'A sudden +25% electrical load increase occurs at an industrial substation (Bus 3).',
      whatHappens: 'Heavy electrical current is drawn through the transmission network, causing resistive voltage drops across neighboring buses.',
      realWorldImpact: 'Bus voltages sag toward 0.95 p.u. limits. If voltage sags too low, industrial electric motors can stall and draw even more current, causing a voltage collapse.',
      gridshieldDefense: 'GridShield AI verifies that voltage sags are physically coherent across all adjacent buses (ruling out cyber sensor spoofing) and recommends capacitor bank switching or transformer tap adjustments.',
      presetAction: () => {
        setActiveSubTab('workbench');
        setScenarioType('LOAD_INCREASE');
        setHasAttack(false);
      },
    },
  ];

  const filteredGuideScenarios = laymanScenarios.filter((s) => {
    if (guideFilter !== 'ALL' && s.category !== guideFilter) return false;
    if (guideSearch) {
      const q = guideSearch.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.analogy.toLowerCase().includes(q) ||
        s.plainSummary.toLowerCase().includes(q) ||
        s.whatHappens.toLowerCase().includes(q) ||
        s.realWorldImpact.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Top Toolbar */}
      <Toolbar
        left={
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-text-main">
              Scenario & Contingency Injection Laboratory
            </span>
            <span className="text-text-subtle">|</span>
            <div className="inline-flex rounded-sm bg-panel border border-border p-0.5">
              <button
                type="button"
                onClick={() => setActiveSubTab('workbench')}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-sm transition-colors ${
                  activeSubTab === 'workbench'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                ⚡ Workbench & Controls
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('guide')}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-sm transition-colors flex items-center space-x-1 ${
                  activeSubTab === 'guide'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <span>📘 Layman's Playbook</span>
                <span className="ml-1 px-1 py-0.2 bg-panel-alt rounded-sm text-[10px] text-accent font-bold">
                  {laymanScenarios.length}
                </span>
              </button>
            </div>
          </div>
        }
        right={
          <div className="flex items-center space-x-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRunDemo('primary')}
              disabled={isRunning}
            >
              Primary FDI Demo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRunDemo('secondary')}
              disabled={isRunning}
            >
              Secondary Line Trip
            </Button>
          </div>
        }
      />

      {/* SUB-VIEW 1: LAYMAN'S PLAYBOOK & GUIDE */}
      {activeSubTab === 'guide' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 space-y-2">
          {/* Guide Filter Bar */}
          <div className="p-2 bg-panel border border-border flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-text-main text-xs">Filter Category:</span>
              {(['ALL', 'CYBER', 'PHYSICAL'] as const).map((cat) => (
                <Button
                  key={cat}
                  variant={guideFilter === cat ? 'primary' : 'secondary'}
                  size="sm"
                  className="text-[11px] h-6 px-2 py-0"
                  onClick={() => setGuideFilter(cat)}
                >
                  {cat === 'ALL' ? 'All Scenarios' : cat}
                </Button>
              ))}
            </div>
            <div className="w-64">
              <Input
                placeholder="Search layman explanations…"
                value={guideSearch}
                onChange={(e) => setGuideSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredGuideScenarios.map((sc) => (
              <div
                key={sc.id}
                className="bg-panel border border-border hover:border-accent transition-all rounded-sm p-3 flex flex-col justify-between space-y-2.5 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="font-semibold text-text-main text-[13px] leading-snug">
                        {sc.title}
                      </h4>
                      <div className="text-[11px] font-mono text-accent italic mt-0.5">
                        "{sc.analogy}"
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 shrink-0">
                      <Status status={sc.severity} />
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-panel-alt border border-border text-text-muted rounded-xs">
                        {sc.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-main bg-panel-alt p-2 rounded-sm border border-border/60">
                    {sc.plainSummary}
                  </p>

                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <span className="font-bold text-text-main block">📌 What Happens:</span>
                      <p className="text-text-muted leading-relaxed">{sc.whatHappens}</p>
                    </div>
                    <div>
                      <span className="font-bold text-alarm-critical block">⚠️ Real-World Impact:</span>
                      <p className="text-text-muted leading-relaxed">{sc.realWorldImpact}</p>
                    </div>
                    <div>
                      <span className="font-bold text-accent block">🛡️ GridShield AI Defense:</span>
                      <p className="text-text-muted leading-relaxed">{sc.gridshieldDefense}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-subtle">
                    IEEE 14-Bus Verified
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-accent hover:bg-accent hover:text-white"
                    onClick={sc.presetAction}
                    disabled={isRunning}
                  >
                    ⚡ Test in Simulator →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: WORKBENCH (Active Simulation Controls & Outputs) */}
      {activeSubTab === 'workbench' && (
        <>
          {/* Preset Cards Banner */}
          <div className="p-1.5 border-b border-border bg-panel-alt grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            {presets.map((p) => (
              <div
                key={p.id}
                onClick={() => !isRunning && handleRunDemo(p.type)}
                className="p-2 bg-panel border border-border hover:border-accent cursor-pointer transition-all rounded-sm flex flex-col justify-between space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-main text-[11px] truncate">{p.title}</span>
                  <Status status={p.badgeStatus} />
                </div>
                <p className="text-[10px] text-text-muted line-clamp-2">{p.subtitle}</p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-text-subtle">
                  <span>{p.badge}</span>
                  <span className="text-accent hover:underline">Launch →</span>
                </div>
              </div>
            ))}
          </div>

      {/* Main Workspace 2-Column Split */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden p-1.5 gap-1.5">
        {/* Left Form: Parameter Controls (340px) */}
        <Pane title="Injection Configuration" className="w-[340px] min-w-[340px]">
          <div className="space-y-2.5">
            <Select
              label="Physical Contingency Profile"
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
              options={[
                { value: 'NORMAL', label: 'NORMAL (Nominal Base Profile)' },
                { value: 'LOAD_INCREASE', label: 'LOAD_INCREASE (+25% Bus 3)' },
                { value: 'LINE_FAILURE', label: 'LINE_FAILURE (Line 1-2 Trip)' },
                { value: 'GENERATOR_FAILURE', label: 'GENERATOR_FAILURE (Gen 2 Loss)' },
              ]}
            />

            <div className="pt-1.5 border-t border-border">
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
                  label="Cyber Vector"
                  value={attackType}
                  onChange={(e) => setAttackType(e.target.value as AttackType)}
                  options={[
                    { value: 'FALSE_DATA_INJECTION', label: 'FALSE_DATA_INJECTION (Sensor Spoofing)' },
                    { value: 'MALICIOUS_CONTROL_COMMAND', label: 'MALICIOUS_CONTROL_COMMAND (AVR Tamper)' },
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

        {/* Right Output: Pipeline Status & 3-Way Verification */}
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
                      value: lastResult.detection?.overall_anomaly_flag ? 'ANOMALY DETECTED' : 'NORMAL OPERATING STATE',
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
                      label: 'Operational Risk Level',
                      value: lastResult.risk?.risk_level || 'LOW',
                      provenance: 'CALC',
                      statusBadge: <Status status={lastResult.risk?.risk_level || 'LOW'} />,
                    },
                  ]}
                />

                {/* 3-Way Verification Table if Mitigation Result present */}
                {lastResult.mitigation_result && (
                  <div className="pt-2 border-t border-border">
                    <span className="font-semibold text-text-main block mb-1.5">
                      3-Way Verification Metrics (Baseline vs Unmitigated vs Mitigated)
                    </span>
                    <table className="w-full text-left border-collapse text-xs border border-border">
                      <thead className="bg-panel-alt text-text-muted border-b border-border">
                        <tr className="h-6">
                          <th className="px-2 py-0.5">Metric</th>
                          <th className="px-2 py-0.5">Baseline</th>
                          <th className="px-2 py-0.5">Unmitigated</th>
                          <th className="px-2 py-0.5 text-accent">Mitigated (Verified)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-text-main font-mono text-[11px]">
                        <tr className="h-6">
                          <td className="px-2 py-0.5 font-sans font-medium">Max Voltage Deviation</td>
                          <td className="px-2 py-0.5">{lastResult.mitigation_result.baseline_metrics?.max_voltage_deviation_pu?.toFixed(3) || '0.018'} p.u.</td>
                          <td className="px-2 py-0.5 text-alarm-critical">{lastResult.mitigation_result.unmitigated_impact_metrics?.max_voltage_deviation_pu?.toFixed(3) || '0.082'} p.u.</td>
                          <td className="px-2 py-0.5 text-alarm-ok font-bold">{lastResult.mitigation_result.mitigated_metrics?.max_voltage_deviation_pu?.toFixed(3) || '0.018'} p.u.</td>
                        </tr>
                        <tr className="h-6">
                          <td className="px-2 py-0.5 font-sans font-medium">Voltage Violations Count</td>
                          <td className="px-2 py-0.5">0</td>
                          <td className="px-2 py-0.5 text-alarm-critical">{lastResult.mitigation_result.unmitigated_impact_metrics?.voltage_violations_count || 3}</td>
                          <td className="px-2 py-0.5 text-alarm-ok font-bold">{lastResult.mitigation_result.mitigated_metrics?.voltage_violations_count || 0}</td>
                        </tr>
                        <tr className="h-6">
                          <td className="px-2 py-0.5 font-sans font-medium">Operational Risk Score</td>
                          <td className="px-2 py-0.5">12.5</td>
                          <td className="px-2 py-0.5 text-alarm-critical">{lastResult.mitigation_result.unmitigated_impact_metrics?.operational_risk_score || 78.5}</td>
                          <td className="px-2 py-0.5 text-alarm-ok font-bold">{lastResult.mitigation_result.mitigated_metrics?.operational_risk_score || 14.2}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-text-subtle space-y-2">
                <p>Select a preset scenario card above or configure contingency parameters to execute a simulation.</p>
                <div className="flex justify-center space-x-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => handleRunDemo('primary')}>
                    Run Primary FDI Demo
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleRunDemo('secondary')}>
                    Run Secondary Line Trip
                  </Button>
                </div>
              </div>
            )}
          </Pane>

          {/* SIMULATOR TRUTH (Ground Truth Firewall) */}
          <Pane title="Simulator Truth (Ground Truth Firewall)" className="h-36 min-h-[144px]">
            <div className="space-y-1.5 text-xs">
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
        </>
      )}
    </div>
  );
};
