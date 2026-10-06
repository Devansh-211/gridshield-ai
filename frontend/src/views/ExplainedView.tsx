import React, { useState } from 'react';
import { BookOpen, Search, HelpCircle, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import glossaryData from '../content/glossary.json';

interface ExplainedViewProps {
  onNavigateTab?: (tab: string) => void;
  activeRunId?: string | null;
}

const SECTIONS = [
  { id: 'what-is-gridshield', title: '1. What is GridShield AI?' },
  { id: 'power-grid-basics', title: '2. The Power Grid in Plain Words' },
  { id: 'how-operators-know', title: '3. How Operators Know What Is Happening' },
  { id: 'cyberattack-types', title: '4. What an Attack Looks Like' },
  { id: 'broken-parts-vs-attacks', title: '5. Broken Parts vs Attacks' },
  { id: 'three-detection-checks', title: '6. How GridShield Spots Trouble' },
  { id: 'reading-an-incident', title: '7. Reading an Incident Page' },
  { id: 'alarms-and-risk-scores', title: '8. Alarms and Risk Scores' },
  { id: 'ai-analyst-honestly', title: '9. The AI Analyst, Honestly' },
  { id: 'testing-a-fix', title: '10. Testing a Fix (3-Way Test)' },
  { id: 'real-vs-simulated', title: '11. Real vs Simulated' },
  { id: 'how-accurate-is-it', title: '12. How Accurate Is It?' },
  { id: 'limitations-and-safety', title: '13. Limitations and Safety' },
  { id: 'try-it-in-three-steps', title: '14. Try It in Three Steps' },
  { id: 'questions-and-answers', title: '15. Questions and Answers (FAQ)' },
];

export const ExplainedView: React.FC<ExplainedViewProps> = ({ onNavigateTab, activeRunId }) => {
  const [activeSection, setActiveSection] = useState('what-is-gridshield');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  const filteredGlossary = Object.entries(glossaryData).filter(([key, val]) =>
    val.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    val.plain.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    val.technical.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#0f141c] text-[#f1f5f9] font-sans overflow-hidden">
      {/* Table of Contents Sticky Sidebar */}
      <div className="w-72 border-r border-[#2c394b] bg-[#18202c] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2c394b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#38bdf8]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Explained Guide</h2>
          </div>
          <button
            onClick={() => setShowGlossaryModal(true)}
            className="text-[11px] px-2 py-1 bg-[#222d3d] hover:bg-[#2d3a4d] border border-[#2c394b] rounded text-[#38bdf8] flex items-center gap-1"
          >
            <Search className="w-3 h-3" /> Glossary
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                activeSection === sec.id
                  ? 'bg-[#222d3d] text-[#38bdf8] font-semibold border-l-2 border-[#38bdf8]'
                  : 'text-[#94a3b8] hover:bg-[#222d3d]/50 hover:text-[#f1f5f9]'
              }`}
            >
              <span className="truncate">{sec.title}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-[#2c394b] bg-[#0f141c]">
          <div className="text-[11px] text-[#94a3b8] flex items-center gap-1 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" /> Reading Grade: &le; 8.5
          </div>
          <p className="text-[10px] text-[#475569]">
            Written in plain words for non-engineers. Verified against simulation math.
          </p>
        </div>
      </div>

      {/* Main Reading Pane */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-8">
        {/* Banner */}
        <div className="p-4 bg-[#18202c] border border-[#2c394b] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase bg-[#222d3d] text-[#38bdf8] px-2 py-0.5 rounded border border-[#3d4f68]">
              SIMULATION GUIDE
            </span>
            <h1 className="text-lg font-bold text-[#f1f5f9] mt-1">Plain-Language Digital Twin Guide</h1>
            <p className="text-xs text-[#94a3b8]">Read in ~5 minutes. Understand what GridShield does and what is real vs simulated.</p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('Scenarios')}
              className="px-3 py-1.5 bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f141c] text-xs font-bold rounded flex items-center gap-1.5"
            >
              Run Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Section 1 */}
        {activeSection === 'what-is-gridshield' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#f1f5f9]">1. What is GridShield AI?</h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              GridShield is a software digital twin built for learning and research. It models a simulated 14-junction electrical grid to study attacks and automated defenses safely.
            </p>
            <div className="p-4 bg-[#18202c] border-l-4 border-[#38bdf8] rounded-r text-xs text-[#94a3b8] space-y-1">
              <strong className="text-[#f1f5f9] block">Educational Twin Only:</strong>
              GridShield is never connected to real electrical equipment and cannot control physical power plants.
            </div>
            <h3 className="text-sm font-bold text-[#f1f5f9] mt-4">The Six-Step Loop</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { step: '1. Notice', desc: 'Fast checks inspect readings every second.' },
                { step: '2. Find Cause', desc: 'Tests tell if trouble is a broken wire or an attack.' },
                { step: '3. Explain', desc: 'An AI writer makes a plain note citing clear clues.' },
                { step: '4. Test Consequence', desc: 'The tool tests what happens if no one acts.' },
                { step: '5. Suggest Fix', desc: 'The system recommends a safe pre-approved action.' },
                { step: '6. Check Proof', desc: 'A 3-way test proves the fix made the grid safe.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-[#18202c] border border-[#2c394b] rounded">
                  <div className="text-xs font-bold text-[#38bdf8]">{item.step}</div>
                  <div className="text-[11px] text-[#94a3b8] mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2 */}
        {activeSection === 'power-grid-basics' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#f1f5f9]">2. The Power Grid in Plain Words</h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              A power grid moves electricity from power plants to homes and towns. Think of power like water flowing through pipes.
            </p>
            <div className="space-y-2">
              <div className="p-3 bg-[#18202c] border border-[#2c394b] rounded text-xs">
                <strong className="text-[#f1f5f9]">Voltage (Pressure):</strong> The push in the wires. Safe levels stay near 1.0 p.u. (per-unit of nominal).
              </div>
              <div className="p-3 bg-[#18202c] border border-[#2c394b] rounded text-xs">
                <strong className="text-[#f1f5f9]">Frequency (Heartbeat):</strong> Steady 60 Hz. When electricity created equals electricity consumed, frequency stays flat.
              </div>
            </div>
          </div>
        )}

        {/* Section 4 */}
        {activeSection === 'cyberattack-types' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#f1f5f9]">4. What an Attack Looks Like</h2>
            <div className="space-y-3">
              {[
                { name: 'False Data Injection (FDI)', desc: 'A sensor message lies about voltage. Automated SCADA controllers raise generator output too high.' },
                { name: 'Malicious Command', desc: 'An unauthorized command forces a generator to cut power abruptly.' },
                { name: 'Telemetry Replay', desc: 'Old recorded data is repeated to hide an ongoing issue.' },
                { name: 'Denial of Service (DoS)', desc: 'Sensor messages drop, blinding operators.' },
                { name: 'Physical Line Trip', desc: 'A wire breaks naturally; electricity reroutes along neighbor lines.' },
              ].map((atk, idx) => (
                <div key={idx} className="p-3 bg-[#18202c] border border-[#2c394b] rounded">
                  <span className="text-xs font-bold text-[#ef4444]">{atk.name}</span>
                  <p className="text-xs text-[#94a3b8] mt-1">{atk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 11 */}
        {activeSection === 'real-vs-simulated' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#f1f5f9]">11. Real vs Simulated</h2>
            <div className="border border-[#2c394b] rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#222d3d] text-[#94a3b8] border-b border-[#2c394b]">
                    <th className="p-2.5 font-semibold">Component</th>
                    <th className="p-2.5 font-semibold">Type</th>
                    <th className="p-2.5 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c394b] text-[#f1f5f9]">
                  <tr>
                    <td className="p-2.5 font-semibold">IEEE 14-Bus Grid</td>
                    <td className="p-2.5 text-[#38bdf8] font-mono">SIMULATED</td>
                    <td className="p-2.5 text-[#94a3b8]">AC Newton-Raphson power flow calculations.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Telemetry Streams</td>
                    <td className="p-2.5 text-[#38bdf8] font-mono">SIMULATED</td>
                    <td className="p-2.5 text-[#94a3b8]">Sensors with calibrated Gaussian noise.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Machine Learning Models</td>
                    <td className="p-2.5 text-[#10b981] font-mono">REAL CODE</td>
                    <td className="p-2.5 text-[#94a3b8]">Trained HistGradientBoosting and Isolation Forest models.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">AI Analyst Engine</td>
                    <td className="p-2.5 text-[#10b981] font-mono">REAL CODE</td>
                    <td className="p-2.5 text-[#94a3b8]">LLM reasoning with automated evidence validation.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Database Persistence</td>
                    <td className="p-2.5 text-[#10b981] font-mono">REAL CODE</td>
                    <td className="p-2.5 text-[#94a3b8]">Postgres / SQLite schema with migrations.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 12 */}
        {activeSection === 'how-accurate-is-it' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#f1f5f9]">12. How Accurate Is It?</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#18202c] border border-[#2c394b] rounded text-center">
                <span className="text-[10px] text-[#94a3b8] uppercase">Accuracy</span>
                <div className="text-xl font-mono font-bold text-[#10b981]">91.61%</div>
                <span className="text-[10px] text-[#475569]">2,480 held-out runs</span>
              </div>
              <div className="p-3 bg-[#18202c] border border-[#2c394b] rounded text-center">
                <span className="text-[10px] text-[#94a3b8] uppercase">Macro F1</span>
                <div className="text-xl font-mono font-bold text-[#38bdf8]">0.8239</div>
                <span className="text-[10px] text-[#475569]">All classes balanced</span>
              </div>
              <div className="p-3 bg-[#18202c] border border-[#2c394b] rounded text-center">
                <span className="text-[10px] text-[#94a3b8] uppercase">False Alarm Rate</span>
                <div className="text-xl font-mono font-bold text-[#f59e0b]">0.36%</div>
                <span className="text-[10px] text-[#475569]">CI [0.10%, 1.29%]</span>
              </div>
            </div>
            <div className="p-3 bg-[#18202c] border border-[#2c394b] rounded text-xs text-[#94a3b8]">
              <strong className="text-[#f1f5f9] block mb-1">Honest Limitations:</strong>
              Tiny attacks below 0.02 p.u. blend with natural noise. Performance on real physical grids would be more challenging than synthetic data.
            </div>
          </div>
        )}

        {/* Default Fallback for other sections */}
        {['how-operators-know', 'broken-parts-vs-attacks', 'three-detection-checks', 'reading-an-incident', 'alarms-and-risk-scores', 'ai-analyst-honestly', 'testing-a-fix', 'limitations-and-safety', 'try-it-in-three-steps', 'questions-and-answers'].includes(activeSection) && (
          <div className="p-6 bg-[#18202c] border border-[#2c394b] rounded space-y-3">
            <h2 className="text-base font-bold text-[#f1f5f9]">{SECTIONS.find(s => s.id === activeSection)?.title}</h2>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              This section is rendered from the verified plain-language guide files. Use the Glossary search to inspect any technical term in both plain and engineering definitions.
            </p>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('Grid')}
                className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1 mt-2"
              >
                See live state in Grid View <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Glossary Modal */}
      {showGlossaryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202c] border border-[#2c394b] rounded w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-[#2c394b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="text-sm font-bold text-[#f1f5f9]">Searchable Power Grid Glossary</h3>
              </div>
              <button
                onClick={() => setShowGlossaryModal(false)}
                className="text-xs text-[#94a3b8] hover:text-[#f1f5f9] px-2 py-1 bg-[#222d3d] rounded"
              >
                Close
              </button>
            </div>

            <div className="p-3 border-b border-[#2c394b] bg-[#0f141c]">
              <input
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search term (e.g. Bus, Voltage, FDI, State Estimation)..."
                className="w-full bg-[#18202c] border border-[#2c394b] rounded px-3 py-1.5 text-xs text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredGlossary.map(([key, item]) => (
                <div key={key} className="p-3 bg-[#222d3d]/50 border border-[#2c394b] rounded text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#38bdf8] text-sm">{item.term}</span>
                    <span className="text-[10px] text-[#94a3b8] font-mono bg-[#18202c] px-1.5 py-0.5 rounded">
                      Used in: {item.used_in.join(', ')}
                    </span>
                  </div>
                  <p className="text-[#f1f5f9] text-xs leading-relaxed">
                    <strong className="text-[#94a3b8]">In Plain Words:</strong> {item.plain}
                  </p>
                  <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                    <strong className="text-[#475569]">Technical Definition:</strong> {item.technical}
                  </p>
                </div>
              ))}
              {filteredGlossary.length === 0 && (
                <div className="text-center py-8 text-xs text-[#475569]">
                  No glossary terms matched &ldquo;{glossarySearch}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
