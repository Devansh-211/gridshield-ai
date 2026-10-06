import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export interface TabItem {
  id: string;
  label: string;
  badge?: React.ReactNode;
}

interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  tabs: TabItem[];
  children?: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  tabs,
  children,
  className = '',
}) => {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={`flex flex-col h-full ${className}`}
    >
      <TabsPrimitive.List className="flex items-center h-7 min-h-[28px] border-b border-border bg-panel px-1 select-none space-x-1">
        {tabs.map((tab) => {
          const isActive = value === tab.id;
          return (
            <TabsPrimitive.Trigger
              key={tab.id}
              value={tab.id}
              className={`relative flex items-center h-full px-2.5 text-xs font-ui transition-colors ${
                isActive
                  ? 'text-text-main font-semibold border-b-2 border-accent bg-panel-alt'
                  : 'text-text-muted hover:text-text-main hover:bg-panel-alt/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && <span className="ml-1.5">{tab.badge}</span>}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
};

export const TabContent = TabsPrimitive.Content;
