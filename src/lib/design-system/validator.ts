// src/lib/design-system/validator.ts
// Farther Prism — Design System Validation Engine
// Runs as part of CI/CD and test suite to catch design violations.

import { colors } from './tokens/colors';

// ── Types ─────────────────────────────────────────────────────────────

export interface DesignViolation {
  type: 'color' | 'spacing' | 'typography' | 'accessibility' | 'chart' | 'formatting';
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface DesignValidationReport {
  status: 'pass' | 'fail';
  score: number;
  totalChecks: number;
  violations: DesignViolation[];
  checkedAt: Date;
}

export interface DesignRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: DesignViolation['type'];
}

// ── Approved values from design tokens ──────────────────────────────

/** All hex colors approved by the design system (extracted from color tokens) */
function extractHexColors(obj: Record<string, unknown>, result: Set<string> = new Set()): Set<string> {
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(value)) {
      result.add(value.toLowerCase());
    } else if (typeof value === 'object' && value !== null) {
      extractHexColors(value as Record<string, unknown>, result);
    }
  }
  return result;
}

export const APPROVED_HEX_COLORS = extractHexColors(colors as unknown as Record<string, unknown>);

/** Approved spacing values (4px base unit system) */
export const APPROVED_SPACING_PX = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

/** Approved border radii */
export const APPROVED_RADII = ['0px', '4px', '8px', '12px', '16px', '24px', '9999px'];

/** Approved font sizes (rem scale) */
export const APPROVED_FONT_SIZES = [
  '0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem',
  '1.5rem', '1.875rem', '2.25rem', '3rem', '3.75rem',
];

/** Approved font weights */
export const APPROVED_FONT_WEIGHTS = [400, 500, 600, 700];

// ── Design Rules ────────────────────────────────────────────────────

export const DESIGN_RULES: DesignRule[] = [
  {
    id: 'COLOR-001',
    name: 'No hardcoded hex colors',
    description: 'All hex color values must reference a design token — no raw hex values in component code.',
    severity: 'error',
    category: 'color',
  },
  {
    id: 'COLOR-002',
    name: 'No hardcoded rgba/hsla colors',
    description: 'All rgba/hsla values must come from design tokens or overlay definitions.',
    severity: 'warning',
    category: 'color',
  },
  {
    id: 'SPACING-001',
    name: 'No off-grid spacing values',
    description: 'All spacing values must be multiples of 4px (the base spacing unit).',
    severity: 'warning',
    category: 'spacing',
  },
  {
    id: 'TYPO-001',
    name: 'Financial numbers use tabular numerals',
    description: 'Any element displaying currency or percentage values must use font-variant-numeric: tabular-nums.',
    severity: 'error',
    category: 'typography',
  },
  {
    id: 'TYPO-002',
    name: 'Monospace font for financial values',
    description: 'Currency amounts and percentage values should use JetBrains Mono font family.',
    severity: 'warning',
    category: 'typography',
  },
  {
    id: 'A11Y-001',
    name: 'Sufficient color contrast',
    description: 'All text must meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).',
    severity: 'error',
    category: 'accessibility',
  },
  {
    id: 'A11Y-002',
    name: 'Interactive elements have focus styles',
    description: 'All buttons, inputs, links, and interactive elements must have visible focus indicators.',
    severity: 'error',
    category: 'accessibility',
  },
  {
    id: 'A11Y-003',
    name: 'Color not sole indicator',
    description: 'Color must not be the only visual means of conveying information (use icons, patterns, or text labels).',
    severity: 'warning',
    category: 'accessibility',
  },
  {
    id: 'CHART-001',
    name: 'Charts have minimum height',
    description: 'No chart or data visualization may be shorter than 200px.',
    severity: 'error',
    category: 'chart',
  },
  {
    id: 'CHART-002',
    name: 'Charts use approved color palette',
    description: 'All chart series must use colors from the approved chart series palette.',
    severity: 'error',
    category: 'chart',
  },
  {
    id: 'FMT-001',
    name: 'Consistent currency formatting',
    description: 'Currency values must use formatCurrency or formatLargeDollar utilities — no manual formatting.',
    severity: 'warning',
    category: 'formatting',
  },
  {
    id: 'FMT-002',
    name: 'Consistent percentage formatting',
    description: 'Percentage values must use formatPercent utility — no manual percentage formatting.',
    severity: 'warning',
    category: 'formatting',
  },
];

// ── Static Analysis Validators ──────────────────────────────────────

/**
 * Check if a hex color is approved by the design system.
 */
export function isApprovedColor(hex: string): boolean {
  return APPROVED_HEX_COLORS.has(hex.toLowerCase());
}

/**
 * Check if a spacing value (in px) is on the 4px grid.
 */
export function isOnSpacingGrid(px: number): boolean {
  return APPROVED_SPACING_PX.includes(px);
}

/**
 * Find the nearest approved spacing value for a given px value.
 */
export function nearestSpacingToken(px: number): number {
  let nearest = APPROVED_SPACING_PX[0];
  let minDiff = Math.abs(px - nearest);
  for (const approved of APPROVED_SPACING_PX) {
    const diff = Math.abs(px - approved);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = approved;
    }
  }
  return nearest;
}

/**
 * Scan source code string for hardcoded hex color values not in the approved set.
 * Returns violations found.
 */
export function scanForHardcodedColors(
  source: string,
  filePath?: string,
): DesignViolation[] {
  const violations: DesignViolation[] = [];
  const hexPattern = /#[0-9A-Fa-f]{3,8}\b/g;
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments and import lines
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.includes('import ')) continue;
    // Skip design token definition files
    if (filePath && (filePath.includes('design-system/tokens') || filePath.includes('tailwind.config'))) continue;

    let match: RegExpExecArray | null;
    hexPattern.lastIndex = 0;
    while ((match = hexPattern.exec(line)) !== null) {
      const hex = match[0].toLowerCase();
      if (!APPROVED_HEX_COLORS.has(hex)) {
        violations.push({
          type: 'color',
          severity: 'error',
          rule: 'COLOR-001',
          message: `Hardcoded color "${match[0]}" is not an approved design token.`,
          file: filePath,
          line: i + 1,
          suggestion: `Use a design token from @/lib/design-system instead.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Scan source code for hardcoded spacing values (px values not on the 4px grid).
 */
export function scanForHardcodedSpacing(
  source: string,
  filePath?: string,
): DesignViolation[] {
  const violations: DesignViolation[] = [];
  // Match px values in style contexts: padding, margin, gap, etc.
  const pxPattern = /(?:padding|margin|gap|top|right|bottom|left|width|height|border-radius)\s*[:=]\s*['"]?(\d+)px/gi;
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
    if (filePath && filePath.includes('design-system/tokens')) continue;

    let match: RegExpExecArray | null;
    pxPattern.lastIndex = 0;
    while ((match = pxPattern.exec(line)) !== null) {
      const px = parseInt(match[1], 10);
      if (!isOnSpacingGrid(px) && px > 0) {
        violations.push({
          type: 'spacing',
          severity: 'warning',
          rule: 'SPACING-001',
          message: `Spacing value "${px}px" is not on the 4px grid.`,
          file: filePath,
          line: i + 1,
          suggestion: `Use ${nearestSpacingToken(px)}px (spacing token) instead.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Scan source code for manual currency/percentage formatting instead of using design system utilities.
 */
export function scanForManualFormatting(
  source: string,
  filePath?: string,
): DesignViolation[] {
  const violations: DesignViolation[] = [];
  const lines = source.split('\n');

  // Skip formatter definition files
  if (filePath && filePath.includes('design-system/utils/formatters')) return violations;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;

    // Detect manual currency formatting: `$${...}` or `.toFixed(2)` near dollar signs
    if (/\$\$\{.*\.toFixed\(/.test(line) && !line.includes('formatCurrency') && !line.includes('formatLargeDollar')) {
      violations.push({
        type: 'formatting',
        severity: 'warning',
        rule: 'FMT-001',
        message: 'Manual currency formatting detected. Use formatCurrency() or formatLargeDollar() instead.',
        file: filePath,
        line: i + 1,
        suggestion: 'Import { formatCurrency } from "@/lib/design-system"',
      });
    }

    // Detect manual percentage formatting
    if (/\* 100.*%/.test(line) && !line.includes('formatPercent') && !line.includes('formatPercentValue')) {
      // Only flag if it looks like display code, not calculation code
      if (line.includes('return') || line.includes('text') || line.includes('label') || line.includes('`')) {
        violations.push({
          type: 'formatting',
          severity: 'warning',
          rule: 'FMT-002',
          message: 'Manual percentage formatting detected. Use formatPercent() instead.',
          file: filePath,
          line: i + 1,
          suggestion: 'Import { formatPercent } from "@/lib/design-system"',
        });
      }
    }
  }

  return violations;
}

/**
 * Calculate WCAG 2.0 relative luminance from a hex color.
 */
export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const [rr, gg, bb] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

/**
 * Calculate WCAG contrast ratio between two hex colors.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color pair meets WCAG AA contrast requirements.
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = contrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Run a full design validation scan on a source string.
 */
export function validateSource(source: string, filePath?: string): DesignValidationReport {
  const violations: DesignViolation[] = [
    ...scanForHardcodedColors(source, filePath),
    ...scanForHardcodedSpacing(source, filePath),
    ...scanForManualFormatting(source, filePath),
  ];

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const totalChecks = violations.length + 1; // +1 to avoid divide-by-zero
  const score = Math.max(0, 100 - (errorCount * 10) - (violations.length * 2));

  return {
    status: errorCount === 0 ? 'pass' : 'fail',
    score,
    totalChecks,
    violations,
    checkedAt: new Date(),
  };
}

/**
 * Generate a human-readable summary of a design validation report.
 */
export function formatValidationReport(report: DesignValidationReport): string {
  const lines: string[] = [
    `Design Validation Report — ${report.status.toUpperCase()} (Score: ${report.score}/100)`,
    `Checked at: ${report.checkedAt.toISOString()}`,
    `Total violations: ${report.violations.length}`,
    '',
  ];

  if (report.violations.length === 0) {
    lines.push('No violations found. Design system compliance is perfect.');
  } else {
    const byType = new Map<string, DesignViolation[]>();
    for (const v of report.violations) {
      const existing = byType.get(v.type) ?? [];
      existing.push(v);
      byType.set(v.type, existing);
    }

    for (const [type, violations] of byType) {
      lines.push(`[${type.toUpperCase()}] ${violations.length} violation(s):`);
      for (const v of violations.slice(0, 5)) {
        const location = v.file ? `${v.file}${v.line ? `:${v.line}` : ''}` : 'unknown';
        lines.push(`  ${v.severity === 'error' ? 'ERR' : 'WRN'} ${v.rule}: ${v.message} (${location})`);
        if (v.suggestion) lines.push(`      Fix: ${v.suggestion}`);
      }
      if (violations.length > 5) {
        lines.push(`  ... and ${violations.length - 5} more`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
