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
} from 'lucide-react';
import { triggerGoldenDemo, resetSystem } from '../api/client';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openIncidentsCount: number;
  onDemoCompleted?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openIncidentsCount,
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
      setActiveTab('incidents');
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
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to reset system:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'SOC Dashboard', icon: Activity },
    { id: 'scenarios', label: 'Scenario Lab', icon: Sliders },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: AlertTriangle,
      badge: openIncidentsCount > 0 ? openIncidentsCount : undefined,
    },
    { id: 'analyst', label: 'AI Analyst Q&A', icon: Bot },
    { id: 'models', label: 'Model & System', icon: Cpu },
  ];

  return (
    <header className="bg-surface/90 backdrop-blur border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-cyan-950/80 border border-cyan-500/50 rounded-lg flex items-center justify-center glow-cyan">
              <ShieldAlert className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-white font-mono text-sm sm:text-base">
                  GRIDSHIELD<span className="text-cyan-400">.AI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  TWIN v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                IEEE 14-Bus Cyber-Physical Resilience Platform
              </p>
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons & Time */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-400">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>{currentTime}</span>
            </div>

            <button
              onClick={handleRunDemo}
              disabled={isRunningDemo}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningDemo ? 'Running...' : 'Run Demo'}</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isResetting}
              title="Reset Grid & State"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
