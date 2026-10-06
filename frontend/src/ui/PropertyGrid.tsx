import React from 'react';
import { ProvenanceChip, ProvenanceType } from './ProvenanceChip';

export interface PropertyItem {
  id?: string;
  label: string;
  value: React.ReactNode;
  unit?: string;
  provenance?: ProvenanceType | string;
  isNumeric?: boolean;
  statusBadge?: React.ReactNode;
  highlight?: 'critical' | 'high' | 'medium' | 'low' | 'ok';
}

interface PropertyGridProps {
  items: PropertyItem[];
  className?: string;
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  items,
  className = '',
}) => {
  return (
    <div className={`flex flex-col border border-border bg-panel text-xs ${className}`}>
      {items.map((item, idx) => {
        const highlightClass =
          item.highlight === 'critical'
            ? 'text-alarm-critical font-semibold'
            : item.highlight === 'high'
            ? 'text-alarm-high font-semibold'
            : item.highlight === 'medium'
            ? 'text-alarm-medium'
            : item.highlight === 'ok'
            ? 'text-alarm-ok'
            : 'text-text-main';

        return (
          <div
            key={item.id || idx}
            className="flex items-center justify-between min-h-[26px] py-1 px-2.5 border-b border-border/40 last:border-b-0 hover:bg-panel-alt transition-colors"
          >
            {/* Label (40%) */}
            <span className="w-2/5 text-text-muted text-xs font-normal truncate select-none">
              {item.label}
            </span>

            {/* Value (60%) + Unit + Provenance */}
            <div className="w-3/5 flex items-center justify-end space-x-1.5 text-right">
              {item.statusBadge}
              <span
                className={`truncate ${
                  item.isNumeric !== false ? 'font-mono' : 'font-ui'
                } ${highlightClass}`}
              >
                {item.value}
              </span>
              {item.unit && (
                <span className="text-[11px] font-mono text-text-subtle select-none">
                  {item.unit}
                </span>
              )}
              {item.provenance && (
                <ProvenanceChip provenance={item.provenance} className="shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
