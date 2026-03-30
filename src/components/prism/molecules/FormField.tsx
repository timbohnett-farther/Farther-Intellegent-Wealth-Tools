'use client';

import React from 'react';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils/cn';

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
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label required={required}>{label}</Label>

      {children}

      {error && (
        <p className="text-xs text-critical-500" role="alert">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
}
