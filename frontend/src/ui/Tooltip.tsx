import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 350,
}) => {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={4}
          className="z-50 max-w-xs px-2 py-1 text-[11px] font-ui text-[var(--sim-badge-fg)] bg-[var(--sim-badge-bg)] border border-border/60 rounded-sm shadow-popover select-none animate-in fade-in-0 duration-100"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--sim-badge-bg)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
