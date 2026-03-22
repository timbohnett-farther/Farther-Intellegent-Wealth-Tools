"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
  label,
  showValue,
  formatValue,
  className,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-xs font-medium text-charcoal-700">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-mono font-semibold text-brand-700">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-limestone-200",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-brand-700 [&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          style={{
            background: `linear-gradient(to right, #3B5A69 0%, #3B5A69 ${percentage}%, #E4DDD4 ${percentage}%, #E4DDD4 100%)`,
          }}
        />
      </div>
    </div>
  );
}

export { Slider, type SliderProps };
