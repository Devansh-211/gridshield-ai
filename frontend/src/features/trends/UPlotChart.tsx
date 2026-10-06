import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';

export interface PenConfig {
  id: string;
  label: string;
  unit: string;
  color: string;
  dash?: number[];
  width?: number;
}

export interface UPlotChartProps {
  data: uPlot.AlignedData;
  pens: PenConfig[];
  limitLow?: number;
  limitHigh?: number;
  height?: number;
  onCursorMove?: (idx: number | null) => void;
  className?: string;
}

export const UPlotChart: React.FC<UPlotChartProps> = ({
  data,
  pens,
  limitLow,
  limitHigh,
  height = 240,
  onCursorMove,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length < 2) return;

    // Series definitions
    const series: uPlot.Series[] = [
      {
        label: 'Time (s)',
      },
      ...pens.map((pen) => ({
        label: `${pen.label} (${pen.unit})`,
        stroke: pen.color,
        width: pen.width || 1.25,
        dash: pen.dash || undefined,
        points: { show: false },
        spanGaps: true,
      })),
    ];

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth || 600,
      height: height,
      series: series,
      axes: [
        {
          stroke: '#6B7686',
          grid: { stroke: 'rgba(201, 206, 214, 0.25)', width: 1 },
          ticks: { stroke: '#6B7686', width: 1 },
          font: '11px var(--font-mono)',
          values: (self, splits) => splits.map((v) => `${Math.round(v)}s`),
        },
        {
          stroke: '#6B7686',
          grid: { stroke: 'rgba(201, 206, 214, 0.25)', width: 1 },
          ticks: { stroke: '#6B7686', width: 1 },
          font: '11px var(--font-mono)',
          scale: 'y',
        },
      ],
      cursor: {
        drag: { setScale: true, x: true, y: false },
        sync: { key: 'gridshield-trends' },
        points: { show: false },
      },
      hooks: {
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            onCursorMove?.(idx !== undefined && idx !== null ? idx : null);
          },
        ],
      },
    };

    chartRef.current = new uPlot(opts, data, containerRef.current);

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.setSize({
          width: containerRef.current.clientWidth,
          height: height,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, pens, height]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden bg-panel ${className}`}
      style={{ height }}
    />
  );
};
