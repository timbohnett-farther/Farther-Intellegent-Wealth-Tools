"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  id?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, label, className, id }, ref) => {
    return (
      <label
        className={cn(
          "inline-flex items-center gap-2.5 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <button
          ref={ref}
          id={id}
          role="switch"
          type="button"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
            "border-[1.5px] border-transparent transition-colors duration-200",
            "focus-visible:outline-hidden focus-visible:shadow-focus",
            "disabled:cursor-not-allowed",
            checked ? "bg-teal-500" : "bg-white/20"
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs",
              "transition-transform duration-200",
              checked ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </button>
        {label && (
          <span className="text-sm text-white/60">{label}</span>
        )}
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch, type SwitchProps };
