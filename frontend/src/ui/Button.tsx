import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-ui font-medium select-none transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-6 px-2 text-[11px] gap-1',
    md: 'h-7 px-2.5 text-xs gap-1.5',
    lg: 'h-8 px-3 text-xs gap-2',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-accent text-[var(--sim-badge-fg)] hover:bg-[var(--accent-hover)] active:bg-accent border border-accent',
    secondary:
      'bg-panel text-text-main hover:bg-panel-alt active:bg-inset border border-border hover:border-border-strong',
    danger:
      'bg-panel text-alarm-critical hover:bg-alarm-critical/10 active:bg-alarm-critical/20 border border-alarm-critical',
    ghost:
      'bg-transparent text-text-muted hover:text-text-main hover:bg-panel-alt active:bg-inset',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
