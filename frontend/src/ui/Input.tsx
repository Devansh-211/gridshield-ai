import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  unitSuffix?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  unitSuffix,
  error,
  helperText,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col space-y-1 text-xs">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-muted select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          disabled={disabled}
          className={`h-7 w-full px-2 text-xs bg-panel border rounded-sm font-ui text-text-main placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-inset disabled:text-text-subtle ${
            error ? 'border-alarm-critical' : 'border-border hover:border-border-strong'
          } ${unitSuffix ? 'pr-8 font-mono' : ''} ${className}`}
          {...props}
        />
        {unitSuffix && (
          <span className="absolute right-2 text-[11px] font-mono text-text-subtle pointer-events-none select-none">
            {unitSuffix}
          </span>
        )}
      </div>
      {error && <span className="text-[11px] text-alarm-critical">{error}</span>}
      {!error && helperText && (
        <span className="text-[11px] text-text-subtle">{helperText}</span>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col space-y-1 text-xs">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-text-muted select-none"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        className={`h-7 w-full px-2 text-xs bg-panel border rounded-sm font-ui text-text-main focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-inset disabled:text-text-subtle ${
          error ? 'border-alarm-critical' : 'border-border hover:border-border-strong'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-panel text-text-main">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-alarm-critical">{error}</span>}
    </div>
  );
};
