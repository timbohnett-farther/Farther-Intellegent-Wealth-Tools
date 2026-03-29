import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const badgeVariants = tv({
  base: [
    "inline-flex items-center gap-1 rounded-full whitespace-nowrap",
    "text-[11px] font-bold uppercase tracking-[0.04em]",
    "px-2.5 py-0.5",
  ],
  variants: {
    variant: {
      success: "bg-success-500/20 text-success-300",
      warning: "bg-warning-500/20 text-warning-300",
      critical: "bg-critical-500/20 text-critical-300",
      info: "bg-info-500/20 text-info-300",
      neutral: "bg-surface-soft text-text-muted",
      brand: "bg-accent-primary/20 text-accent-primarySoft",
      "mass-affluent": "bg-surface-subtle text-text-muted",
      hnw: "bg-accent-primary/15 text-accent-primarySoft",
      vhnw: "bg-accent-primary/25 text-accent-primarySoft",
      uhnw: "bg-accent-primary text-text",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

type BadgeVariantProps = VariantProps<typeof badgeVariants>;

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    BadgeVariantProps {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants, type BadgeProps };
