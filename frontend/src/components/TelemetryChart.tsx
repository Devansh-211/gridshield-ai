import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Activity } from 'lucide-react';

interface TelemetryChartProps {
  data: Array<{
    step: number;
    reported: number;
    groundTruth?: number;
    estimated?: number;
    upperBand?: number;
    lowerBand?: number;
  }>;
  busLabel?: string;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  busLabel = 'Bus 4',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-surface/50 border border-border rounded font-mono text-xs text-slate-400">
        <Activity className="w-5 h-5 text-cyan-400 mr-2 animate-spin" />
        Awaiting telemetry stream...
      </div>
    );
  }

  return (
    <div className="bg-surface/90 border border-border rounded p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            {busLabel} Voltage Telemetry Stream (True vs Reported)
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          <ProvenanceBadge provenance="OBSERVED" />
          <ProvenanceBadge provenance="SIMULATED" />
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="step"
              stroke="#64748B"
              fontSize={10}
              tickFormatter={(v) => `t=${v}s`}
            />
            <YAxis
              domain={[0.85, 1.15]}
              stroke="#64748B"
              fontSize={10}
              tickFormatter={(v) => `${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                borderColor: '#1E293B',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

            {/* Nominal Upper and Lower Security Bands */}
            <ReferenceLine y={1.05} stroke="#F43F5E" strokeDasharray="3 3" label={{ value: 'Upper Limit (1.05)', fill: '#F43F5E', fontSize: 9 }} />
            <ReferenceLine y={0.95} stroke="#38BDF8" strokeDasharray="3 3" label={{ value: 'Lower Limit (0.95)', fill: '#38BDF8', fontSize: 9 }} />
            <ReferenceLine y={1.0} stroke="#475569" strokeDasharray="2 2" />

            <Line
              type="monotone"
              dataKey="reported"
              name="Observed Telemetry (RTU)"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="groundTruth"
              name="Ground Truth Physics"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
            />
            {data[0]?.estimated !== undefined && (
              <Line
                type="monotone"
                dataKey="estimated"
                name="WLS Estimated State"
                stroke="#06B6D4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
