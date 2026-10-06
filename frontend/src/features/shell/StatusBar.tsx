import React from 'react';
import { AlarmRecord } from '../../../types/api';
import { UI_STRINGS } from '../../content/strings';

interface StatusBarProps {
  alarms?: AlarmRecord[];
  dbLatencyMs?: number;
  dbHealthy?: boolean;
  onNavigateToAlarms?: () => void;
  version?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  alarms = [],
  dbLatencyMs = 38,
  dbHealthy = true,
  onNavigateToAlarms,
  version = 'v1.0.0',
}) => {
  const unackAlarms = alarms.filter((a) => a.state === 'UNACK' || a.state === 'RTN_UNACK');
  const critCount = unackAlarms.filter((a) => a.priority === 'CRITICAL').length;
  const highCount = unackAlarms.filter((a) => String(a.priority) === 'HIGH' || String(a.priority) === 'WARNING').length;
  const medCount = unackAlarms.filter((a) => String(a.priority) === 'MEDIUM' || String(a.priority) === 'CAUTION').length;
  const lowCount = unackAlarms.filter((a) => String(a.priority) === 'LOW' || String(a.priority) === 'DIAGNOSTIC').length;

  const newestUnack = unackAlarms[unackAlarms.length - 1];

  const getPriorityClass = (priority: string) => {
    const p = (priority || '').toUpperCase();
    if (p === 'CRITICAL') return 'text-alarm-critical font-bold';
    if (p === 'HIGH' || p === 'WARNING') return 'text-alarm-high font-bold';
    if (p === 'MEDIUM' || p === 'CAUTION') return 'text-alarm-medium';
    return 'text-alarm-low';
  };

  return (
    <footer className="h-7 min-h-[28px] bg-panel border-t border-border px-3 flex items-center justify-between text-[11px] font-mono select-none text-text-muted z-30">
      {/* Left: Priority Counts */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-2">
          <span className={critCount > 0 ? 'text-alarm-critical font-bold' : 'text-text-subtle'}>
            CRIT {critCount}
          </span>
          <span className={highCount > 0 ? 'text-alarm-high font-bold' : 'text-text-subtle'}>
            HIGH {highCount}
          </span>
          <span className={medCount > 0 ? 'text-alarm-medium' : 'text-text-subtle'}>
            MED {medCount}
          </span>
          <span className={lowCount > 0 ? 'text-alarm-low' : 'text-text-subtle'}>
            LOW {lowCount}
          </span>
        </div>
      </div>

      {/* Center: Newest Unacknowledged Alarm */}
      <div className="flex-1 px-4 truncate text-center hidden sm:block">
        {newestUnack ? (
          <button
            onClick={onNavigateToAlarms}
            className="hover:underline text-text-main truncate inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <span className="text-text-subtle">
              {UI_STRINGS.statusBar.newestUnack}:
            </span>
            <span className={getPriorityClass(newestUnack.priority)}>
              [{newestUnack.tag}]
            </span>
            <span className="truncate text-text-main">
              {newestUnack.description}
            </span>
          </button>
        ) : (
          <span className="text-text-subtle">
            {UI_STRINGS.statusBar.noActiveAlarms}
          </span>
        )}
      </div>

      {/* Right: DB Status & Latency & Version */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1">
          <span
            className={`w-1.5 h-1.5 rounded-none ${
              dbHealthy ? 'bg-alarm-ok' : 'bg-alarm-critical'
            }`}
          />
          <span className="text-text-subtle">DB</span>
          <span className="text-text-main">{dbLatencyMs}ms</span>
        </div>
        <span className="text-text-subtle">|</span>
        <span className="text-text-subtle">{version}</span>
      </div>
    </footer>
  );
};
