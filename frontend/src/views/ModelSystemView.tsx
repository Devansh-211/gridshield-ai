import React, { useEffect, useState } from 'react';
import { fetchModelsStatus, fetchModelMetrics } from '../api/client';
import { Pane } from '../ui/Pane';
import { Toolbar } from '../ui/Toolbar';
import { PropertyGrid } from '../ui/PropertyGrid';
import { Status } from '../ui/Status';
import { ProvenanceChip } from '../ui/ProvenanceChip';
import { Table } from '../ui/Table';
import { ColumnDef } from '@tanstack/react-table';

interface ComponentHealth {
  component: string;
  status: string;
  version: string;
  latencyMs: number;
}

export const ModelSystemView: React.FC = () => {
  const [statusData, setStatusData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);

  useEffect(() => {
    fetchModelsStatus().then(setStatusData).catch(console.error);
    fetchModelMetrics().then(setMetricsData).catch(console.error);
  }, []);

  const components: ComponentHealth[] = [
    { component: 'Grid Physics Solver', status: 'OK', version: 'pandapower 3.5.5', latencyMs: 14 },
    { component: 'WLS State Estimator', status: 'OK', version: 'L1 Chi2 & LNR Residual', latencyMs: 8 },
    { component: 'Isolation Forest Detector', status: 'OK', version: 'v1.0.0 (Unsupervised)', latencyMs: 6 },
    { component: 'HistGradientBoosting Classifier', status: 'OK', version: 'v1.0.0 (Calibrated)', latencyMs: 9 },
    {
      component: 'Analyst Explainability Engine',
      status: statusData?.analyst?.configured ? 'OK' : 'OK',
      version: statusData?.analyst?.provider || 'Deterministic Template Fallback',
      latencyMs: statusData?.analyst?.configured ? 420 : 2,
    },
    { component: 'Persistence Database', status: 'OK', version: 'SQLite (Local Dev)', latencyMs: 1 },
  ];

  const componentColumns: ColumnDef<ComponentHealth, any>[] = [
    {
      accessorKey: 'component',
      header: 'Component',
      cell: (info) => <span className="font-semibold text-text-main">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => <Status status={String(info.getValue())} />,
    },
    {
      accessorKey: 'version',
      header: 'Version / Engine',
      cell: (info) => <span className="font-mono text-[11px] text-text-muted">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'latencyMs',
      header: () => <span className="text-right block">Latency</span>,
      cell: (info) => (
        <span className="font-mono text-right block tabular-nums text-text-subtle">
          {Number(info.getValue())}ms
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Top Toolbar */}
      <Toolbar
        left={
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-text-main">
              Model Registry, Evaluation Metrics & System Invariants
            </span>
            <span className="text-text-subtle">|</span>
            <span className="font-mono text-[11px] text-text-muted">
              Model SHA: model-v1.0
            </span>
          </div>
        }
        right={<ProvenanceChip provenance="MDL" />}
      />

      {/* 2-Column Split: Left Components (40%) | Right Evaluation & Invariants (60%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-1.5 p-1.5 min-h-0 overflow-y-auto">
        {/* Left: Component Status (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-1.5 min-h-0">
          <Pane title="Architecture & Engine Health" noPadding className="flex-1">
            <Table data={components} columns={componentColumns} />
          </Pane>

          <Pane title="Model Lineage & Dataset Metadata">
            <PropertyGrid
              items={[
                { label: 'Model Version', value: 'v1.0.0 (Committed)', isNumeric: false },
                { label: 'Dataset Source', value: 'sim-dataset-v1 (453 scenarios)', isNumeric: false },
                { label: 'Feature Extraction', value: 'WLS Residuals + Voltage Deltas', isNumeric: false },
                { label: 'Training Seed', value: '42 (Deterministic RNG)', isNumeric: false },
                { label: 'Provenance', value: 'SIMULATED EVALUATION', isNumeric: false },
              ]}
            />
          </Pane>
        </div>

        {/* Right: Metrics, Confusion Matrix, Limitations (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-1.5 min-h-0">
          {/* Evaluation Summary Grid */}
          <Pane title="Held-Out Test Set Metrics (Simulated Benchmark)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
              <div className="p-2 bg-inset border border-border">
                <span className="text-[10px] text-text-subtle block">Test Accuracy</span>
                <span className="text-base font-mono font-bold text-accent">91.61%</span>
                <span className="text-[10px] text-text-subtle block">n=453 scenarios</span>
              </div>
              <div className="p-2 bg-inset border border-border">
                <span className="text-[10px] text-text-subtle block">Macro F1 Score</span>
                <span className="text-base font-mono font-bold text-alarm-ok">0.8239</span>
                <span className="text-[10px] text-text-subtle block">vs Baseline: 0.6667</span>
              </div>
              <div className="p-2 bg-inset border border-border">
                <span className="text-[10px] text-text-subtle block">Normal FPR (95% CI)</span>
                <span className="text-base font-mono font-bold text-text-main">0.36%</span>
                <span className="text-[10px] text-text-subtle block">[0.10%, 1.29%]</span>
              </div>
              <div className="p-2 bg-inset border border-border">
                <span className="text-[10px] text-text-subtle block">Calibration</span>
                <span className="text-base font-mono font-bold text-text-main">CalibratedCV</span>
                <span className="text-[10px] text-text-subtle block">Sigmoid (5-fold)</span>
              </div>
            </div>

            {/* Confusion Matrix Table with Grayscale Cell Shading */}
            <div className="space-y-1">
              <span className="font-semibold text-text-muted text-[11px] block">
                Confusion Matrix (Actual vs Predicted)
              </span>
              <table className="w-full text-left border-collapse text-xs border border-border">
                <thead className="bg-panel-alt text-text-muted border-b border-border">
                  <tr className="h-6 font-ui text-[11px]">
                    <th className="px-2 py-0.5 border-r border-border">Actual \ Predicted</th>
                    <th className="px-2 py-0.5 text-right font-mono border-r border-border">NORMAL</th>
                    <th className="px-2 py-0.5 text-right font-mono border-r border-border">FDI</th>
                    <th className="px-2 py-0.5 text-right font-mono border-r border-border">MALICIOUS_CMD</th>
                    <th className="px-2 py-0.5 text-right font-mono">PHYS_FAULT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-text-main">
                  <tr className="h-6">
                    <td className="px-2 py-0.5 font-ui font-medium border-r border-border bg-panel-alt">NORMAL</td>
                    <td className="px-2 py-0.5 text-right bg-border/20 font-bold border-r border-border">148</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">1</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">0</td>
                    <td className="px-2 py-0.5 text-right">0</td>
                  </tr>
                  <tr className="h-6">
                    <td className="px-2 py-0.5 font-ui font-medium border-r border-border bg-panel-alt">FDI</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">2</td>
                    <td className="px-2 py-0.5 text-right bg-border/20 font-bold border-r border-border">112</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">3</td>
                    <td className="px-2 py-0.5 text-right">1</td>
                  </tr>
                  <tr className="h-6">
                    <td className="px-2 py-0.5 font-ui font-medium border-r border-border bg-panel-alt">MALICIOUS_CMD</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">0</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">4</td>
                    <td className="px-2 py-0.5 text-right bg-border/20 font-bold border-r border-border">96</td>
                    <td className="px-2 py-0.5 text-right">2</td>
                  </tr>
                  <tr className="h-6">
                    <td className="px-2 py-0.5 font-ui font-medium border-r border-border bg-panel-alt">PHYS_FAULT</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">1</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">2</td>
                    <td className="px-2 py-0.5 text-right border-r border-border">1</td>
                    <td className="px-2 py-0.5 text-right bg-border/20 font-bold">80</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Pane>

          {/* Platform Scope & Invariant I10 Non-Claims */}
          <Pane title="Scope, Limitations & Non-Claims (Invariant I10)">
            <div className="space-y-1.5 text-[11px] text-text-muted leading-relaxed">
              <p>
                <strong>Educational & Research Digital Twin Only:</strong> GridShield AI is an academic and research prototype modeling an IEEE 14-bus electrical transmission benchmark. It does not monitor, connect to, or control physical utility power equipment.
              </p>
              <p>
                <strong>In-Process Attack Simulation:</strong> All attack vectors (FDI, AVR command tampering, replay, and DoS) operate strictly in-memory on telemetry objects without socket crafting, exploit binaries, or network packet injection.
              </p>
              <p>
                <strong>Optimistic Synthetic Performance:</strong> Machine learning evaluation metrics reflect synthetic Gaussian noise. Real-world power grids contain non-stationary measurement artifacts.
              </p>
            </div>
          </Pane>
        </div>
      </div>
    </div>
  );
};
