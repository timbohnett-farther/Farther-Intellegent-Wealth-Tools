'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  min?: number;
  max?: number;
  className?: string;
}

function formatWithCommas(n: number): string {
  if (isNaN(n) || n === 0) return '';
  const parts = n.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart = parts[1];
  // Trim trailing zeros after decimal, but keep .XX if non-zero
  if (decPart === '00') return intPart;
  return `${intPart}.${decPart}`;
}

function stripFormatting(s: string): string {
  return s.replace(/[^0-9.]/g, '');
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  error = false,
  min,
  max,
  className,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    value ? formatWithCommas(value) : '',
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync display when value changes externally (only when not focused)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value ? formatWithCommas(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = stripFormatting(e.target.value);

      // Allow empty or partial input while typing
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
      onChange(parsed);
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number on focus for easier editing
    if (value) {
      const raw = formatWithCommas(value);
      setDisplayValue(raw.replace(/,/g, ''));
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    let clamped = value;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    if (clamped !== value) {
      onChange(clamped);
    }
    setDisplayValue(clamped ? formatWithCommas(clamped) : '');
  }, [value, onChange, min, max]);

  return (
    <div
      className={cn(
        'flex items-center rounded-input border bg-white transition-colors',
        error
          ? 'border-critical-500 focus-within:ring-2 focus-within:ring-critical-100'
          : 'border-limestone-200 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-100',
        disabled && 'cursor-not-allowed bg-limestone-50 opacity-60',
        className,
      )}
    >
      <span className="select-none pl-3 text-sm text-charcoal-500">$</span>
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
          'w-full bg-transparent py-2 pl-1 pr-3 text-sm font-mono text-charcoal-900 outline-hidden',
          'tabular-nums placeholder:text-charcoal-300',
          disabled && 'cursor-not-allowed',
        )}
        aria-invalid={error || undefined}
      />
    </div>
  );
}
