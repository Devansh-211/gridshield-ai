import React from 'react';
import { Tooltip } from './Tooltip';
import { UI_STRINGS } from '../content/strings';

export type ProvenanceType =
  | 'SIMULATED'
  | 'SIM'
  | 'OBSERVED'
  | 'OBS'
  | 'ESTIMATED'
  | 'EST'
  | 'MODEL'
  | 'MDL'
  | 'CALCULATED'
  | 'CALC'
  | 'LLM';

interface ProvenanceChipProps {
  provenance?: ProvenanceType | string;
  className?: string;
}

export const ProvenanceChip: React.FC<ProvenanceChipProps> = ({
  provenance = 'CALC',
  className = '',
}) => {
  const norm = (provenance || 'CALC').toUpperCase();
  let code = 'CALC';
  if (norm.startsWith('SIM')) code = 'SIM';
  else if (norm.startsWith('OBS')) code = 'OBS';
  else if (norm.startsWith('EST')) code = 'EST';
  else if (norm.startsWith('MDL') || norm.startsWith('MOD')) code = 'MDL';
  else if (norm.startsWith('CALC')) code = 'CALC';
  else if (norm.startsWith('LLM')) code = 'LLM';

  const info = UI_STRINGS.provenance[code as keyof typeof UI_STRINGS.provenance] || {
    code,
    label: code,
    desc: 'Analytical data provenance source.',
  };

  return (
    <Tooltip content={<span><strong>{info.label}:</strong> {info.desc}</span>}>
      <span
        tabIndex={0}
        className={`inline-flex items-center h-4 px-1 border border-border-strong/70 text-[10px] font-mono text-text-subtle bg-inset/80 rounded-sm cursor-help select-none hover:border-accent hover:text-text-main transition-colors ${className}`}
      >
        {code}
      </span>
    </Tooltip>
  );
};
