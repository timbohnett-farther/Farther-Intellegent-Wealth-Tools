import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const cardVariants = tv({
  base: [
    "rounded-2xl",
    "bg-[rgba(255,255,255,0.07)]",
    "border border-[rgba(255,255,255,0.12)]",
    "shadow-glass",
    "backdrop-blur-xl",
  ],
  variants: {
    variant: {
      default: "",
      kpi: "rounded-2xl px-7 py-6",
      module: "overflow-hidden shadow-none",
      insight: [
        "p-5 transition-all duration-200 border-l-[3px] border-l-transparent",
        "hover:shadow-glass hover:-translate-y-px",
      ],
      alert: "rounded-md p-3.5 flex items-start gap-3 text-sm",
    },
    status: {
      critical: "",
      warning: "",
      success: "",
      info: "",
    },
  },
  compoundVariants: [
    { variant: "insight", status: "critical", className: "border-l-critical-500" },
    { variant: "insight", status: "warning", className: "border-l-warning-500" },
    { variant: "insight", status: "info", className: "border-l-brand-500" },
    { variant: "alert", status: "critical", className: "bg-critical-50 border-critical-100 text-critical-300" },
    { variant: "alert", status: "warning", className: "bg-warning-50 border-warning-100 text-warning-300" },
    { variant: "alert", status: "success", className: "bg-success-50 border-success-100 text-success-300" },
    { variant: "alert", status: "info", className: "bg-info-50 border-info-100 text-info-300" },
  ],
  defaultVariants: {
    variant: "default",
  },
});

type CardVariantProps = VariantProps<typeof cardVariants>;

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    CardVariantProps {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, status, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, status }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export { Card, cardVariants, type CardProps };
