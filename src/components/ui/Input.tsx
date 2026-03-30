"use client";

import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const inputVariants = tv({
  base: [
    "w-full h-10 px-3.5 rounded-md text-sm text-text",
    "bg-surface-subtle",
    "outline-hidden transition-all duration-150",
    "border-[1.5px] border-border-subtle",
    "placeholder:text-text-faint",
    "hover:border-border-strong",
    "focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(78,112,130,0.25)]",
    "disabled:bg-surface-soft disabled:text-text-faint disabled:cursor-not-allowed",
  ],
  variants: {
    hasError: {
      true: "border-critical-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]",
    },
  },
});

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputVariants({ hasError }), className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants, type InputProps };
