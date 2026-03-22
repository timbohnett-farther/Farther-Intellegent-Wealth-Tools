"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = React.useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 px-3 py-1.5 rounded-md",
            "bg-[rgba(26,26,26,0.95)] text-white text-xs font-medium",
            "border border-white/[0.12]",
            "shadow-md whitespace-nowrap pointer-events-none",
            "animate-slide-in-up backdrop-blur-xl",
            positionClasses[side],
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export { Tooltip, type TooltipProps };
