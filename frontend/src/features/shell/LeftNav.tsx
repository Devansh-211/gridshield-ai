import React from 'react';
import { UI_STRINGS } from '../../content/strings';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Layers,
  Bell,
  AlertTriangle,
  TrendingUp,
  FlaskConical,
  Cpu,
  Sparkles,
  BookOpen,
  Shield,
} from 'lucide-react';

export type NavTabId =
  | 'overview'
  | 'grid'
  | 'alarms'
  | 'incidents'
  | 'trends'
  | 'scenarios'
  | 'models'
  | 'explained'
  | 'glossary'
  | 'admin'
  | 'kitchen';

interface LeftNavProps {
  activeTab: NavTabId | string;
  onSelectTab: (tab: NavTabId) => void;
  unackAlarmsCount?: number;
  openIncidentsCount?: number;
  hasCriticalAlarm?: boolean;
}

export const LeftNav: React.FC<LeftNavProps> = ({
  activeTab,
  onSelectTab,
  unackAlarmsCount = 0,
  openIncidentsCount = 0,
  hasCriticalAlarm = false,
}) => {
  const { isSupervisor, isAdmin, isTechnician, user } = useAuth();

  let navItems: Array<{
    id: NavTabId;
    label: string;
    icon?: React.ReactNode;
    count?: number;
    countAlert?: boolean;
  }> = [];

  if (isSupervisor) {
    navItems = [
      { id: 'overview', label: 'Briefing Overview', icon: <Activity className="w-3.5 h-3.5 text-blue-400" /> },
      { id: 'grid', label: 'Regional Map', icon: <Layers className="w-3.5 h-3.5 text-emerald-400" /> },
      {
        id: 'incidents',
        label: 'Situation Log',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        count: openIncidentsCount > 0 ? openIncidentsCount : undefined,
        countAlert: openIncidentsCount > 0,
      },
      { id: 'glossary', label: 'Plain Glossary', icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" /> },
    ];
  } else if (isAdmin) {
    navItems = [
      { id: 'admin', label: 'Governance & Users', icon: <Shield className="w-3.5 h-3.5 text-purple-400" /> },
      { id: 'overview', label: UI_STRINGS.nav.overview, icon: <Activity className="w-3.5 h-3.5 text-blue-400" /> },
      { id: 'grid', label: UI_STRINGS.nav.grid, icon: <Layers className="w-3.5 h-3.5 text-emerald-400" /> },
      {
        id: 'alarms',
        label: UI_STRINGS.nav.alarms,
        icon: <Bell className="w-3.5 h-3.5 text-amber-400" />,
        count: unackAlarmsCount > 0 ? unackAlarmsCount : undefined,
        countAlert: hasCriticalAlarm,
      },
      {
        id: 'incidents',
        label: UI_STRINGS.nav.incidents,
        icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
        count: openIncidentsCount > 0 ? openIncidentsCount : undefined,
        countAlert: openIncidentsCount > 0,
      },
      { id: 'scenarios', label: UI_STRINGS.nav.scenarios, icon: <FlaskConical className="w-3.5 h-3.5 text-cyan-400" /> },
      { id: 'models', label: UI_STRINGS.nav.models, icon: <Cpu className="w-3.5 h-3.5 text-indigo-400" /> },
      { id: 'glossary', label: 'Plain Glossary', icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" /> },
    ];
  } else {
    // Default: Technician console
    navItems = [
      { id: 'overview', label: UI_STRINGS.nav.overview, icon: <Activity className="w-3.5 h-3.5 text-blue-400" /> },
      { id: 'grid', label: UI_STRINGS.nav.grid, icon: <Layers className="w-3.5 h-3.5 text-emerald-400" /> },
      {
        id: 'alarms',
        label: UI_STRINGS.nav.alarms,
        icon: <Bell className="w-3.5 h-3.5 text-amber-400" />,
        count: unackAlarmsCount > 0 ? unackAlarmsCount : undefined,
        countAlert: hasCriticalAlarm,
      },
      {
        id: 'incidents',
        label: UI_STRINGS.nav.incidents,
        icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
        count: openIncidentsCount > 0 ? openIncidentsCount : undefined,
        countAlert: openIncidentsCount > 0,
      },
      { id: 'trends', label: UI_STRINGS.nav.trends, icon: <TrendingUp className="w-3.5 h-3.5 text-teal-400" /> },
      { id: 'scenarios', label: UI_STRINGS.nav.scenarios, icon: <FlaskConical className="w-3.5 h-3.5 text-cyan-400" /> },
      { id: 'models', label: UI_STRINGS.nav.models, icon: <Cpu className="w-3.5 h-3.5 text-indigo-400" /> },
      { id: 'explained', label: UI_STRINGS.nav.explained, icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" /> },
    ];
  }

  return (
    <nav
      className="w-[200px] min-w-[200px] bg-panel border-r border-border flex flex-col justify-between py-1.5 select-none z-20"
      aria-label="Main Navigation"
    >
      <div className="flex flex-col space-y-0.5">
        {/* Role Mode Subtitle Indicator */}
        <div className="px-3 py-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border/40 flex items-center justify-between">
          <span>{user?.effective_role || 'OPERATOR'} VIEW</span>
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between h-8 px-3 text-[13px] font-ui text-left transition-colors border-l-2 cursor-pointer ${
                isActive
                  ? 'border-l-accent bg-panel-alt text-text-main font-semibold'
                  : 'border-l-transparent text-text-muted hover:text-text-main hover:bg-panel-alt/50'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {item.icon}
                <span>{item.label}</span>
              </span>
              {item.count !== undefined && (
                <span
                  className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                    item.countAlert
                      ? 'bg-red-500/20 text-red-400 font-bold'
                      : 'bg-app text-text-subtle'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Development-only Kitchen Sink Link */}
      {import.meta.env.DEV && (
        <div className="pt-2 border-t border-border/40 px-3">
          <button
            onClick={() => onSelectTab('kitchen')}
            className={`w-full text-left text-[11px] font-mono transition-colors cursor-pointer ${
              activeTab === 'kitchen'
                ? 'text-accent font-semibold'
                : 'text-text-subtle hover:text-text-muted'
            }`}
          >
            /_kitchen
          </button>
        </div>
      )}
    </nav>
  );
};
