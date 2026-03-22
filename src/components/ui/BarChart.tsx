"use client";

import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartConfig } from "@/lib/design-system/tokens/chart-config";
import { chartColors, type ChartColorName } from "@/lib/utils/chartUtils";

interface BarChartProps {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors?: ChartColorName[];
  stacked?: boolean;
  layout?: "horizontal" | "vertical";
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  yAxisWidth?: number;
  valueFormatter?: (value: number) => string;
  height?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customTooltip?: React.ComponentType<any>;
  className?: string;
}

function BarChart({
  data,
  index,
  categories,
  colors = ["brand", "brand-light"],
  stacked = false,
  layout = "horizontal",
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showLegend = false,
  yAxisWidth = 60,
  valueFormatter,
  height = 380,
  customTooltip: CustomTooltip,
  className,
}: BarChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={chartConfig.barChart.barGap}
          barCategoryGap={chartConfig.barChart.barCategoryGap}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartConfig.gridColor}
              vertical={layout === "vertical"}
              horizontal={layout === "horizontal"}
            />
          )}
          {layout === "horizontal" ? (
            <>
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
            </>
          ) : (
            <>
              {showYAxis && (
                <YAxis
                  dataKey={index}
                  type="category"
                  width={yAxisWidth}
                  tick={{ fontSize: chartConfig.axisFontSize, fill: chartConfig.axisLabelColor }}
                  tickLine={false}
                  axisLine={false}
                />
              )}
              {showXAxis && (
                <XAxis
                  type="number"
                  tick={{ fontSize: chartConfig.axisFontSize, fill: chartConfig.axisLabelColor }}
                  tickLine={false}
                  axisLine={{ stroke: chartConfig.axisColor }}
                  tickFormatter={valueFormatter}
                />
              )}
            </>
          )}
          <Tooltip
            content={
              CustomTooltip ? (
                <CustomTooltip />
              ) : undefined
            }
            cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{
                fontSize: chartConfig.legendFontSize,
                color: chartConfig.legendColor,
                fontFamily: chartConfig.fontFamily,
              }}
            />
          )}
          {categories.map((cat, i) => {
            const colorName = colors[i % colors.length];
            const color = chartColors[colorName];
            return (
              <Bar
                key={cat}
                dataKey={cat}
                stackId={stacked ? "stack" : undefined}
                fill={color}
                radius={chartConfig.barChart.barRadius}
                animationDuration={chartConfig.animation.duration}
              />
            );
          })}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { BarChart, type BarChartProps };
