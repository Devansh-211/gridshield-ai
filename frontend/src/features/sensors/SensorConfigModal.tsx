import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';

interface SensorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SensorConfigModal: React.FC<SensorConfigModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/sensors/health');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // Degraded fallback
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-panel border border-border w-full max-w-lg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-text-main flex items-center space-x-2">
            <span>📡 Telemetry Sensor Health & Data Quality (Rule R5)</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <p className="text-xs text-text-subtle">
          Real-time telemetry sensor health assessment and data quality vector scoring for Rule R5 5D Confidence.
        </p>

        {loading ? (
          <div className="text-xs font-mono text-text-muted">Loading sensor telemetry...</div>
        ) : report ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2 border border-border bg-surface p-3">
              <div>Total Sensors: <strong>{report.total_sensors}</strong></div>
              <div>Active Sensors: <strong className="text-alarm-ok">{report.active_sensors}</strong></div>
              <div>Missing Packets: <strong className="text-alarm-warn">{report.missing_sensors}</strong></div>
              <div>Stuck Signals: <strong className="text-alarm-crit">{report.stuck_sensors}</strong></div>
            </div>

            <div className="p-3 border border-border bg-panel flex justify-between items-center">
              <span className="text-text-subtle font-semibold">Rule R5 Data Quality Vector:</span>
              <span className="text-sm font-bold text-accent">{(report.data_quality_score * 100).toFixed(1)}%</span>
            </div>

            <div className="border border-border p-3 space-y-1">
              <div className="text-[11px] text-text-subtle uppercase tracking-wider font-bold">Active Hypotheses:</div>
              {report.hypotheses.map((h: string, idx: number) => (
                <div key={idx} className="text-accent">• {h}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-alarm-warn">Sensor health metrics unavailable.</div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
