'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PercentInputProps {
  /** Stored as decimal (e.g., 0.07 for 7%) */
  value: number;
  /** Receives decimal value (e.g., 0.07 for 7%) */
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Min as decimal (e.g., 0 for 0%) */
  min?: number;
  /** Max as decimal (e.g., 1 for 100%) */
  max?: number;
  className?: string;
}

function decimalToDisplay(decimal: number): string {
  if (isNaN(decimal) || decimal === 0) return '';
  return (decimal * 100).toFixed(2);
}

export function PercentInput({
  value,
  onChange,
  placeholder = '0.00',
  disabled = false,
  error = false,
  min,
  max,
  className,
}: PercentInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    value ? decimalToDisplay(value) : '',
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync when value changes externally (only when not focused)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value ? decimalToDisplay(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');

      // Allow empty or partial input
      if (raw === '' || raw === '.') {
        setDisplayValue(raw);
        onChange(0);
        return;
      }

      // Prevent multiple decimal points
      const decimalCount = (raw.match(/\./g) || []).length;
      if (decimalCount > 1) return;

      const parsed = parseFloat(raw);
      if (isNaN(parsed)) return;

      setDisplayValue(raw);
      // Convert display percentage to decimal for storage
      onChange(parsed / 100);
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    let clamped = value;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    if (clamped !== value) {
      onChange(clamped);
    }
    setDisplayValue(clamped ? decimalToDisplay(clamped) : '');
  }, [value, onChange, min, max]);

  return (
    <div
      className={cn(
        'flex items-center rounded-input border bg-text transition-colors',
        error
          ? 'border-critical-500 focus-within:ring-2 focus-within:ring-critical-100'
          : 'border-border-subtle focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-brand-100',
        disabled && 'cursor-not-allowed bg-transparent opacity-60',
        className,
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full bg-transparent py-2 pl-3 pr-1 text-sm font-mono text-text outline-hidden',
          'tabular-nums placeholder:text-text-faint',
          disabled && 'cursor-not-allowed',
        )}
        aria-invalid={error || undefined}
      />
      <span className="select-none pr-3 text-sm text-text-muted">%</span>
    </div>
  );
}
