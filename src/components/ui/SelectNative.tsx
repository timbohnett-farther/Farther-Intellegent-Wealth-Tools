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
            "w-full h-10 px-3.5 pr-10 bg-white rounded-md text-sm text-charcoal-900",
            "outline-hidden transition-all duration-150 appearance-none",
            "border-[1.5px] border-limestone-200",
            "hover:border-limestone-400",
            "focus:border-brand-700 focus:shadow-[0_0_0_3px_rgba(59,90,105,0.15)]",
            "disabled:bg-limestone-50 disabled:text-charcoal-300 disabled:cursor-not-allowed",
            hasError && "border-critical-500 focus:shadow-[0_0_0_3px_rgba(192,57,43,0.15)]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-500"
          aria-hidden="true"
        />
      </div>
    );
  }
);
SelectNative.displayName = "SelectNative";

export { SelectNative, type SelectNativeProps };
