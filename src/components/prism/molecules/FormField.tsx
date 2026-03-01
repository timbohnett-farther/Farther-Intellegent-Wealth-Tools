'use client';

import React from 'react';
import clsx from 'clsx';

export interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  helperText,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label className="text-sm font-medium text-charcoal-700">
        {label}
        {required && <span className="ml-0.5 text-critical-500">*</span>}
      </label>

      {children}

      {error && (
        <p className="text-xs text-critical-500" role="alert">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="text-xs text-charcoal-500">{helperText}</p>
      )}
    </div>
  );
}
