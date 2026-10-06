import React from 'react';

export type StatusPriority =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'ADVISORY'
  | 'OK'
  | 'OFFLINE'
  | 'SUSPECT'
  | 'COMPROMISED';

interface StatusProps {
  status: StatusPriority | string;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    glyph: string;
    label: string;
  }
> = {
  CRITICAL: {
    border: 'border-l-[3px] border-l-[var(--alarm-critical)]',
    bg: 'bg-[var(--alarm-critical)]/10',
    text: 'text-[var(--alarm-critical)]',
    glyph: '◆',
    label: 'CRITICAL',
  },
  HIGH: {
    border: 'border-l-[3px] border-l-[var(--alarm-high)]',
    bg: 'bg-[var(--alarm-high)]/10',
    text: 'text-[var(--alarm-high)]',
    glyph: '▲',
    label: 'HIGH',
  },
  MEDIUM: {
    border: 'border-l-[3px] border-l-[var(--alarm-medium)]',
    bg: 'bg-[var(--alarm-medium)]/10',
    text: 'text-[var(--alarm-medium)]',
    glyph: '■',
    label: 'MEDIUM',
  },
  LOW: {
    border: 'border-l-[3px] border-l-[var(--alarm-low)]',
    bg: 'bg-[var(--alarm-low)]/10',
    text: 'text-[var(--alarm-low)]',
    glyph: '●',
    label: 'LOW',
  },
  ADVISORY: {
    border: 'border-l-[3px] border-l-[var(--advisory)]',
    bg: 'bg-[var(--advisory)]/10',
    text: 'text-[var(--advisory)]',
    glyph: '▬',
    label: 'ADVISORY',
  },
  OK: {
    border: 'border-l-[3px] border-l-[var(--ok)]',
    bg: 'bg-[var(--ok)]/10',
    text: 'text-[var(--ok)]',
    glyph: '✓',
    label: 'OK',
  },
  OFFLINE: {
    border: 'border-l-[3px] border-l-[var(--offline)]',
    bg: 'bg-[var(--offline)]/10',
    text: 'text-[var(--offline)]',
    glyph: '○',
    label: 'OFFLINE',
  },
  SUSPECT: {
    border: 'border-l-[3px] border-l-[var(--alarm-medium)]',
    bg: 'bg-[var(--alarm-medium)]/10',
    text: 'text-[var(--alarm-medium)]',
    glyph: '⚠',
    label: 'SUSPECT',
  },
  COMPROMISED: {
    border: 'border-l-[3px] border-l-[var(--compromised)]',
    bg: 'bg-[var(--compromised)]/10',
    text: 'text-[var(--compromised)]',
    glyph: '❖',
    label: 'COMPROMISED',
  },
};

export const Status: React.FC<StatusProps> = ({
  status,
  label,
  className = '',
}) => {
  const normalized = (status || '').toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.ADVISORY;
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center h-[18px] px-1.5 border border-border/40 text-[11px] font-mono font-medium select-none ${config.border} ${config.bg} ${config.text} ${className}`}
    >
      <span className="mr-1 text-[9px] leading-none">{config.glyph}</span>
      <span className="leading-none">{displayLabel}</span>
    </span>
  );
};
