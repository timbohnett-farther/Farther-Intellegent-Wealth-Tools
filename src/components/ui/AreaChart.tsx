"use client";

import React from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { chartConfig } from "@/lib/design-system/tokens/chart-config";
import { chartColors, type ChartColorName } from "@/lib/utils/chartUtils";

interface AreaChartProps {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors?: ChartColorName[];
  stacked?: boolean;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  yAxisWidth?: number;
  valueFormatter?: (value: number) => string;
  referenceLines?: Array<{
    y?: number;
    x?: string | number;
    label?: string;
    color?: string;
    strokeDasharray?: string;
  }>;
  height?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customTooltip?: React.ComponentType<any>;
  className?: string;
}

function AreaChart({
  data,
  index,
  categories,
  colors = ["brand", "brand-light"],
  stacked = false,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  yAxisWidth = 60,
  valueFormatter,
  referenceLines = [],
  height = 380,
  customTooltip: CustomTooltip,
  className,
}: AreaChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: chartConfig.tooltip.background,
          border: chartConfig.tooltip.border,
          borderRadius: chartConfig.tooltip.borderRadius,
          boxShadow: chartConfig.tooltip.boxShadow,
          padding: chartConfig.tooltip.padding,
          fontFamily: chartConfig.tooltip.fontFamily,
        }}
      >
        <p
          style={{
            color: chartConfig.tooltip.titleColor,
            fontSize: chartConfig.tooltip.titleSize,
            fontWeight: chartConfig.tooltip.titleWeight,
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
          <p key={i} style={{ color: entry.color, fontSize: chartConfig.tooltip.valueSize, margin: "2px 0" }}>
            {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartConfig.gridColor}
              vertical={false}
            />
          )}
          {showXAxis && (
            <XAxis
              dataKey={index}
              tick={{ fontSize: chartConfig.axisFontSize, fill: chartConfig.axisLabelColor }}
              tickLine={false}
              axisLine={{ stroke: chartConfig.axisColor }}
            />
          )}
          {showYAxis && (
            <YAxis
              width={yAxisWidth}
              tick={{ fontSize: chartConfig.axisFontSize, fill: chartConfig.axisLabelColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
          )}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={CustomTooltip ? <CustomTooltip /> : defaultTooltip as any} />
          {referenceLines.map((line, i) => (
            <ReferenceLine
              key={i}
              y={line.y}
              x={line.x}
              stroke={line.color || chartConfig.colors.primary}
              strokeDasharray={line.strokeDasharray || "6 4"}
              label={line.label ? { value: line.label, position: "insideTopRight", fontSize: 11, fill: chartConfig.axisLabelColor } : undefined}
            />
          ))}
          {categories.map((cat, i) => {
            const colorName = colors[i % colors.length];
            const color = chartColors[colorName];
            return (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId={stacked ? "stack" : undefined}
                stroke={color}
                fill={color}
                fillOpacity={chartConfig.areaChart.fillOpacity}
                strokeWidth={chartConfig.areaChart.strokeWidth}
                animationDuration={chartConfig.animation.duration}
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { AreaChart, type AreaChartProps };
