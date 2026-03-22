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
      success: "bg-success-500/20 text-success-300 border border-success-500/30",
      warning: "bg-warning-500/20 text-warning-300 border border-warning-500/30",
      critical: "bg-critical-500/20 text-critical-300 border border-critical-500/30",
      info: "bg-info-500/20 text-info-300 border border-info-500/30",
      neutral: "bg-white/[0.08] text-white/60 border border-white/30",
      brand: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
      "mass-affluent": "bg-white/[0.06] text-white/50 border border-white/30",
      hnw: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
      vhnw: "bg-teal-500/25 text-teal-300 border border-teal-500/30",
      uhnw: "bg-teal-500 text-white border border-teal-500/30",
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
