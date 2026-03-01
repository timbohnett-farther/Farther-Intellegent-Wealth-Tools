'use client';

import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import clsx from 'clsx';

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked?: boolean;
  /** Callback when the checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Disable the checkbox */
  disabled?: boolean;
  /** Optional label displayed next to the checkbox */
  label?: string;
  /** HTML id attribute */
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
}) => {
  const checkboxId = id || (label ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="inline-flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={clsx(
          'peer h-4 w-4 shrink-0 rounded border border-limestone-300 bg-white',
          'transition-colors',
          'focus-visible:outline-none focus-visible:shadow-focus',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-700',
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label && (
        <label
          htmlFor={checkboxId}
          className={clsx(
            'text-sm text-charcoal-700 select-none',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

Checkbox.displayName = 'Checkbox';
