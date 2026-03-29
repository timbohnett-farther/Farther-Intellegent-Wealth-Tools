'use client';

import React, { useMemo } from 'react';
import { Slider } from '@/components/ui/Slider';
import { cn } from '@/lib/utils/cn';

export interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  formatValue?: (v: number) => string;
  className?: string;
}

export function SliderInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  formatValue,
  className,
}: SliderInputProps) {
  const minLabel = useMemo(
    () => (formatValue ? formatValue(min) : String(min)),
    [min, formatValue],
  );

  const maxLabel = useMemo(
    () => (formatValue ? formatValue(max) : String(max)),
    [max, formatValue],
  );

  return (
    <div className={cn('w-full', className)}>
      <Slider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        label={label}
        showValue
        formatValue={formatValue}
      />

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-text-faint">{minLabel}</span>
        <span className="text-xs text-text-faint">{maxLabel}</span>
      </div>
    </div>
  );
}
