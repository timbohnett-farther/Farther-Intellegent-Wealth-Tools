"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";

interface SelectNativeProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, hasError, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full h-10 px-3.5 pr-10 rounded-md text-sm text-text",
            "bg-surface-subtle",
            "outline-hidden transition-all duration-150 appearance-none",
            "border-[1.5px] border-border-subtle",
            "hover:border-border-strong",
            "focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(78,112,130,0.25)]",
            "disabled:bg-surface-soft disabled:text-text-faint disabled:cursor-not-allowed",
            hasError && "border-critical-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          aria-hidden="true"
        />
      </div>
    );
  }
);
SelectNative.displayName = "SelectNative";

export { SelectNative, type SelectNativeProps };
