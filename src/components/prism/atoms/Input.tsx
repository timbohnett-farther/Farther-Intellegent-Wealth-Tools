'use client';

import React from 'react';
import clsx from 'clsx';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input type */
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'password';
  /** Optional label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      placeholder,
      value,
      onChange,
      disabled = false,
      error,
      className,
      label,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-charcoal-700"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            'h-9 w-full rounded-lg border-[1.5px] bg-white px-3 text-sm text-charcoal-900',
            'placeholder:text-charcoal-300',
            'transition-colors',
            'focus:outline-none focus:border-brand-700 focus:shadow-focus',
            'disabled:cursor-not-allowed disabled:bg-limestone-50 disabled:text-charcoal-300',
            error
              ? 'border-critical-500 focus:border-critical-500'
              : 'border-limestone-200',
            className,
          )}
          {...props}
        />

        {error && (
          <p className="text-xs text-critical-500">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
