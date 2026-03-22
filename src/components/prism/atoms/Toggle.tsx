'use client';

import React from 'react';
import { Switch } from '@/components/ui/Switch';

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
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      label={label}
    />
  );
};

Toggle.displayName = 'Toggle';
