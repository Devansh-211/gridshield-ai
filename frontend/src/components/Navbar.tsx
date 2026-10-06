import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Activity,
  Sliders,
  AlertTriangle,
  Cpu,
  Bot,
  Play,
  RotateCcw,
  Radio,
  Bell,
  TrendingUp,
  Network,
  BookOpen,
  HelpCircle,
  FastForward,
} from 'lucide-react';
import { triggerGoldenDemo, resetSystem } from '../api/client';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openIncidentsCount: number;
  activeAlarmsCount?: number;
  onAdvanceStep?: (steps: number) => void;
  onOpenHelp?: () => void;
  onDemoCompleted?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openIncidentsCount,
  activeAlarmsCount = 0,
  onAdvanceStep,
  onOpenHelp,
  onDemoCompleted,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRunDemo = async () => {
    setIsRunningDemo(true);
    try {
      await triggerGoldenDemo();
      if (onDemoCompleted) onDemoCompleted();
      setActiveTab('scenarios');
    } catch (err) {
      console.error('Failed to run demo:', err);
    } finally {
      setIsRunningDemo(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      if (onDemoCompleted) onDemoCompleted();
      setActiveTab('overview');
    } catch (err) {
      console.error('Failed to reset system:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'grid', label: 'Grid Topology', icon: Network },
    {
      id: 'alarms',
      label: 'Alarms',
      icon: Bell,
      badge: activeAlarmsCount > 0 ? activeAlarmsCount : undefined,
    },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: AlertTriangle,
      badge: openIncidentsCount > 0 ? openIncidentsCount : undefined,
    },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'scenarios', label: 'Scenario Lab', icon: Sliders },
    { id: 'analyst', label: 'AI Analyst', icon: Bot },
    { id: 'models', label: 'Models & System', icon: Cpu },
    { id: 'explained', label: 'Explained', icon: BookOpen },
  ];

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-40 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13">
          {/* Brand & Simulation Badge */}
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-slate-900 border border-slate-700 rounded flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-white text-sm">
                  GRIDSHIELD<span className="text-cyan-400">.AI</span>
                </span>
                <span
                  title="Research digital twin • Never connected to physical equipment"
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 uppercase cursor-help"
                >
                  [ SIMULATION ]
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons, Time & Help */}
          <div className="flex items-center space-x-2 text-xs">
            {onAdvanceStep && (
              <div className="hidden xl:flex items-center space-x-1">
                <button
                  onClick={() => onAdvanceStep(1)}
                  title="Advance 1 step"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[11px] font-bold"
                >
                  +1s
                </button>
                <button
                  onClick={() => onAdvanceStep(10)}
                  title="Advance 10 steps"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center space-x-0.5"
                >
                  <FastForward className="w-3 h-3" />
                  <span>+10s</span>
                </button>
              </div>
            )}

            <div className="hidden lg:flex items-center space-x-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[11px]">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>{currentTime}</span>
            </div>

            <button
              onClick={handleRunDemo}
              disabled={isRunningDemo}
              className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunningDemo ? 'Running...' : 'Demo'}</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isResetting}
              title="Reset Grid & State"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            </button>

            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                title="Open Quick Reference & Glossary"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 rounded transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
