import React from 'react';

interface ToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  left,
  right,
  children,
  className = '',
}) => {
  return (
    <div
      className={`h-7 min-h-[28px] px-2 bg-panel-alt border-b border-border flex items-center justify-between text-xs select-none ${className}`}
    >
      <div className="flex items-center space-x-2 truncate">
        {left || children}
      </div>
      {right && <div className="flex items-center space-x-1.5">{right}</div>}
    </div>
  );
};

export const ToolbarSeparator: React.FC = () => (
  <div className="h-4 w-[1px] bg-border mx-1 shrink-0" />
);
