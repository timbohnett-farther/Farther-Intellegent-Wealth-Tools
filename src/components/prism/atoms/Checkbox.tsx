'use client';

import React from 'react';
import { Checkbox as TremorCheckbox } from '@/components/ui/Checkbox';

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
    <TremorCheckbox
      id={checkboxId}
      checked={checked}
      onChange={onCheckedChange ? (e) => onCheckedChange(e.target.checked) : undefined}
      disabled={disabled}
      label={label}
    />
  );
};

Checkbox.displayName = 'Checkbox';
