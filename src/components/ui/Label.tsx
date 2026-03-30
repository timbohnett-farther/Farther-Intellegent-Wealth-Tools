import React from "react";
import { cn } from "@/lib/utils/cn";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-[13px] font-semibold text-text-faint mb-1.5 tracking-[0.01em]",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-critical-500 ml-0.5">*</span>}
      </label>
    );
  }
);
Label.displayName = "Label";

export { Label, type LabelProps };
