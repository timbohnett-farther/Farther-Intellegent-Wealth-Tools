// Tremor chart color utilities for dark glass-morphism palette

export type ChartColorName =
  | "brand"
  | "brand-light"
  | "brand-dark"
  | "charcoal"
  | "limestone"
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "gold"
  | "purple"
  | "terra"
  | "cyan";

export const chartColors: Record<ChartColorName, string> = {
  brand: "#1d7682",
  "brand-light": "#b6d0ed",
  "brand-dark": "#0d3538",
  charcoal: "rgba(255, 255, 255, 0.40)",
  limestone: "rgba(255, 255, 255, 0.10)",
  success: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  info: "#3b82f6",
  gold: "#f59e0b",
  purple: "#8b5cf6",
  terra: "#f97316",
  cyan: "#06b6d4",
};

export const getChartColor = (name: ChartColorName): string =>
  chartColors[name];

export const defaultChartColorSeries: ChartColorName[] = [
  "brand",
  "brand-light",
  "success",
  "warning",
  "gold",
  "purple",
  "terra",
  "cyan",
  "info",
  "critical",
];
