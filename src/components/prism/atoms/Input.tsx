'use client';

import React from 'react';
import { Input as TremorInput } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

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
          <Label htmlFor={inputId}>{label}</Label>
        )}

        <TremorInput
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          hasError={!!error}
          className={className}
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
