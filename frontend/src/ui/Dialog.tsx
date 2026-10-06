import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0 duration-100" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full ${maxWidth} bg-panel border border-border rounded-md shadow-popover p-0 overflow-hidden font-ui focus:outline-none animate-in fade-in-0 zoom-in-95 duration-100`}
        >
          {/* Header */}
          <div className="h-9 px-3.5 bg-panel-alt border-b border-border flex items-center justify-between">
            <DialogPrimitive.Title className="text-sm font-semibold text-text-main">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close dialog">
                ✕
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Description */}
          {description && (
            <DialogPrimitive.Description className="px-3.5 pt-2 text-xs text-text-muted">
              {description}
            </DialogPrimitive.Description>
          )}

          {/* Content */}
          <div className="p-3.5 text-xs text-text-main max-h-[75vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="h-10 px-3.5 bg-panel-alt border-t border-border flex items-center justify-end space-x-2">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
