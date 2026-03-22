"use client";

import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartConfig } from "@/lib/design-system/tokens/chart-config";
import { chartColors, type ChartColorName } from "@/lib/utils/chartUtils";

interface SeriesConfig {
  dataKey: string;
  type: "bar" | "line" | "area";
  color?: ChartColorName;
  yAxisId?: string;
  stackId?: string;
  name?: string;
}

interface ComboChartProps {
  data: Record<string, unknown>[];
  index: string;
  series: SeriesConfig[];
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  yAxisWidth?: number;
  secondYAxis?: {
    orientation?: "left" | "right";
    width?: number;
    tickFormatter?: (value: number) => string;
  };
  valueFormatter?: (value: number) => string;
  height?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customTooltip?: React.ComponentType<any>;
  className?: string;
}

function ComboChart({
  data,
  index,
  series,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showLegend = false,
  yAxisWidth = 60,
  secondYAxis,
  valueFormatter,
  height = 380,
  customTooltip: CustomTooltip,
  className,
}: ComboChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              yAxisId="left"
              width={yAxisWidth}
              tick={{ fontSize: chartConfig.axisFontSize, fill: chartConfig.axisLabelColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
          )}
          {secondYAxis && (
            <YAxis
              yAxisId="right"
              orientation={secondYAxis.orientation || "right"}
              width={secondYAxis.width || 60}
              tick={{ fontSize: chartConfig.axisFontSize, fill: chartConfig.axisLabelColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={secondYAxis.tickFormatter}
            />
          )}
          <Tooltip
            content={CustomTooltip ? <CustomTooltip /> : undefined}
            cursor={{ fill: "rgba(59, 90, 105, 0.06)" }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{
                fontSize: chartConfig.legendFontSize,
                color: chartConfig.legendColor,
              }}
            />
          )}
          {series.map((s, i) => {
            const color = chartColors[s.color || "brand"];
            const yAxisId = s.yAxisId || "left";
            const name = s.name || s.dataKey;

            if (s.type === "bar") {
              return (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={name}
                  yAxisId={yAxisId}
                  stackId={s.stackId}
                  fill={color}
                  radius={chartConfig.barChart.barRadius}
                  animationDuration={chartConfig.animation.duration}
                />
              );
            }
            if (s.type === "area") {
              return (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={name}
                  yAxisId={yAxisId}
                  stroke={color}
                  fill={color}
                  fillOpacity={chartConfig.areaChart.fillOpacity}
                  strokeWidth={chartConfig.areaChart.strokeWidth}
                  animationDuration={chartConfig.animation.duration}
                />
              );
            }
            return (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={name}
                yAxisId={yAxisId}
                stroke={color}
                strokeWidth={chartConfig.lineChart.strokeWidth}
                dot={{ r: chartConfig.lineChart.dotRadius, fill: chartConfig.lineChart.dotFill, strokeWidth: 2, stroke: color }}
                activeDot={{ r: chartConfig.lineChart.dotHoverRadius, strokeWidth: chartConfig.lineChart.activeDotStrokeWidth }}
                animationDuration={chartConfig.animation.duration}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export { ComboChart, type ComboChartProps, type SeriesConfig };
