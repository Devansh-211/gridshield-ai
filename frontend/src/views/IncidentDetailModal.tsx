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
import { Status } from '../ui/Status';
import { ProvenanceChip } from '../ui/ProvenanceChip';
import { Button } from '../ui/Button';
import { PropertyGrid } from '../ui/PropertyGrid';
import { Tabs } from '../ui/Tabs';
import { Dialog } from '../ui/Dialog';
import { formatVoltage, formatLoading, formatPower } from '../lib/formatters';

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onUpdated?: () => void;
}

const LIFECYCLE_STEPS = [
  'DETECTED',
  'INVESTIGATING',
  'MITIGATION_PROPOSED',
  'SIMULATION_RUNNING',
  'MITIGATION_VERIFIED',
  'RESOLVED',
];

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<string>('evidence');
  const [isPlainMode, setIsPlainMode] = useState<boolean>(true);
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [mitigationPlan, setMitigationPlan] = useState<MitigationPlan | null>(
    incident.recommended_plan || null
  );
  const [mitigationResult, setMitigationResult] = useState<MitigationResult | null>(
    incident.mitigation_result || null
  );
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
        recommended_actions:
          incident.recommended_plan?.actions.map(
            (a: MitigationInstruction) => a.justification
          ) || [],
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
      const plan =
        mitigationPlan || (await recommendMitigation(incident.incident_id));
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

  const physicalEvidence = incident.evidence.filter(
    (e: EvidenceItem) => e.domain === 'PHYSICAL' || e.domain === 'STATE_ESTIMATOR'
  );
  const cyberEvidence = incident.evidence.filter(
    (e: EvidenceItem) => e.domain === 'CYBER'
  );

  const currentStepIdx = LIFECYCLE_STEPS.indexOf(incident.status);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={`${incident.incident_id} — ${incident.attribution.likely_cause} on ${incident.affected_components.join(', ')}`}
      maxWidth="max-w-5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Status status={incident.risk.risk_level} />
            <span className="text-[11px] font-mono text-text-muted">
              Certainty: <strong className="text-text-main">{incident.certainty}</strong>
            </span>
            <ProvenanceChip provenance={incident.provenance} />
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col space-y-3 font-ui text-xs">
        {/* Status Stepper (Text segments separated by ›, no colored circles) */}
        <div className="p-2 bg-panel-alt border border-border flex items-center justify-between text-[11px] font-mono select-none overflow-x-auto">
          <span className="text-text-subtle font-semibold mr-2">Lifecycle:</span>
          <div className="flex items-center space-x-2">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCurrent = idx === (currentStepIdx >= 0 ? currentStepIdx : 0);
              const isPast = idx < currentStepIdx;

              return (
                <React.Fragment key={step}>
                  {idx > 0 && <span className="text-border-strong">›</span>}
                  <span
                    className={
                      isCurrent
                        ? 'font-bold text-accent'
                        : isPast
                        ? 'text-text-muted'
                        : 'text-text-subtle'
                    }
                  >
                    {step}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* In Plain Words Summary Strip */}
        <div className="p-2.5 bg-inset border border-border text-xs text-text-main flex items-start justify-between">
          <div className="pr-4">
            <span className="font-semibold text-text-muted mr-1">
              Summary:
            </span>
            {isPlainMode ? (
              <span>
                The digital twin detected anomalous data on{' '}
                <strong>{incident.affected_components.join(', ')}</strong>. The attribution engine identified a{' '}
                <strong>{incident.attribution.likely_cause}</strong> with{' '}
                <strong>{incident.certainty}</strong> certainty. Measured telemetry diverged from physical grid constraints.
              </span>
            ) : (
              <span>
                WLS residual test J(x̂) exceeded threshold (Chi-squared test). Attribution class: {incident.classification} with hypothesis {incident.attribution.likely_cause}. Model version: {incident.model_version}.
              </span>
            )}
          </div>
          <button
            onClick={() => setIsPlainMode(!isPlainMode)}
            className="text-[11px] font-mono text-accent hover:underline shrink-0"
          >
            [{isPlainMode ? 'Technical' : 'Plain words'}]
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { id: 'evidence', label: `Evidence (${incident.evidence.length})` },
            { id: 'analyst', label: 'Analyst Note' },
            { id: 'impact', label: 'Consequence Projection' },
            { id: 'mitigation', label: 'Mitigation Catalog' },
            { id: 'verification', label: '3-Way Verification' },
          ]}
        >
          <div className="pt-2">
            {/* TAB 1: EVIDENCE */}
            {activeTab === 'evidence' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Physical Evidence */}
                <div className="border border-border bg-panel">
                  <div className="h-7 px-2 bg-panel-alt border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-text-main">
                      Electrical & State Estimation Evidence ({physicalEvidence.length})
                    </span>
                    <ProvenanceChip provenance="OBS" />
                  </div>
                  <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
                    {physicalEvidence.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2 bg-inset border border-border/60 text-[11px]"
                      >
                        <div className="flex justify-between font-mono font-semibold">
                          <span className="text-accent">[{ev.id}] {ev.metric_name}</span>
                          <span className="text-text-subtle">{ev.domain}</span>
                        </div>
                        <p className="text-text-muted mt-0.5">{ev.description}</p>
                        <div className="font-mono text-[10px] text-text-subtle mt-1">
                          Obs: <strong className="text-text-main">{String(ev.observed_value)}</strong> | Exp: <strong className="text-text-main">{String(ev.expected_value ?? '—')}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cyber Evidence */}
                <div className="border border-border bg-panel">
                  <div className="h-7 px-2 bg-panel-alt border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-text-main">
                      Cyber & Protocol Evidence ({cyberEvidence.length})
                    </span>
                    <ProvenanceChip provenance="OBS" />
                  </div>
                  <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
                    {cyberEvidence.length === 0 ? (
                      <div className="p-4 text-center text-text-subtle text-xs">
                        No cyber anomalies logged in this window.
                      </div>
                    ) : (
                      cyberEvidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2 bg-inset border border-border/60 text-[11px]"
                        >
                          <div className="flex justify-between font-mono font-semibold">
                            <span className="text-[var(--compromised)]">[{ev.id}] {ev.metric_name}</span>
                            <span className="text-text-subtle">{ev.domain}</span>
                          </div>
                          <p className="text-text-muted mt-0.5">{ev.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ANALYST NOTE */}
            {activeTab === 'analyst' && (
              <div className="space-y-2 border border-border p-3 bg-panel">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-text-main">
                      Structured Explainability Synthesis
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-panel-alt border border-border text-text-muted">
                      {explanation?.is_template_fallback ? 'TEMPLATE EXPLANATION (no LLM)' : 'LLM SYNTHESIS'}
                    </span>
                    <span className="text-[10px] font-mono text-alarm-ok font-semibold">
                      [VALIDATED]
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleFetchExplanation}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Synthesizing…' : 'Synthesize Explanation'}
                  </Button>
                </div>

                {explanation ? (
                  <div className="space-y-2.5 pt-1 text-xs text-text-main">
                    <div>
                      <h4 className="font-semibold text-text-muted text-[11px]">What Happened</h4>
                      <p className="text-text-main mt-0.5">{explanation.what_happened}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-muted text-[11px]">Where & Affected Components</h4>
                      <p className="text-text-main mt-0.5">{explanation.where}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-muted text-[11px]">Root Cause Attribution</h4>
                      <p className="text-text-main mt-0.5">{explanation.why}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-muted text-[11px]">Cyber vs Physical Distinction</h4>
                      <p className="text-text-main mt-0.5">{explanation.cyber_vs_physical}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-subtle">
                    Click "Synthesize Explanation" to generate structured root cause notes citing evidence IDs.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FORWARD IMPACT SIMULATION */}
            {activeTab === 'impact' && (
              <div className="space-y-2 border border-border p-3 bg-panel">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div>
                    <h3 className="font-semibold text-text-main">
                      Forward Consequence Projection ("If Ignored")
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Forward AC power flow simulation with SCADA closed-loop controller active.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleSimulateImpact}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Simulating…' : 'Simulate Forward Impact'}
                  </Button>
                </div>

                {impactResult ? (
                  <div className="space-y-2 pt-1">
                    <p className="p-2 bg-inset border border-border text-xs text-alarm-critical font-medium">
                      {impactResult.summary}
                    </p>
                    <PropertyGrid
                      items={[
                        { label: 'Projected Voltage Violations', value: String(impactResult.unmitigated_metrics.voltage_violations_count), highlight: 'critical' },
                        { label: 'Max Line Loading', value: formatLoading(impactResult.unmitigated_metrics.max_line_loading_pct), unit: '%' },
                        { label: 'Grid Frequency', value: impactResult.unmitigated_metrics.frequency_hz.toFixed(3), unit: 'Hz' },
                        { label: 'Projected Risk Score', value: impactResult.unmitigated_metrics.operational_risk_score.toFixed(1), unit: '/ 100', highlight: 'critical' },
                      ]}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-subtle">
                    Click "Simulate Forward Impact" to compute unmitigated consequence metrics.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MITIGATION CATALOG */}
            {activeTab === 'mitigation' && (
              <div className="space-y-2 border border-border p-3 bg-panel">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-semibold text-text-main">
                    Allowlisted Remediation Recommendations
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSimulateMitigation}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying…' : 'Execute Mitigation & Verify'}
                  </Button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {incident.recommended_plan?.actions.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-inset border border-border flex items-start justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold font-mono text-accent">
                          Action {idx + 1}: {act.action_type}
                        </span>
                        <p className="text-text-muted mt-0.5">{act.justification}</p>
                      </div>
                      <span className="font-mono text-[11px] text-text-subtle shrink-0 ml-2">
                        Target: {act.target_component}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: 3-WAY COMPARATIVE VERIFICATION */}
            {activeTab === 'verification' && (
              <div className="space-y-2 border border-border p-3 bg-panel">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div>
                    <h3 className="font-semibold text-text-main">
                      3-Way Comparative Verification
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Original Baseline vs Unmitigated Attack vs Mitigated Result.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSimulateMitigation}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Re-Verifying…' : 'Re-Run Verification'}
                  </Button>
                </div>

                {mitigationResult ? (
                  <div className="space-y-2 pt-1">
                    <div
                      className={`p-2 border text-xs font-semibold ${
                        mitigationResult.success
                          ? 'bg-alarm-ok/10 border-alarm-ok text-alarm-ok'
                          : 'bg-alarm-critical/10 border-alarm-critical text-alarm-critical'
                      }`}
                    >
                      {mitigationResult.summary}
                    </div>

                    <table className="w-full text-left border-collapse text-xs border border-border">
                      <thead className="bg-panel-alt text-text-muted border-b border-border">
                        <tr className="h-7 font-ui">
                          <th className="px-2 py-1">Metric</th>
                          <th className="px-2 py-1 text-right font-mono">1. Baseline</th>
                          <th className="px-2 py-1 text-right font-mono text-alarm-critical">2. Unmitigated</th>
                          <th className="px-2 py-1 text-right font-mono text-alarm-ok">3. Mitigated (Verified)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-text-main">
                        <tr className="h-7">
                          <td className="px-2 py-1 font-ui font-medium">Max Voltage Deviation (p.u.)</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatVoltage(mitigationResult.baseline_metrics.max_voltage_deviation_pu)}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-alarm-critical">{formatVoltage(mitigationResult.unmitigated_impact_metrics.max_voltage_deviation_pu)}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-alarm-ok">{formatVoltage(mitigationResult.mitigated_metrics.max_voltage_deviation_pu)}</td>
                        </tr>
                        <tr className="h-7">
                          <td className="px-2 py-1 font-ui font-medium">Voltage Violations Count</td>
                          <td className="px-2 py-1 text-right tabular-nums">{mitigationResult.baseline_metrics.voltage_violations_count}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-alarm-critical">{mitigationResult.unmitigated_impact_metrics.voltage_violations_count}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-alarm-ok">{mitigationResult.mitigated_metrics.voltage_violations_count}</td>
                        </tr>
                        <tr className="h-7">
                          <td className="px-2 py-1 font-ui font-medium">Max Line Loading (%)</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatLoading(mitigationResult.baseline_metrics.max_line_loading_pct)}%</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatLoading(mitigationResult.unmitigated_impact_metrics.max_line_loading_pct)}%</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatLoading(mitigationResult.mitigated_metrics.max_line_loading_pct)}%</td>
                        </tr>
                        <tr className="h-7">
                          <td className="px-2 py-1 font-ui font-medium">Operational Risk Score</td>
                          <td className="px-2 py-1 text-right tabular-nums">{mitigationResult.baseline_metrics.operational_risk_score.toFixed(1)}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-alarm-critical">{mitigationResult.unmitigated_impact_metrics.operational_risk_score.toFixed(1)}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-alarm-ok">{mitigationResult.mitigated_metrics.operational_risk_score.toFixed(1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-subtle">
                    Click "Execute Mitigation & Verify" to run comparative simulation.
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </Dialog>
  );
};
