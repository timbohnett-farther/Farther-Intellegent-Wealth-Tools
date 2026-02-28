'use client';

import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import clsx from 'clsx';

export interface ToggleProps {
  /** Whether the toggle is on */
  checked?: boolean;
  /** Callback when the toggle state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Disable the toggle */
  disabled?: boolean;
  /** Optional label displayed next to the toggle */
  label?: string;
  /** HTML id attribute */
  id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
}) => {
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="inline-flex items-center gap-2">
      <SwitchPrimitive.Root
        id={toggleId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={clsx(
          'peer relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-brand-500',
          'data-[state=unchecked]:bg-gray-200',
        )}
      >
        <SwitchPrimitive.Thumb
          className={clsx(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm',
            'transition-transform',
            'data-[state=checked]:translate-x-4',
            'data-[state=unchecked]:translate-x-0',
          )}
        />
      </SwitchPrimitive.Root>

      {label && (
        <label
          htmlFor={toggleId}
          className={clsx(
            'text-sm text-gray-700 select-none',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

Toggle.displayName = 'Toggle';
