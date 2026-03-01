'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';

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
  const displayValue = useMemo(
    () => (formatValue ? formatValue(value) : String(value)),
    [value, formatValue],
  );

  const minLabel = useMemo(
    () => (formatValue ? formatValue(min) : String(min)),
    [min, formatValue],
  );

  const maxLabel = useMemo(
    () => (formatValue ? formatValue(max) : String(max)),
    [max, formatValue],
  );

  // Calculate fill percentage for the track
  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className={clsx('w-full', className)}>
      {(label || displayValue) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-charcoal-700">{label}</span>
          )}
          <span className="text-sm font-semibold tabular-nums text-brand-700">
            {displayValue}
          </span>
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-input w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3B5A69 0%, #3B5A69 ${fillPercent}%, #E4DDD4 ${fillPercent}%, #E4DDD4 100%)`,
          height: '6px',
          borderRadius: '9999px',
          WebkitAppearance: 'none',
          appearance: 'none',
          outline: 'none',
        }}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      />

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-charcoal-300">{minLabel}</span>
        <span className="text-xs text-charcoal-300">{maxLabel}</span>
      </div>

      {/* Inline styles for the slider thumb across browsers */}
      <style jsx>{`
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3B5A69;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .slider-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3B5A69;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .slider-input::-moz-range-track {
          background: transparent;
          border: none;
          height: 6px;
        }
      `}</style>
    </div>
  );
}
