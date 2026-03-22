'use client';

import React from 'react';
import { SelectNative } from '@/components/ui/SelectNative';
import { Label } from '@/components/ui/Label';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Array of options to display */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Error message displayed below the select */
  error?: string;
  /** Optional label displayed above the select */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** HTML name attribute */
  name?: string;
  /** HTML id attribute */
  id?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder,
      disabled = false,
      error,
      label,
      className,
      name,
      id,
    },
    ref,
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label htmlFor={selectId}>{label}</Label>
        )}

        <SelectNative
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          hasError={!!error}
          className={className}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectNative>

        {error && (
          <p className="text-xs text-critical-500">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
