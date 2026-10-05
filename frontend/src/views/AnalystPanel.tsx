import React, { useState } from 'react';
import { Incident, AnalystQuestionResponse } from '../../types/api';
import { askAnalyst } from '../api/client';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { Bot, Send, Zap, CheckCircle2, ShieldAlert, CornerDownRight } from 'lucide-react';

interface AnalystPanelProps {
  incidents: Incident[];
}

export const AnalystPanel: React.FC<AnalystPanelProps> = ({ incidents }) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents[0]?.incident_id || 'GS-0001'
  );
  const [question, setQuestion] = useState<string>('What happens if we quarantine Bus 4?');
  const [history, setHistory] = useState<
    Array<{
      question: string;
      response: AnalystQuestionResponse;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const res = await askAnalyst({
        incident_id: selectedIncidentId,
        question: question.trim(),
      });
      setHistory((prev) => [...prev, { question: question.trim(), response: res }]);
      setQuestion('');
    } catch (err) {
      console.error('Ask analyst failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'What happens if we quarantine Bus 4?',
    'What if we revert the generator setpoint on Gen 2?',
    'Why was this attributed to cyber instead of a physical fault?',
    'What is the consequence if we take no action?',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase">
              AI Cyber-Physical Resilience Analyst
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulation-first interactive assistant with allowlisted action extraction and forward verification.
          </p>
        </div>
        <ProvenanceBadge provenance="LLM" />
      </div>

      {/* Incident Selector */}
      <div className="bg-surface/90 border border-border rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Context Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-background border border-slate-700 rounded-lg p-1.5 text-cyan-400 font-bold outline-none"
          >
            {incidents.length === 0 ? (
              <option value="GS-0001">GS-0001 (Active Session)</option>
            ) : (
              incidents.map((inc) => (
                <option key={inc.incident_id} value={inc.incident_id}>
                  {inc.incident_id} — {inc.classification} ({inc.affected_components.join(', ')})
                </option>
              ))
            )}
          </select>
        </div>
        <span className="text-[11px] text-slate-400">
          Temperature: 0.0 • Strict Grounding Enabled
        </span>
      </div>

      {/* Chat History */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Bot className="w-10 h-10 text-cyan-500/40 mx-auto animate-bounce" />
            <p>Ask a question about the active incident or propose a mitigation action to simulate.</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuestion(q)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-full text-[11px] transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="space-y-2">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-xl p-3 max-w-[80%] text-cyan-200">
                  <span className="text-[10px] text-cyan-400 block font-bold mb-0.5">OPERATOR</span>
                  <p>{item.question}</p>
                </div>
              </div>

              {/* Analyst Answer */}
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-xl p-3.5 max-w-[85%] text-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                      <Bot className="w-3 h-3 mr-1" />
                      ANALYST (VERIFIED SIMULATION)
                    </span>
                    <ProvenanceBadge
                      provenance={item.response.provenance || 'CALCULATED'}
                    />
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-300">{item.response.answer}</p>

                  {item.response.proposed_action && (
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] space-y-0.5">
                      <div className="flex justify-between font-bold text-cyan-400">
                        <span>Extracted Action: {item.response.proposed_action.action_type}</span>
                        <span>Target: {item.response.proposed_action.target_component}</span>
                      </div>
                      <p className="text-slate-400">{item.response.proposed_action.justification}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleAsk} className="flex items-center space-x-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question or propose an action (e.g. 'What if we quarantine Bus 4?')..."
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isLoading ? 'Running...' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
};
