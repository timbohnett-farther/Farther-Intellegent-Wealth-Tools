// Tremor chart color utilities for Farther brand palette

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
  brand: "#3B5A69",
  "brand-light": "#7EA4B8",
  "brand-dark": "#1E3642",
  charcoal: "#6B6B6B",
  limestone: "#D4CCC2",
  success: "#2E8B57",
  warning: "#D4860B",
  critical: "#C0392B",
  info: "#2980B9",
  gold: "#E8A838",
  purple: "#7B68EE",
  terra: "#E07B54",
  cyan: "#06B6D4",
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
