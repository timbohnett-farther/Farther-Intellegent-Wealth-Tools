import React from "react";
import { cn } from "@/lib/utils/cn";
import { chartColors, type ChartColorName } from "@/lib/utils/chartUtils";

interface BarListItem {
  name: string;
  value: number;
  color?: ChartColorName;
  href?: string;
  icon?: React.ReactNode;
}

interface BarListProps {
  data: BarListItem[];
  valueFormatter?: (value: number) => string;
  color?: ChartColorName;
  showAnimation?: boolean;
  className?: string;
}

function BarList({
  data,
  valueFormatter = (v) => String(v),
  color = "brand",
  showAnimation = true,
  className,
}: BarListProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((item, i) => {
        const barColor = chartColors[item.color || color];
        const percentage = (item.value / maxValue) * 100;

        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm text-text-muted truncate">
                {item.icon}
                <span className="truncate">{item.name}</span>
              </div>
              <span className="text-sm font-mono font-medium text-text ml-2 shrink-0">
                {valueFormatter(item.value)}
              </span>
            </div>
            <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  showAnimation && "transition-[width] duration-800 ease-ripple"
                )}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { BarList, type BarListProps, type BarListItem };
