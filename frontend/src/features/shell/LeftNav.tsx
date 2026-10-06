import React from 'react';
import { UI_STRINGS } from '../../content/strings';

export type NavTabId =
  | 'overview'
  | 'grid'
  | 'alarms'
  | 'incidents'
  | 'trends'
  | 'scenarios'
  | 'models'
  | 'explained'
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
  const navItems: Array<{ id: NavTabId; label: string; count?: number; countAlert?: boolean }> = [
    { id: 'overview', label: UI_STRINGS.nav.overview },
    { id: 'grid', label: UI_STRINGS.nav.grid },
    {
      id: 'alarms',
      label: UI_STRINGS.nav.alarms,
      count: unackAlarmsCount > 0 ? unackAlarmsCount : undefined,
      countAlert: hasCriticalAlarm,
    },
    {
      id: 'incidents',
      label: UI_STRINGS.nav.incidents,
      count: openIncidentsCount > 0 ? openIncidentsCount : undefined,
      countAlert: openIncidentsCount > 0,
    },
    { id: 'trends', label: UI_STRINGS.nav.trends },
    { id: 'scenarios', label: UI_STRINGS.nav.scenarios },
    { id: 'models', label: UI_STRINGS.nav.models },
    { id: 'explained', label: UI_STRINGS.nav.explained },
  ];

  return (
    <nav
      className="w-[188px] min-w-[188px] bg-panel border-r border-border flex flex-col justify-between py-1.5 select-none z-20"
      aria-label="Main Navigation"
    >
      <div className="flex flex-col space-y-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between h-8 px-3 text-[14px] font-ui text-left transition-colors border-l-2 ${
                isActive
                  ? 'border-l-accent bg-panel-alt text-text-main font-semibold'
                  : 'border-l-transparent text-text-muted hover:text-text-main hover:bg-panel-alt/50'
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={`text-[11px] font-mono ${
                    item.countAlert
                      ? 'text-alarm-critical font-bold'
                      : 'text-text-subtle'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Development-only Kitchen Sink Link — hidden in production builds */}
      {import.meta.env.DEV && (
        <div className="pt-2 border-t border-border/40 px-3">
          <button
            onClick={() => onSelectTab('kitchen')}
            className={`w-full text-left text-[11px] font-mono transition-colors ${
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
