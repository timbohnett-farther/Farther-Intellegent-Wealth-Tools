"use client";

import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const inputVariants = tv({
  base: [
    "w-full h-10 px-3.5 bg-white rounded-md text-sm text-charcoal-900",
    "outline-hidden transition-all duration-150",
    "border-[1.5px] border-limestone-200",
    "placeholder:text-charcoal-300",
    "hover:border-limestone-400",
    "focus:border-brand-700 focus:shadow-[0_0_0_3px_rgba(59,90,105,0.15)]",
    "disabled:bg-limestone-50 disabled:text-charcoal-300 disabled:cursor-not-allowed",
  ],
  variants: {
    hasError: {
      true: "border-critical-500 focus:shadow-[0_0_0_3px_rgba(192,57,43,0.15)]",
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
