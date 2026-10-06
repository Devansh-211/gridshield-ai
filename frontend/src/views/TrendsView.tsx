import React, { useState } from 'react';
import { Activity, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TrendsViewProps {
  telemetryHistory?: Array<{ step: number; values: Record<string, number> }>;
}

const AVAILABLE_TAGS = [
  { id: 'Bus 4:v_pu', label: 'Bus 4 Voltage (p.u.)', unit: 'p.u.', defaultColor: '#38bdf8', min: 0.9, max: 1.1, limitLow: 0.95, limitHigh: 1.05 },
  { id: 'Bus 2:v_pu', label: 'Bus 2 Voltage (p.u.)', unit: 'p.u.', defaultColor: '#10b981', min: 0.9, max: 1.1, limitLow: 0.95, limitHigh: 1.05 },
  { id: 'Bus 1:v_pu', label: 'Bus 1 (Slack) Voltage', unit: 'p.u.', defaultColor: '#f59e0b', min: 0.9, max: 1.1, limitLow: 0.95, limitHigh: 1.05 },
  { id: 'Line 1-2:loading_pct', label: 'Line 1-2 Loading (%)', unit: '%', defaultColor: '#ef4444', min: 0, max: 120, limitHigh: 100.0 },
  { id: 'Line 2-5:loading_pct', label: 'Line 2-5 Loading (%)', unit: '%', defaultColor: '#a855f7', min: 0, max: 120, limitHigh: 100.0 },
  { id: 'Gen 2:p_mw', label: 'Gen 2 Active Power (MW)', unit: 'MW', defaultColor: '#06b6d4', min: 0, max: 100 },
];

export const TrendsView: React.FC<TrendsViewProps> = ({ telemetryHistory = [] }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(['Bus 4:v_pu', 'Bus 2:v_pu']);

  // Format data for chart
  const chartData = telemetryHistory.map((pt) => {
    const row: Record<string, any> = { step: pt.step };
    for (const tag of selectedTags) {
      row[tag] = pt.values[tag] ?? 1.0;
    }
    return row;
  });

  const exportCSV = () => {
    if (!chartData.length) return;
    const headers = ['step', ...selectedTags].join(',');
    const rows = chartData.map((r) => [r.step, ...selectedTags.map((t) => r[t] ?? '')].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gridshield_trends_step_${chartData[chartData.length - 1]?.step || 0}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface text-slate-100 p-4 space-y-4 overflow-hidden font-mono text-xs">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border border-border rounded">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h1 className="text-sm font-bold tracking-wide uppercase text-white">Historian Multi-Pen Trend Viewer</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 rounded flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Left Selector, Right Chart */}
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {/* Pen Selection Drawer */}
        <div className="col-span-1 bg-card border border-border rounded p-3 flex flex-col space-y-3 overflow-y-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Measurement Pens</span>
          <div className="space-y-1.5 flex-1">
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTags(selectedTags.filter((t) => t !== tag.id));
                    } else {
                      setSelectedTags([...selectedTags, tag.id]);
                    }
                  }}
                  className={`w-full text-left p-2 rounded text-xs border transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 text-white'
                      : 'bg-background border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: tag.defaultColor }} />
                    <span className="truncate">{tag.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{tag.unit}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart View */}
        <div className="col-span-3 bg-card border border-border rounded p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">Shared Time Axis (Simulation Step s)</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-0.5 bg-emerald-500 inline-block" /> Nominal Voltage Band [0.95 - 1.05 p.u.]
              </span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="step" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0f17', borderColor: '#1e293b', borderRadius: '4px', fontSize: '11px' }}
                  labelStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                />
                <ReferenceLine y={1.05} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '1.05 High', fill: '#f43f5e', fontSize: 10 }} />
                <ReferenceLine y={0.95} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '0.95 Low', fill: '#f43f5e', fontSize: 10 }} />
                {selectedTags.map((tagId) => {
                  const tagMeta = AVAILABLE_TAGS.find((t) => t.id === tagId);
                  return (
                    <Line
                      key={tagId}
                      type="monotone"
                      dataKey={tagId}
                      name={tagMeta?.label || tagId}
                      stroke={tagMeta?.defaultColor || '#38bdf8'}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
