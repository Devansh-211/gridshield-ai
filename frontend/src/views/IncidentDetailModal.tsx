import React, { useState } from 'react';
import {
  Incident,
  ImpactResult,
  MitigationPlan,
  MitigationResult,
  AnalystExplanation,
  EvidenceItem,
  MitigationInstruction,
} from '../../types/api';
import {
  simulateImpact,
  recommendMitigation,
  simulateMitigation,
  explainIncident,
} from '../api/client';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Bot,
  Zap,
  Activity,
  FileText,
  TrendingDown,
} from 'lucide-react';

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onUpdated?: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'ai' | 'impact' | 'mitigation' | 'verification'>('evidence');
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [mitigationPlan, setMitigationPlan] = useState<MitigationPlan | null>(incident.recommended_plan || null);
  const [mitigationResult, setMitigationResult] = useState<MitigationResult | null>(incident.mitigation_result || null);
  const [explanation, setExplanation] = useState<AnalystExplanation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFetchExplanation = async () => {
    setIsLoading(true);
    try {
      const exp = await explainIncident({
        incident_id: incident.incident_id,
        run_id: incident.run_id,
        classification: incident.classification,
        likely_cause: incident.attribution.likely_cause,
        certainty: incident.certainty,
        risk_level: incident.risk.risk_level,
        evidence: incident.evidence,
        affected_components: incident.affected_components,
        recommended_actions: incident.recommended_plan?.actions.map((a: MitigationInstruction) => a.justification) || [],
        model_version: incident.model_version,
      });
      setExplanation(exp);
    } catch (err) {
      console.error('Explanation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateImpact = async () => {
    setIsLoading(true);
    try {
      const res = await simulateImpact(incident.incident_id, 25);
      setImpactResult(res);
      setActiveTab('impact');
    } catch (err) {
      console.error('Impact simulation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateMitigation = async () => {
    setIsLoading(true);
    try {
      const plan = mitigationPlan || (await recommendMitigation(incident.incident_id));
      setMitigationPlan(plan);
      const res = await simulateMitigation(incident.incident_id, plan);
      setMitigationResult(res);
      setActiveTab('verification');
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Mitigation simulation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const physicalEvidence = incident.evidence.filter((e: EvidenceItem) => e.domain === 'PHYSICAL' || e.domain === 'STATE_ESTIMATOR');
  const cyberEvidence = incident.evidence.filter((e: EvidenceItem) => e.domain === 'CYBER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-card border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-mono font-bold text-white uppercase">
                  Incident Detail: {incident.incident_id}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800">
                  {incident.classification}
                </span>
                <ProvenanceBadge provenance="CALCULATED" />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Created at Step {incident.created_at_step} • Affected: {incident.affected_components.join(', ')} • Risk:{' '}
                <span className="text-rose-400 font-bold">{incident.risk.risk_level}</span> ({incident.risk.overall_risk_score.toFixed(1)}/100)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-slate-900/60 px-4 text-xs font-mono">
          {[
            { id: 'evidence', label: '1. Evidence & Attribution' },
            { id: 'ai', label: '2. AI Explanation (Why?)' },
            { id: 'impact', label: '3. Impact Simulation' },
            { id: 'mitigation', label: '4. Mitigation Plan' },
            { id: 'verification', label: '5. 3-Way Verification' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-4">
          {/* TAB 1: EVIDENCE & ATTRIBUTION */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="bg-background p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Attribution Engine Likely Cause:</span>
                  <span className="text-base font-bold text-cyan-400 uppercase">
                    {incident.attribution.likely_cause}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Certainty Band:</span>
                  <span className="text-amber-400 font-bold uppercase">{incident.certainty}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Model Version:</span>
                  <span className="text-white font-bold">{incident.model_version}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Evidence Column */}
                <div className="bg-background p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-400 uppercase flex items-center">
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      Physical / Electrical Evidence ({physicalEvidence.length})
                    </span>
                    <ProvenanceBadge provenance="OBSERVED" />
                  </div>
                  {physicalEvidence.map((ev: EvidenceItem) => (
                    <div key={ev.id} className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-cyan-300">[{ev.id}] {ev.metric_name}</span>
                        <span className="text-slate-400 font-semibold">{ev.domain}</span>
                      </div>
                      <p className="text-slate-300">{ev.description}</p>
                      <div className="text-[10px] text-slate-400">
                        Observed: <span className="text-white">{String(ev.observed_value)}</span> | Expected: <span className="text-white">{String(ev.expected_value ?? 'N/A')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cyber Evidence Column */}
                <div className="bg-background p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-purple-400 uppercase flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                      Cyber / Protocol Evidence ({cyberEvidence.length})
                    </span>
                    <ProvenanceBadge provenance="OBSERVED" />
                  </div>
                  {cyberEvidence.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No cyber anomalies logged in this window.</p>
                  ) : (
                    cyberEvidence.map((ev: EvidenceItem) => (
                      <div key={ev.id} className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-purple-300">[{ev.id}] {ev.metric_name}</span>
                          <span className="text-slate-400 font-semibold">{ev.domain}</span>
                        </div>
                        <p className="text-slate-300">{ev.description}</p>
                        <div className="text-[10px] text-slate-400">
                          Observed: <span className="text-white">{String(ev.observed_value)}</span> | Expected: <span className="text-white">{String(ev.expected_value ?? '0')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI EXPLANATION */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-xs uppercase">Structured AI Explainability Synthesis</span>
                </div>
                <button
                  onClick={handleFetchExplanation}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold shadow transition disabled:opacity-50"
                >
                  {isLoading ? 'Synthesizing...' : 'Generate AI Explanation'}
                </button>
              </div>

              {explanation ? (
                <div className="bg-background p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm">{explanation.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-400">
                      {explanation.is_template_fallback ? 'Deterministic Template (Grounded)' : 'LLM Synthesized'}
                    </span>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold block mb-0.5">What Happened:</span>
                    <p className="text-slate-300">{explanation.what_happened}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold block mb-0.5">Where:</span>
                    <p className="text-slate-300">{explanation.where}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold block mb-0.5">Why & Root Cause:</span>
                    <p className="text-slate-300">{explanation.why}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold block mb-0.5">Cyber vs Physical Contrast:</span>
                    <p className="text-slate-300">{explanation.cyber_vs_physical}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold block mb-0.5">Recommended Actions:</span>
                    <p className="text-slate-300">{explanation.recommended_actions}</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-background rounded-xl border border-slate-800 text-slate-400">
                  Click "Generate AI Explanation" to generate a grounded explanation citing evidence IDs.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPACT SIMULATION */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs uppercase block">Consequence Projection ("If Ignored")</span>
                  <span className="text-slate-400 text-[11px]">Forward AC power flow simulation with SCADA controller active.</span>
                </div>
                <button
                  onClick={handleSimulateImpact}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold shadow transition disabled:opacity-50"
                >
                  {isLoading ? 'Simulating...' : 'Simulate Forward Impact'}
                </button>
              </div>

              {impactResult ? (
                <div className="bg-background p-4 rounded-xl border border-rose-500/30 space-y-3">
                  <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-300 font-semibold">
                    {impactResult.summary}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Voltage Violations:</span>
                      <span className="text-base font-bold text-rose-400">{impactResult.unmitigated_metrics.voltage_violations_count}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Max Line Loading:</span>
                      <span className="text-base font-bold text-white">{impactResult.unmitigated_metrics.max_line_loading_pct}%</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Grid Frequency:</span>
                      <span className="text-base font-bold text-white">{impactResult.unmitigated_metrics.frequency_hz} Hz</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Operational Risk:</span>
                      <span className="text-base font-bold text-rose-400">{impactResult.unmitigated_metrics.operational_risk_score.toFixed(1)}/100</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-background rounded-xl border border-slate-800 text-slate-400">
                  Click "Simulate Forward Impact" to calculate grid degradation if left unaddressed.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MITIGATION PLAN */}
          {activeTab === 'mitigation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs uppercase block">Allowlisted Mitigation Catalog</span>
                  <span className="text-slate-400 text-[11px]">Strict in-process cyber-physical remediation instructions.</span>
                </div>
                <button
                  onClick={handleSimulateMitigation}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow transition disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Execute Mitigation & Verify'}
                </button>
              </div>

              <div className="space-y-2">
                {incident.recommended_plan?.actions.map((act: MitigationInstruction, idx: number) => (
                  <div key={idx} className="p-3.5 bg-background rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 uppercase">
                        Action {idx + 1}: {act.action_type}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 text-[10px]">
                        Target: {act.target_component}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{act.justification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: 3-WAY VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs uppercase block">3-Way Comparative Verification</span>
                  <span className="text-slate-400 text-[11px]">Original Baseline vs Unmitigated Attack vs Mitigated Result.</span>
                </div>
                <button
                  onClick={handleSimulateMitigation}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold shadow transition disabled:opacity-50"
                >
                  {isLoading ? 'Re-Verifying...' : 'Re-Run Verification'}
                </button>
              </div>

              {mitigationResult ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
                      mitigationResult.success
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    {mitigationResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="font-bold text-xs">{mitigationResult.summary}</span>
                  </div>

                  {/* 3-Way Comparison Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-background">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase">
                        <tr>
                          <th className="p-2.5">Metric</th>
                          <th className="p-2.5 text-emerald-400">1. Baseline (Clean)</th>
                          <th className="p-2.5 text-rose-400">2. Unmitigated</th>
                          <th className="p-2.5 text-cyan-400">3. Mitigated (Verified)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr>
                          <td className="p-2.5 font-bold">Max Voltage Dev (p.u.)</td>
                          <td className="p-2.5">{mitigationResult.baseline_metrics.max_voltage_deviation_pu}</td>
                          <td className="p-2.5 text-rose-400 font-bold">{mitigationResult.unmitigated_impact_metrics.max_voltage_deviation_pu}</td>
                          <td className="p-2.5 text-cyan-400 font-bold">{mitigationResult.mitigated_metrics.max_voltage_deviation_pu}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold">Voltage Violations</td>
                          <td className="p-2.5">{mitigationResult.baseline_metrics.voltage_violations_count}</td>
                          <td className="p-2.5 text-rose-400 font-bold">{mitigationResult.unmitigated_impact_metrics.voltage_violations_count}</td>
                          <td className="p-2.5 text-cyan-400 font-bold">{mitigationResult.mitigated_metrics.voltage_violations_count}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold">Max Line Loading (%)</td>
                          <td className="p-2.5">{mitigationResult.baseline_metrics.max_line_loading_pct}%</td>
                          <td className="p-2.5">{mitigationResult.unmitigated_impact_metrics.max_line_loading_pct}%</td>
                          <td className="p-2.5">{mitigationResult.mitigated_metrics.max_line_loading_pct}%</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold">Operational Risk Score</td>
                          <td className="p-2.5">{mitigationResult.baseline_metrics.operational_risk_score.toFixed(1)} ({mitigationResult.baseline_metrics.risk_level})</td>
                          <td className="p-2.5 text-rose-400 font-bold">{mitigationResult.unmitigated_impact_metrics.operational_risk_score.toFixed(1)} ({mitigationResult.unmitigated_impact_metrics.risk_level})</td>
                          <td className="p-2.5 text-cyan-400 font-bold">{mitigationResult.mitigated_metrics.operational_risk_score.toFixed(1)} ({mitigationResult.mitigated_metrics.risk_level})</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold">State Estimator Error RMSE</td>
                          <td className="p-2.5">{mitigationResult.baseline_metrics.state_estimation_error_rmse}</td>
                          <td className="p-2.5 text-rose-400">{mitigationResult.unmitigated_impact_metrics.state_estimation_error_rmse}</td>
                          <td className="p-2.5 text-emerald-400 font-bold">{mitigationResult.mitigated_metrics.state_estimation_error_rmse}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-background rounded-xl border border-slate-800 text-slate-400">
                  Click "Execute Mitigation & Verify" to simulate remediation and generate the 3-way verification report.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-card border-t border-border flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
