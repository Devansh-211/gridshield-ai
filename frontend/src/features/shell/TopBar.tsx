import React from 'react';
import { Button } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { UI_STRINGS } from '../../content/strings';

interface TopBarProps {
  sessionId?: string | null;
  isRunning?: boolean;
  simTime?: string;
  onAdvanceStep?: (steps: number) => void;
  onReset?: () => void;
  onOpenHelp?: () => void;
  onOpenImport?: () => void;
  onOpenSensors?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  sessionId,
  isRunning = false,
  simTime = '2026-10-06 14:00:00Z',
  onAdvanceStep,
  onReset,
  onOpenHelp,
  onOpenImport,
  onOpenSensors,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="h-10 min-h-[40px] bg-panel border-b border-border px-3 flex items-center justify-between select-none text-xs z-30">
      {/* Left: Wordmark & Simulation Badge */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Typographic Logo with geometric bus mark */}
        <div className="flex items-center space-x-1.5">
          <svg
            className="w-4 h-4 text-accent"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Bus bar line */}
            <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
            {/* Tap top */}
            <line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="5" cy="2" r="1.5" fill="currentColor" />
            {/* Tap bottom */}
            <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="11" cy="14" r="1.5" fill="currentColor" />
          </svg>
          <span className="font-semibold text-text-main text-[14px] tracking-tight">
            GridShield
          </span>
        </div>

        {/* Inverse Simulation Badge */}
        <Tooltip content={UI_STRINGS.app.simulationTooltip}>
          <span className="h-[18px] px-1.5 bg-sim-bg text-sim-fg text-[10px] font-mono font-bold flex items-center justify-center rounded-none cursor-help">
            {UI_STRINGS.app.simulationBadge}
          </span>
        </Tooltip>

        {/* Session ID */}
        {sessionId && (
          <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
            Session: <strong className="text-text-main">{sessionId.slice(0, 8)}</strong>
          </span>
        )}

        {/* Run State Indicator */}
        <span className="flex items-center space-x-1 text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-none ${
              isRunning ? 'bg-alarm-ok' : 'bg-text-subtle'
            }`}
          />
          <span className="text-text-muted">
            {isRunning ? UI_STRINGS.statusBar.simulating : UI_STRINGS.statusBar.idle}
          </span>
        </span>
      </div>

      {/* Center: Stepping & Simulation Controls */}
      <div className="flex items-center space-x-1">
        {onAdvanceStep && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAdvanceStep(1)}
              title="Advance digital twin by 1 second step"
            >
              +1s
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAdvanceStep(5)}
              title="Advance digital twin by 5 second steps"
            >
              +5s
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAdvanceStep(20)}
              title="Advance digital twin by 20 second steps"
            >
              +20s
            </Button>
          </>
        )}

        {onOpenImport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenImport}
            title="Import custom MATPOWER (.m) or pandapower (.json) network"
          >
            🔌 Import Net
          </Button>
        )}

        {onOpenSensors && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSensors}
            title="Telemetry sensor configuration & data quality"
          >
            📡 Sensors
          </Button>
        )}
      </div>


      {/* Right: UTC Clock, Theme Toggle & Help */}
      <div className="flex items-center space-x-2 shrink-0">
        <span className="text-[11px] font-mono text-text-muted hidden md:inline">
          {simTime}
        </span>

        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            title="Reset simulation state"
          >
            Reset
          </Button>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </Button>

        {onOpenHelp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenHelp}
            title="Open keyboard shortcuts & reference"
            aria-label="Help"
          >
            ?
          </Button>
        )}
      </div>
    </header>
  );
};
