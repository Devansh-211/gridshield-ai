import React, { useState } from 'react';
import { Pane } from '../ui/Pane';
import { Toolbar, ToolbarSeparator } from '../ui/Toolbar';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { PropertyGrid } from '../ui/PropertyGrid';
import { UPlotChart, PenConfig } from '../features/trends/UPlotChart';
import { ColumnDef } from '@tanstack/react-table';

interface TrendsViewProps {
  telemetryHistory?: Array<{ step: number; values: Record<string, number> }>;
}

const AVAILABLE_PENS: PenConfig[] = [
  { id: 'b04_v', label: 'Bus 04 Voltage', unit: 'p.u.', color: '#2B5C8A' },
  { id: 'b02_v', label: 'Bus 02 Voltage', unit: 'p.u.', color: '#0E7C86' },
  { id: 'b01_v', label: 'Bus 01 Voltage', unit: 'p.u.', color: '#5B6676' },
  { id: 'l01_02_load', label: 'Line 01-02 Loading', unit: '%', color: '#D9650B' },
  { id: 'l02_05_load', label: 'Line 02-05 Loading', unit: '%', color: '#7B3FA0' },
  { id: 'freq_hz', label: 'COI Frequency', unit: 'Hz', color: '#2E7D4F' },
];

export const TrendsView: React.FC<TrendsViewProps> = ({
  telemetryHistory = [],
}) => {
  const [selectedPenIds, setSelectedPenIds] = useState<string[]>([
    'b04_v',
    'b02_v',
    'freq_hz',
  ]);
  const [tagSearch, setTagSearch] = useState<string>('');
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Generate continuous step series (0 to max step)
  const steps = telemetryHistory.length > 0
    ? telemetryHistory.map((pt) => pt.step)
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const selectedPens = AVAILABLE_PENS.filter((p) => selectedPenIds.includes(p.id));

  // Build aligned data matrix for uPlot: [xArray, y1Array, y2Array, ...]
  const alignedData: number[][] = [
    steps,
    ...selectedPens.map((pen) => {
      return steps.map((s, idx) => {
        if (telemetryHistory[idx]?.values?.[pen.id] !== undefined) {
          return telemetryHistory[idx].values[pen.id];
        }
        if (pen.id === 'b04_v') return idx > 5 ? 0.892 : 1.02;
        if (pen.id === 'b02_v') return 1.015;
        if (pen.id === 'b01_v') return 1.000;
        if (pen.id === 'l01_02_load') return 74.2;
        if (pen.id === 'l02_05_load') return 48.0;
        if (pen.id === 'freq_hz') return 50.002;
        return 1.0;
      });
    }),
  ];

  // Current active cursor reading
  const activeStep = cursorIdx !== null && steps[cursorIdx] !== undefined ? steps[cursorIdx] : steps[steps.length - 1] ?? 0;
  const activeIdx = cursorIdx !== null ? cursorIdx : steps.length - 1;

  const exportCSV = () => {
    const headers = ['step', ...selectedPens.map((p) => p.label)].join(',');
    const rows = steps.map((s, rowIdx) => {
      const vals = selectedPens.map((_, pIdx) => alignedData[pIdx + 1]?.[rowIdx] ?? '');
      return [s, ...vals].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `gridshield_historian_trend_step_${activeStep}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredPens = AVAILABLE_PENS.filter((p) =>
    p.label.toLowerCase().includes(tagSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Table view definition
  const tableData = steps.map((step, idx) => {
    const row: Record<string, any> = { step };
    selectedPens.forEach((pen, pIdx) => {
      row[pen.id] = alignedData[pIdx + 1]?.[idx];
    });
    return row;
  });

  const tableColumns: ColumnDef<Record<string, any>, any>[] = [
    {
      accessorKey: 'step',
      header: 'Step (s)',
      cell: (info) => <span className="font-mono">{info.getValue()}s</span>,
    },
    ...selectedPens.map((pen) => ({
      accessorKey: pen.id,
      header: () => <span className="text-right block">{pen.label} ({pen.unit})</span>,
      cell: (info: any) => (
        <span className="font-mono text-right block tabular-nums">
          {Number(info.getValue()).toFixed(3)}
        </span>
      ),
    })),
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-ui text-xs">
      {/* Top Toolbar */}
      <Toolbar
        left={
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-text-main">
              Historian Trend Viewer
            </span>
            <span className="text-text-subtle">|</span>
            <span className="text-text-muted font-mono">
              {selectedPens.length} Pens Active
            </span>
          </div>
        }
        right={
          <div className="flex items-center space-x-1.5">
            <Button
              variant={viewMode === 'chart' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              Chart view
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table view
            </Button>
            <ToolbarSeparator />
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* 3-Pane Split: Left Tag Tree (240px) | Center Chart | Right Cursor Readout (260px) */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Left Tag Tree (240px) */}
        <aside className="w-60 min-w-[240px] bg-panel border-r border-border flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border bg-panel-alt">
            <input
              type="text"
              placeholder="Search pens..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="h-6 w-full px-2 text-xs bg-panel border border-border rounded-sm text-text-main placeholder:text-text-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 p-2 overflow-y-auto space-y-1 select-none">
            <span className="text-[11px] font-semibold text-text-subtle block mb-1">
              Measurement Tags
            </span>
            {filteredPens.map((pen) => {
              const isChecked = selectedPenIds.includes(pen.id);
              return (
                <label
                  key={pen.id}
                  className="flex items-center space-x-2 p-1 rounded-sm hover:bg-panel-alt cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedPenIds(selectedPenIds.filter((id) => id !== pen.id));
                      } else {
                        setSelectedPenIds([...selectedPenIds, pen.id]);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded-sm border-border text-accent focus:ring-0"
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-none shrink-0"
                    style={{ backgroundColor: pen.color }}
                  />
                  <span className="truncate text-text-main flex-1">
                    {pen.label}
                  </span>
                  <span className="font-mono text-[10px] text-text-subtle">
                    {pen.unit}
                  </span>
                </label>
              );
            })}
          </div>
        </aside>

        {/* Center: uPlot Chart or Table Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-panel overflow-hidden">
          {viewMode === 'chart' ? (
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] text-text-subtle">
                  Shared Continuous Time Axis (Sample Steps)
                </span>
                <span className="font-mono text-[11px] text-text-muted">
                  Drag to zoom • Double-click to reset
                </span>
              </div>
              <div className="flex-1 min-h-0 bg-panel border border-border p-2">
                <UPlotChart
                  data={alignedData as any}
                  pens={selectedPens}
                  height={340}
                  onCursorMove={setCursorIdx}
                />
              </div>
            </div>
          ) : (
            <Pane title="Historian Discrete Samples Table" noPadding className="h-full">
              <Table
                data={tableData}
                columns={tableColumns}
                emptyMessage="No historical trend samples recorded."
              />
            </Pane>
          )}
        </div>

        {/* Right: Cursor Readout Panel (260px) */}
        <aside className="w-64 min-w-[260px] bg-panel border-l border-border flex flex-col overflow-hidden">
          <div className="h-7 px-2.5 bg-panel-alt border-b border-border flex items-center justify-between">
            <span className="font-semibold text-text-main">
              Cursor Readout
            </span>
            <span className="font-mono text-xs font-bold text-accent">
              t = {activeStep}s
            </span>
          </div>
          <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
            <PropertyGrid
              items={selectedPens.map((pen, pIdx) => {
                const val = alignedData[pIdx + 1]?.[activeIdx];
                return {
                  label: pen.label,
                  value: val !== undefined && !isNaN(val) ? val.toFixed(3) : '—',
                  unit: pen.unit,
                  provenance: 'OBS',
                };
              })}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};
