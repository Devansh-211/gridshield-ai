import React from 'react';

interface PaneProps {
  title?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export const Pane: React.FC<PaneProps> = ({
  title,
  badge,
  actions,
  children,
  className = '',
  contentClassName = '',
  noPadding = false,
}) => {
  return (
    <section
      className={`flex flex-col bg-panel border border-border overflow-hidden min-h-0 ${className}`}
    >
      {(title || actions) && (
        <header className="h-7 min-h-[28px] px-2.5 bg-panel-alt border-b border-border flex items-center justify-between select-none">
          <div className="flex items-center space-x-2 truncate">
            {title && (
              <h2 className="text-sm font-semibold text-text-main truncate">
                {title}
              </h2>
            )}
            {badge}
          </div>
          {actions && <div className="flex items-center space-x-1">{actions}</div>}
        </header>
      )}
      <div
        className={`flex-1 overflow-auto ${
          noPadding ? '' : 'p-2.5'
        } ${contentClassName}`}
      >
        {children}
      </div>
    </section>
  );
};
