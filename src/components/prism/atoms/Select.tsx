'use client';

import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

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
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-charcoal-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={clsx(
              'h-9 w-full appearance-none rounded-lg border-[1.5px] bg-white pl-3 pr-9 text-sm text-charcoal-900',
              'transition-colors',
              'focus:outline-none focus:border-brand-700 focus:shadow-focus',
              'disabled:cursor-not-allowed disabled:bg-limestone-50 disabled:text-charcoal-300',
              error
                ? 'border-critical-500 focus:border-critical-500'
                : 'border-limestone-200',
              !value && placeholder ? 'text-charcoal-300' : '',
              className,
            )}
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
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p className="text-xs text-critical-500">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
