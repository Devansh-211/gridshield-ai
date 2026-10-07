import React from 'react';
import { Button } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { UI_STRINGS } from '../../content/strings';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Eye, Play, Pause, RotateCcw } from 'lucide-react';
import { UserRole } from '../../../types/api';

interface TopBarProps {
  sessionId?: string | null;
  isRunning?: boolean;
  isSimPlaying?: boolean;
  simSpeed?: number;
  onTogglePlay?: () => void;
  onChangeSpeed?: (speed: number) => void;
  simTime?: string;
  simStep?: number;
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
  isSimPlaying = true,
  simSpeed = 1,
  onTogglePlay,
  onChangeSpeed,
  simTime = '2026-10-06 14:00:00Z',
  simStep = 0,
  onAdvanceStep,
  onReset,
  onOpenHelp,
  onOpenImport,
  onOpenSensors,
  theme,
  onToggleTheme,
}) => {
  const { user, logout, switchPreviewRole, isPreview } = useAuth();

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

        {/* Live Step Badge */}
        <span className="px-1.5 py-0.5 bg-surface text-text-muted border border-border text-[10px] font-mono rounded">
          Step: <strong className="text-text-main font-semibold">{simStep}</strong>
        </span>

        {/* Run State Indicator */}
        <span className="flex items-center space-x-1.5 text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-sm ${
              isSimPlaying ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className={isSimPlaying ? 'text-emerald-400 font-semibold' : 'text-text-muted'}>
            {isSimPlaying ? `LIVE (${simSpeed}x)` : 'PAUSED'}
          </span>
        </span>
      </div>

      {/* Center: Live Playback, Stepping & Tools */}
      <div className="flex items-center space-x-1.5">
        {/* Play/Pause Button */}
        {onTogglePlay && (
          <Button
            variant={isSimPlaying ? 'secondary' : 'primary'}
            size="sm"
            onClick={onTogglePlay}
            className={`flex items-center gap-1 font-semibold ${
              isSimPlaying
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isSimPlaying ? 'Pause continuous simulation' : 'Resume live real-time simulation'}
          >
            {isSimPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" /> Play
              </>
            )}
          </Button>
        )}

        {/* Speed Selector */}
        {onChangeSpeed && (
          <div className="flex items-center bg-surface rounded border border-border p-0.5">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold transition-colors ${
                  simSpeed === spd
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main hover:bg-app'
                }`}
                title={`Run simulation at ${spd}x speed`}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}

        {/* Manual Step Jump Buttons */}
        {onAdvanceStep && (
          <div className="flex items-center space-x-1 pl-1 border-l border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAdvanceStep(1)}
              title="Step forward 1 second"
            >
              +1s
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAdvanceStep(5)}
              title="Step forward 5 seconds"
            >
              +5s
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAdvanceStep(20)}
              title="Step forward 20 seconds"
            >
              +20s
            </Button>
          </div>
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


      {/* Right: User Profile, Preview Switcher, UTC Clock, Theme Toggle & Logout */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Role Preview Dropdown for Admins */}
        {user?.real_role === 'ADMIN' && (
          <div className="flex items-center gap-1.5 bg-app px-2 py-0.5 rounded border border-border">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={user.preview_role || 'ADMIN'}
              onChange={(e) => {
                const target = e.target.value === 'ADMIN' ? null : (e.target.value as UserRole);
                switchPreviewRole(target);
              }}
              className="bg-transparent text-[11px] font-semibold text-text-main focus:outline-none cursor-pointer"
            >
              <option value="ADMIN">Admin Console</option>
              <option value="SUPERVISOR">Preview: Supervisor</option>
              <option value="TECHNICIAN">Preview: Technician</option>
            </select>
          </div>
        )}

        {/* User Pill */}
        {user && (
          <div className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded border border-border">
            <User className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] font-medium text-text-main font-mono">
              {user.username}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                user.effective_role === 'ADMIN'
                  ? 'bg-purple-500/20 text-purple-400'
                  : user.effective_role === 'TECHNICIAN'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {user.effective_role}
            </span>
          </div>
        )}

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
          {theme === 'light' ? '🌙' : '☀️'}
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

        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            title="Sign out of workbench"
            aria-label="Sign out"
            className="text-red-400 hover:text-red-300"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
};
