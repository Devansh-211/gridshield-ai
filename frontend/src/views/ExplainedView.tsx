import React, { useState } from 'react';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
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
  activeRunId,
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
            <span className="text-text-muted">15 Chapters (Flesch-Kincaid ≤ 8.5)</span>
          </div>
        }
        right={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsGlossaryOpen(true)}
          >
            Glossary Dictionary
          </Button>
        }
      />

      {/* Main Document Layout: Sticky 220px TOC | Max 72ch Reading Column */}
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

        {/* Center: Reading Column (Max 72ch) */}
        <main className="flex-1 overflow-y-auto bg-panel p-4 md:p-8 flex justify-center">
          <article className="w-full max-w-[72ch] text-[15px] leading-[1.65] text-text-main font-ui space-y-6">
            {/* Mobile TOC Disclosure */}
            <div className="md:hidden border border-border p-2 bg-panel-alt rounded-sm">
              <button
                onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
                className="w-full text-left font-semibold text-xs text-text-main flex justify-between"
              >
                <span>Jump to Chapter: {SECTIONS.find((s) => s.id === activeSection)?.title}</span>
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
                <div className="text-xs font-mono text-text-subtle uppercase">
                  Chapter 1
                </div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">
                  What is GridShield AI?
                </h1>
                <p>
                  GridShield is a software digital twin built for research and education. It models a simulated 14-bus power grid so engineers and researchers can study cyberattacks and automated resilience strategies safely.
                </p>

                {/* Callout */}
                <div className="p-3.5 bg-panel-alt border-l-2 border-l-accent text-sm space-y-1">
                  <strong className="text-text-main block">Educational Twin Only:</strong>
                  <p className="text-text-muted text-xs">
                    GridShield is never connected to physical electrical equipment and cannot control real utility power generators.
                  </p>
                </div>

                <h2 className="text-base font-semibold text-text-main pt-2">
                  The Six-Step Resilience Loop
                </h2>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li><strong>Detect:</strong> Fast mathematical checks inspect telemetry every second.</li>
                  <li><strong>Attribute:</strong> Statistical tests distinguish physical faults from cyber manipulation.</li>
                  <li><strong>Explain:</strong> Structured notes cite specific verified evidence points.</li>
                  <li><strong>Simulate Consequence:</strong> Projects grid degradation if left unaddressed.</li>
                  <li><strong>Recommend Fix:</strong> Generates allowlisted corrective actions.</li>
                  <li><strong>Verify Proof:</strong> A 3-way comparative test proves the fix restored nominal limits.</li>
                </ol>

                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => onNavigateTab?.('grid')}
                    className="text-xs text-accent hover:underline font-medium inline-flex items-center space-x-1"
                  >
                    <span>See the live single-line grid diagram →</span>
                  </button>
                </div>
              </section>
            )}

            {/* CHAPTER 2 */}
            {activeSection === 'power-grid-basics' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">
                  Chapter 2
                </div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">
                  The Power Grid in Plain Words
                </h1>
                <p>
                  An electrical power grid transmits energy from generation sources to industrial substations and homes. Think of power flow like water circulating through interconnected pipes under pressure.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-text-main block">Voltage (Electrical Pressure):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      The push in the wires. Nominal voltage is normalized to 1.0 p.u. (per-unit). Safe operational limits remain strictly between 0.95 and 1.05 p.u.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-text-main block">Frequency (Grid Heartbeat):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Maintained at exactly 50.0 Hz. When total electrical generation matches consumption, frequency is steady. If generation drops, frequency falls.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CHAPTER 4 */}
            {activeSection === 'cyberattack-types' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">
                  Chapter 4
                </div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">
                  What an Attack Looks Like
                </h1>
                <p>
                  Cyber-physical attacks manipulate telemetry signals or SCADA control commands rather than cutting physical wires directly:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-alarm-critical block">False Data Injection (FDI):</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      An adversary alters reported sensor voltage telemetry. The automated generator controller (AVR) reacts to the false low reading by increasing real voltage, creating true physical over-voltage stress.
                    </p>
                  </div>
                  <div className="p-3 bg-panel-alt border border-border">
                    <strong className="text-alarm-high block">Malicious Control Command:</strong>
                    <p className="text-text-muted text-xs mt-0.5">
                      Tampered supervisory commands force generator setpoints or switch settings to unsafe operational states.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CHAPTER 11 */}
            {activeSection === 'real-vs-simulated' && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">
                  Chapter 11
                </div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">
                  Real Code vs Simulated Physics
                </h1>
                <p>
                  GridShield maintains an honest boundary between what is real software and what is simulated physics:
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
                      <td className="px-2 py-1 text-text-muted">pandapower AC Newton-Raphson power flow solver</td>
                    </tr>
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">Machine Learning</td>
                      <td className="px-2 py-1 font-mono text-alarm-ok">REAL CODE</td>
                      <td className="px-2 py-1 text-text-muted">Trained HistGradientBoosting & Isolation Forest</td>
                    </tr>
                    <tr className="h-7">
                      <td className="px-2 py-1 font-semibold">Database Persistence</td>
                      <td className="px-2 py-1 font-mono text-alarm-ok">REAL CODE</td>
                      <td className="px-2 py-1 text-text-muted">SQLAlchemy 2.0 with Supabase Postgres / SQLite</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {/* DEFAULT FALLBACK FOR OTHER CHAPTERS */}
            {!['what-is-gridshield', 'power-grid-basics', 'cyberattack-types', 'real-vs-simulated'].includes(activeSection) && (
              <section className="space-y-4">
                <div className="text-xs font-mono text-text-subtle uppercase">
                  Chapter {SECTIONS.find((s) => s.id === activeSection)?.num}
                </div>
                <h1 className="text-xl font-semibold text-text-main tracking-tight">
                  {SECTIONS.find((s) => s.id === activeSection)?.title}
                </h1>
                <p className="text-text-muted">
                  This chapter is part of the 15-chapter plain-language guide. Every technical term used is defined in the single-source glossary dictionary.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsGlossaryOpen(true)}
                  >
                    Open Glossary Term Dictionary
                  </Button>
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
