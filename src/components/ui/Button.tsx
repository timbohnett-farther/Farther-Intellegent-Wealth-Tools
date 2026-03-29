"use client";

import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const buttonVariants = tv({
  base: [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold transition-all duration-150 cursor-pointer",
    "border-none relative overflow-hidden",
    "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
    "focus-visible:outline-hidden focus-visible:shadow-focus",
  ],
  variants: {
    variant: {
      primary: [
        "text-text rounded-md",
        "bg-gradient-to-br from-brand-500 to-brand-600",
        "hover:from-brand-400 hover:to-brand-500",
        "active:from-brand-700 active:to-brand-800",
      ],
      secondary: [
        "rounded-md text-text-subtle",
        "bg-surface-soft border-[1.5px] border-border-strong",
        "hover:bg-surface-strong hover:text-text",
        "active:bg-surface-subtle",
      ],
      ghost: [
        "bg-transparent text-text-muted rounded-md",
        "hover:bg-surface-subtle hover:text-text",
        "active:bg-surface-soft",
      ],
      danger: "bg-critical-500 text-text rounded-md hover:bg-[#dc2626] active:bg-[#b91c1c]",
    },
    size: {
      sm: "h-8 px-3 text-[13px] rounded",
      md: "h-10 px-5 text-sm",
      lg: "h-12 px-7 text-[15px]",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, type ButtonProps };
