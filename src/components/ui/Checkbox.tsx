"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, onChange, disabled, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              "flex h-4.5 w-4.5 items-center justify-center rounded",
              "border-[1.5px] border-white/[0.15] bg-white/[0.06]",
              "transition-all duration-150",
              "peer-focus-visible:shadow-focus",
              "peer-checked:bg-teal-500 peer-checked:border-teal-500",
              "peer-disabled:opacity-50"
            )}
          >
            {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
        </span>
        {label && (
          <span className="text-sm text-white/60">{label}</span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
