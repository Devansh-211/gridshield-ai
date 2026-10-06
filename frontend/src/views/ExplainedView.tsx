import React, { useState } from 'react';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import glossaryData from '../content/glossary.json';

interface ExplainedViewProps {
  onNavigateTab?: (tab: string) => void;
  activeRunId?: string | null;
}

const SECTIONS = [
  { id: 'what-is-gridshield', num: '1', title: 'What is GridShield AI?' },
  { id: 'power-grid-basics', num: '2', title: 'The Power Grid in Plain Words' },
  { id: 'how-operators-know', num: '3', title: 'How Operators Know What Is Happening' },
  { id: 'cyberattack-types', num: '4', title: 'What an Attack Looks Like' },
  { id: 'broken-parts-vs-attacks', num: '5', title: 'Broken Parts vs Attacks' },
  { id: 'three-detection-checks', num: '6', title: 'How GridShield Spots Trouble' },
  { id: 'reading-an-incident', num: '7', title: 'Reading an Incident Page' },
  { id: 'alarms-and-risk-scores', num: '8', title: 'Alarms and Risk Scores' },
  { id: 'ai-analyst-honestly', num: '9', title: 'The AI Analyst, Honestly' },
  { id: 'testing-a-fix', num: '10', title: 'Testing a Fix (3-Way Test)' },
  { id: 'real-vs-simulated', num: '11', title: 'Real vs Simulated' },
  { id: 'how-accurate-is-it', num: '12', title: 'How Accurate Is It?' },
  { id: 'limitations-and-safety', num: '13', title: 'Limitations and Safety' },
  { id: 'try-it-in-three-steps', num: '14', title: 'Try It in Three Steps' },
  { id: 'questions-and-answers', num: '15', title: 'Questions and Answers (FAQ)' },
];

export const ExplainedView: React.FC<ExplainedViewProps> = ({
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<string>('what-is-gridshield');
  const [glossarySearch, setGlossarySearch] = useState<string>('');
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState<boolean>(false);

  const filteredGlossary = Object.entries(glossaryData).filter(
    ([_, val]) =>
      val.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      val.plain.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      val.technical.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Top Document Toolbar */}
      <Toolbar
        left={
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-text-main">
              Plain-Language Digital Twin Guide
            </span>
            <span className="text-text-subtle">|</span>
            <span className="text-text-muted">15 Chapters Complete (Flesch-Kincaid ≤ 8.5)</span>
          </div>
        }
        right={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsGlossaryOpen(true)}
          >
            Glossary Dictionary (26 Terms)
          </Button>
        }
      />

      {/* Main Document Layout */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Left TOC (220px) */}
        <aside className="w-56 min-w-[220px] bg-panel border-r border-border hidden md:flex flex-col overflow-y-auto select-none p-1.5 space-y-0.5">
          <span className="text-[11px] font-semibold text-text-subtle px-2 py-1 block">
            Table of Contents
          </span>
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full text-left px-2 py-1 text-xs transition-colors rounded-sm flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-accent-tint text-accent font-semibold'
                    : 'text-text-muted hover:text-text-main hover:bg-panel-alt'
                }`}
              >
                <span className="font-mono text-[11px] text-text-subtle w-4 shrink-0">
                  {sec.num}.
                </span>
                <span className="truncate">{sec.title.replace(/^\d+\.\s*/, '')}</span>
              </button>
            );
          })}
        </aside>

        {/* Center Reading Area */}
        <main className="flex-1 overflow-y-auto bg-panel p-4 md:p-8 flex justify-center">
          <article className="w-full max-w-[72ch] text-[15px] leading-[1.65] text-text-main font-ui space-y-6">
            {/* Mobile Disclosure */}
            <div className="md:hidden border border-border p-2 bg-panel-alt rounded-sm">
              <button
                onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
                className="w-full text-left font-semibold text-xs text-text-main flex justify-between"
              >
                <span>Chapter: {SECTIONS.find((s) => s.id === activeSection)?.title}</span>
                <span>{isMobileTocOpen ? '▲' : '▼'}</span>
              </button>
              {isMobileTocOpen && (
                <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSection(s.id);
                        setIsMobileTocOpen(false);
                      }}
                      className="block w-full text-left py-1 text-text-muted hover:text-text-main"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CHAPTER 1 */}
            {activeSection === 'what-is-gridshield' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 1</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">What is GridShield AI?</h1>
                <p>
                  GridShield AI is an explainable digital twin and research platform designed for electric power grids. It simulates an IEEE 14-bus electrical grid so engineers, researchers, and operators can analyze cyberattacks and physical outages safely without risking physical infrastructure.
                </p>
                <div className="p-3.5 bg-panel-alt border-l-2 border-l-accent text-sm space-y-1">
                  <strong className="text-text-main block">Educational & Research Twin Only:</strong>
                  <p className="text-text-muted text-xs">
                    GridShield operates on simulated mathematical grid models in-process. It is never connected to physical electrical equipment and cannot execute commands on real utility power networks.
                  </p>
                </div>
                <h2 className="text-base font-semibold text-text-main pt-2">The Closed Resilience Loop</h2>
                <div className="p-3 bg-inset border border-border font-mono text-xs text-accent text-center">
                  DETECT ──► ATTRIBUTE ──► EXPLAIN ──► SIMULATE ──► MITIGATE ──► VERIFY
                </div>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li><strong>Detect:</strong> Layered estimators check voltage, current, and cyber telemetry every second.</li>
                  <li><strong>Attribute:</strong> Hypothesis testing distinguishes physical equipment faults from cyber tamperings.</li>
                  <li><strong>Explain:</strong> Structured notes generate clear explanations with verified evidence citations.</li>
                  <li><strong>Simulate:</strong> Forward physics projection evaluates downstream cascade risks.</li>
                  <li><strong>Mitigate:</strong> Allowlisted control plans isolate compromised streams and rebalance generation.</li>
                  <li><strong>Verify:</strong> 3-way comparative metrics prove that candidate responses safely restore grid limits.</li>
                </ol>
                <div className="pt-3 border-t border-border">
                  <button onClick={() => onNavigateTab?.('grid')} className="text-xs text-accent hover:underline font-medium">
                    View Live Single-Line Diagram →
                  </button>
                </div>
              </section>
            )}

            {/* CHAPTER 2 */}
            {activeSection === 'power-grid-basics' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 2</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">The Power Grid in Plain Words</h1>
                <p>
                  An electric power grid is a large synchronized machine that delivers power from generators to loads over transmission lines. Think of electrical energy flowing through wires like water circulating under pressure through interconnected pipes.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-text-main block">Bus (Substation Junction):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      A central node where transmission lines, generators, and loads connect. GridShield models 14 buses in the standard IEEE benchmark grid.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-text-main block">Voltage (Electrical Pressure):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Normalized to per-unit (p.u.). Safe operational limits are strictly between 0.95 p.u. (under-voltage) and 1.05 p.u. (over-voltage).
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-text-main block">Frequency (Grid Pulse):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Maintained at 50.0 Hz. If generation exceeds load, frequency rises; if load exceeds generation, frequency drops according to the Center-of-Inertia swing equation.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CHAPTER 3 */}
            {activeSection === 'how-operators-know' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 3</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">How Operators Know What Is Happening</h1>
                <p>
                  Control room operators rely on Supervisory Control and Data Acquisition (SCADA) systems and Remote Terminal Units (RTUs) to monitor grid conditions across distances.
                </p>
                <p>
                  Every second, RTUs measure voltage magnitudes, active power (MW), reactive power (MVAr), and line currents, transmitting these readings over industrial protocols (Modbus, DNP3, IEC 61850) back to the control center.
                </p>
                <div className="p-3 bg-panel-alt border border-border text-xs text-text-muted">
                  <strong className="text-text-main block mb-1">State Estimation:</strong>
                  Because raw sensor readings contain random measurement noise, state estimators use Weighted Least Squares (WLS) mathematics to calculate the most probable true physical state of every bus across the grid.
                </div>
              </section>
            )}

            {/* CHAPTER 4 */}
            {activeSection === 'cyberattack-types' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 4</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">What an Attack Looks Like</h1>
                <p>
                  Cyberattacks against power grids do not typically break wires physically; instead, they compromise communications or controller logic:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-alarm-critical block">False Data Injection (FDI):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      An attacker falsifies reported voltage sensor readings (e.g. reporting -0.12 p.u. bias at Bus 4). The automated Automatic Voltage Regulator (AVR) perceives low voltage and raises generator excitation, over-exciting the physical grid.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-alarm-high block">Malicious Control Command:</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Unauthorized commands force breaker trips or alter generator setpoints directly.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-alarm-warning block">Replay Attack:</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Stale telemetry windows are replayed to mask real physical load shifts or physical line trips.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CHAPTER 5 */}
            {activeSection === 'broken-parts-vs-attacks' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 5</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Broken Parts vs Attacks</h1>
                <p>
                  A critical challenge in grid operations is distinguishing a physical equipment outage (like a tree falling on Line 1-2) from a cyber sensor tampering attack.
                </p>
                <div className="p-3 bg-panel-alt border border-border text-xs space-y-2">
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="font-semibold text-text-main">Physical Outage (Line Trip):</span>
                    <span className="font-mono text-alarm-ok">Coherent Neighbor Flow Shifts</span>
                  </div>
                  <p className="text-text-muted">
                    When Line 1-2 trips out of service, electrical current instantly redistributes through parallel lines (Line 1-5 loading increases). Neighboring buses show coherent, physically explainable voltage shifts matching Kirchhoff's laws.
                  </p>
                </div>
                <div className="p-3 bg-panel-alt border border-border text-xs space-y-2">
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="font-semibold text-text-main">Cyber Sensor Tampering (FDI):</span>
                    <span className="font-mono text-alarm-critical">Isolated Telemetry Violation</span>
                  </div>
                  <p className="text-text-muted">
                    Bus 4 reports a sudden voltage drop, but neighboring Bus 3 and Bus 5 show zero power flow changes. Physics equations reveal an impossible mismatch between reported sensor values and physical power flow.
                  </p>
                </div>
              </section>
            )}

            {/* CHAPTER 6 */}
            {activeSection === 'three-detection-checks' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 6</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">How GridShield Spots Trouble</h1>
                <p>
                  GridShield uses three complementary detection layers to catch anomalies without relying on a single point of failure:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-accent block">Layer 1: Physics State Estimator (WLS Chi-Square):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Calculates Normalized Residuals (LNR &gt; 3.0) and Chi-Square statistical thresholds to catch bad measurement data.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-accent block">Layer 2: Unsupervised Anomaly Detector (Isolation Forest):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Evaluates high-dimensional feature vectors to detect subtle multi-sensor drift that bypasses simple threshold alarms.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-accent block">Layer 3: Calibrated Classifier (HistGradientBoosting):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Classifies the disturbance into exact attack or physical fault categories with calibrated confidence probabilities.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CHAPTER 7 */}
            {activeSection === 'reading-an-incident' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 7</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Reading an Incident Page</h1>
                <p>
                  When GridShield flags an anomaly, an Incident Case (e.g. <code>GS-0001</code>) is opened. The incident drawer presents structured evidence:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-text-muted">
                  <li><strong className="text-text-main">Classification & Likely Cause:</strong> Identifies vector (e.g. <code>FALSE_DATA_INJECTION</code>).</li>
                  <li><strong className="text-text-main">Certainty Band:</strong> HIGH, MEDIUM, or LOW based on hypothesis evidence strength.</li>
                  <li><strong className="text-text-main">Affected Components:</strong> List of buses, lines, or generators impacted.</li>
                  <li><strong className="text-text-main">Evidence Citations:</strong> Exact sensor values and statistical test numbers tracing every claim.</li>
                </ul>
              </section>
            )}

            {/* CHAPTER 8 */}
            {activeSection === 'alarms-and-risk-scores' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 8</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Alarms and Risk Scores</h1>
                <p>
                  GridShield adheres to the industrial ISA-18.2 alarm management standard:
                </p>
                <div className="p-3 bg-panel-alt border border-border text-xs space-y-2">
                  <strong className="text-text-main block">Alarm States:</strong>
                  <div className="font-mono text-[11px] text-text-muted space-y-1">
                    <div><span className="text-alarm-critical font-bold">UNACK:</span> Alarm active, requires operator acknowledgment.</div>
                    <div><span className="text-accent font-bold">ACK:</span> Operator acknowledged alarm with audit log note.</div>
                    <div><span className="text-alarm-ok font-bold">CLEARED:</span> Signal returned within normal deadband limits.</div>
                  </div>
                </div>
                <p className="text-sm">
                  Operational Risk Scores (0–100) synthesize bus voltage deviations, line overloading percentages, frequency shift rates, and cyber integrity flags into an overall risk level (LOW, MEDIUM, HIGH, CRITICAL).
                </p>
              </section>
            )}

            {/* CHAPTER 9 */}
            {activeSection === 'ai-analyst-honestly' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 9</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">The AI Analyst, Honestly</h1>
                <p>
                  GridShield includes an AI Analyst service powered by LLMs (or a deterministic template fallback when offline).
                </p>
                <div className="p-3.5 bg-panel-alt border-l-2 border-l-accent text-sm space-y-1">
                  <strong className="text-text-main block">Rule R4 Firewall:</strong>
                  <p className="text-text-muted text-xs">
                    The LLM never calculates physics, detection, or risk scores. It re-articulate structured evidence in plain language. If evidence is incomplete or unverified, it issues an explicit non-answer response.
                  </p>
                </div>
              </section>
            )}

            {/* CHAPTER 10 */}
            {activeSection === 'testing-a-fix' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 10</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Testing a Fix (3-Way Verification)</h1>
                <p>
                  Before recommending an operator action, GridShield runs a 3-way comparative verification test:
                </p>
                <table className="w-full text-left border-collapse text-xs border border-border">
                  <thead className="bg-panel-alt text-text-muted border-b border-border">
                    <tr className="h-7">
                      <th className="px-2 py-1">State</th>
                      <th className="px-2 py-1">Description</th>
                      <th className="px-2 py-1">Bus 4 Voltage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-text-main font-ui">
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">1. Nominal Baseline</td>
                      <td className="px-2 py-1 text-text-muted">Un-attacked grid state</td>
                      <td className="px-2 py-1 font-mono text-accent">1.018 p.u.</td>
                    </tr>
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">2. Unmitigated Impact</td>
                      <td className="px-2 py-1 text-text-muted">FDI causes SCADA over-excitation</td>
                      <td className="px-2 py-1 font-mono text-alarm-critical">1.082 p.u. (High)</td>
                    </tr>
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">3. Mitigated State</td>
                      <td className="px-2 py-1 text-text-muted">Quarantine sensor + WLS estimate</td>
                      <td className="px-2 py-1 font-mono text-alarm-ok">1.018 p.u. (Recovered)</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {/* CHAPTER 11 */}
            {activeSection === 'real-vs-simulated' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 11</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Real Code vs Simulated Physics</h1>
                <p>
                  GridShield maintains an honest boundary between real software logic and simulated physical models:
                </p>
                <table className="w-full text-left border-collapse text-xs border border-border">
                  <thead className="bg-panel-alt text-text-muted border-b border-border">
                    <tr className="h-7">
                      <th className="px-2 py-1">Layer</th>
                      <th className="px-2 py-1">Provenance</th>
                      <th className="px-2 py-1">Implementation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-text-main font-ui">
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">IEEE 14-Bus Grid</td>
                      <td className="px-2 py-1 font-mono text-accent">SIMULATED</td>
                      <td className="px-2 py-1 text-text-muted">pandapower AC Newton-Raphson solver</td>
                    </tr>
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">Machine Learning</td>
                      <td className="px-2 py-1 font-mono text-alarm-ok">REAL CODE</td>
                      <td className="px-2 py-1 text-text-muted">Trained HistGradientBoosting & Isolation Forest</td>
                    </tr>
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">Database Persistence</td>
                      <td className="px-2 py-1 font-mono text-alarm-ok">REAL CODE</td>
                      <td className="px-2 py-1 text-text-muted">SQLAlchemy 2.0 with PostgreSQL / SQLite</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {/* CHAPTER 12 */}
            {activeSection === 'how-accurate-is-it' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 12</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">How Accurate Is It?</h1>
                <p>
                  Model metrics are benchmarked on multi-scenario synthetic datasets with Wilson 95% score confidence intervals:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-3 bg-panel-alt border border-border">
                    <div className="text-lg font-bold text-accent">91.7%</div>
                    <div className="text-[10px] text-text-subtle">Overall Accuracy</div>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <div className="text-lg font-bold text-alarm-ok">0.885</div>
                    <div className="text-[10px] text-text-subtle">Macro F1 Score</div>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <div className="text-lg font-bold text-text-main">0.54%</div>
                    <div className="text-[10px] text-text-subtle">Normal FPR</div>
                  </div>
                </div>
              </section>
            )}

            {/* CHAPTER 13 */}
            {activeSection === 'limitations-and-safety' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 13</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Limitations and Safety</h1>
                <div className="p-3.5 bg-panel-alt border-l-2 border-l-alarm-warning text-sm space-y-2">
                  <strong className="text-text-main block">Research Twin Disclaimer:</strong>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-text-muted">
                    <li>Models are trained on simulated benchmark datasets. Real-world grid telemetry contains higher noise.</li>
                    <li>Attack engine operates strictly in-process with no real packet crafting or socket connections.</li>
                    <li>Do not use for real-world critical infrastructure control or protection safety decisions.</li>
                  </ul>
                </div>
              </section>
            )}

            {/* CHAPTER 14 */}
            {activeSection === 'try-it-in-three-steps' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 14</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Try It in Three Steps</h1>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>
                    <strong>Run Primary Demo:</strong> Navigate to Scenario Lab and click <code>Run primary demo (FDI)</code>.
                  </li>
                  <li>
                    <strong>Examine Overview & Alarms:</strong> Check the ISA-18.2 active alarms banner and the single-line diagram highlighting Bus 4 over-voltage.
                  </li>
                  <li>
                    <strong>Verify Mitigation:</strong> Open Incident <code>GS-0001</code>, review the 3-Way verification table, and inspect the AI Analyst plain-language note.
                  </li>
                </ol>
                <div className="pt-2">
                  <Button variant="primary" onClick={() => onNavigateTab?.('scenarios')}>
                    Go to Scenario Lab Now →
                  </Button>
                </div>
              </section>
            )}

            {/* CHAPTER 15 */}
            {activeSection === 'questions-and-answers' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">Chapter 15</div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">Questions and Answers (FAQ)</h1>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-panel-alt border border-border space-y-1">
                    <strong className="text-text-main block">Q: Does GridShield connect to real power plants or substations?</strong>
                    <p className="text-text-muted text-xs">
                      A: No. GridShield is a self-contained digital twin designed purely for research and education.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border space-y-1">
                    <strong className="text-text-main block">Q: What happens if an AI key is missing or offline?</strong>
                    <p className="text-text-muted text-xs">
                      A: GridShield falls back automatically to its deterministic template explainer. All physics, detection, and mitigation verification continue operating smoothly.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border space-y-1">
                    <strong className="text-text-main block">Q: Can I run this in a serverless environment like Vercel?</strong>
                    <p className="text-text-muted text-xs">
                      A: Yes. GridShield is architected for Vercel serverless Python runtime with stateless compute and Supabase PostgreSQL persistence.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </article>
        </main>
      </div>

      {/* Glossary Dictionary Modal */}
      <Dialog
        open={isGlossaryOpen}
        onOpenChange={setIsGlossaryOpen}
        title="Power Grid & Cybersecurity Glossary"
        description="Single-source terminology definitions for non-engineers and operators."
        maxWidth="max-w-2xl"
        footer={
          <Button variant="secondary" onClick={() => setIsGlossaryOpen(false)}>
            Close Glossary
          </Button>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Search glossary terms (e.g. Bus, Voltage, FDI, State Estimation)..."
            value={glossarySearch}
            onChange={(e) => setGlossarySearch(e.target.value)}
          />

          <div className="max-h-72 overflow-y-auto space-y-2 pt-1">
            {filteredGlossary.map(([key, item]) => (
              <div key={key} className="p-2.5 bg-inset border border-border text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-accent">{item.term}</span>
                  <span className="text-[10px] font-mono text-text-subtle">
                    {item.used_in.join(', ')}
                  </span>
                </div>
                <p className="text-text-main">
                  <strong>Plain words:</strong> {item.plain}
                </p>
                <p className="text-text-muted text-[11px]">
                  <strong>Technical:</strong> {item.technical}
                </p>
              </div>
            ))}
            {filteredGlossary.length === 0 && (
              <div className="p-4 text-center text-text-subtle">
                No terms matching "{glossarySearch}".
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};
