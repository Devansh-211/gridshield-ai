import React from 'react';
import { Button } from './Button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  badge,
  children,
  footer,
  width = 'w-96',
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 animate-in fade-in-0 duration-100"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <aside
        className={`relative z-50 h-full ${width} bg-panel border-l border-border shadow-popover flex flex-col font-ui focus:outline-none animate-in slide-in-from-right duration-150`}
      >
        {/* Header */}
        <div className="h-8 min-h-[32px] px-3 bg-panel-alt border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <h3 className="text-xs font-semibold text-text-main truncate">
              {title}
            </h3>
            {badge}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-y-auto text-xs text-text-main">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="h-9 px-3 bg-panel-alt border-t border-border flex items-center justify-end space-x-2">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
};
