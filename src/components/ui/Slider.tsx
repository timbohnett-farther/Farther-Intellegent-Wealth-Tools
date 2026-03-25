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
            <span className="text-xs font-medium text-white/60">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-mono font-semibold text-teal-300">
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
            "bg-white/10",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-[#1a1a1a] [&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          style={{
            background: `linear-gradient(to right, #4E7082 0%, #4E7082 ${percentage}%, rgba(255,255,255,0.10) ${percentage}%, rgba(255,255,255,0.10) 100%)`,
          }}
        />
      </div>
    </div>
  );
}

export { Slider, type SliderProps };
