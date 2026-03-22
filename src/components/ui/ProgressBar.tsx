import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const progressVariants = tv({
  base: "h-full rounded-full transition-[width] duration-800 ease-ripple",
  variants: {
    status: {
      default: "bg-brand-700",
      funded: "bg-success-500",
      "on-track": "bg-brand-700",
      "at-risk": "bg-warning-500",
      underfunded: "bg-critical-500",
    },
  },
  defaultVariants: {
    status: "default",
  },
});

interface ProgressBarProps extends VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

function ProgressBar({
  value,
  max = 100,
  label,
  showValue,
  status,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-charcoal-700">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs font-mono font-medium text-charcoal-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full h-2 bg-limestone-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={progressVariants({ status })}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { ProgressBar, type ProgressBarProps };
