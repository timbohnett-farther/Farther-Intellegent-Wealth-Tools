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
      success: "bg-success-100 text-success-700",
      warning: "bg-warning-100 text-warning-700",
      critical: "bg-critical-100 text-critical-700",
      info: "bg-info-100 text-info-700",
      neutral: "bg-charcoal-50 text-charcoal-700",
      brand: "bg-brand-100 text-brand-700",
      "mass-affluent": "bg-limestone-100 text-charcoal-500",
      hnw: "bg-brand-100 text-brand-700",
      vhnw: "bg-brand-200 text-brand-800",
      uhnw: "bg-brand-700 text-white",
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
