// FP-Sentinel — Design System Validator
// Pure validation functions for checking design token compliance.
// These functions analyze component markup/styles for violations.

import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { borderRadius } from '../tokens/spacing';
import { chartConfig } from '../tokens/chart-config';

// ── Types ──

export type ViolationSeverity = 'error' | 'warning' | 'info';

export type ViolationCategory =
  | 'hardcoded_color'
  | 'hardcoded_spacing'
  | 'missing_focus_style'
  | 'insufficient_contrast'
  | 'missing_tabular_nums'
  | 'chart_below_min_height'
  | 'raw_error_exposed'
  | 'missing_skeleton'
  | 'non_token_font_size';

export interface DesignViolation {
  category: ViolationCategory;
  severity: ViolationSeverity;
  message: string;
  file?: string;
  line?: number;
  element?: string;
  suggestedFix?: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  violations: DesignViolation[];
  checkedRules: number;
  timestamp: Date;
}

// ── Helpers ──

/**
 * Convert a hex color string to its RGB components.
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 * Returns null if the input is not a valid hex color.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, '');

  let r: number;
  let g: number;
  let b: number;

  if (cleaned.length === 3) {
    // #RGB -> expand each digit
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6 || cleaned.length === 8) {
    // #RRGGBB or #RRGGBBAA (ignore alpha)
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

/**
 * Calculate WCAG 2.0 relative luminance from linear RGB values (0-255).
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where each channel is linearized from its sRGB value.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rLinear, gLinear, bLinear] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// ── Token Extraction ──

/** Cache for the set of all token colors — computed once on first access. */
let _tokenColorsCache: Set<string> | null = null;

/**
 * Recursively walk an object and extract all string values that look like
 * hex colors (#RGB, #RRGGBB, #RRGGBBAA). Returns a Set of lowercase hex values.
 */
export function getAllTokenColors(): Set<string> {
  if (_tokenColorsCache) {
    return _tokenColorsCache;
  }

  const result = new Set<string>();

  function walk(obj: unknown): void {
    if (typeof obj === 'string') {
      if (/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(obj)) {
        result.add(obj.toLowerCase());
      }
      return;
    }
    if (typeof obj === 'object' && obj !== null) {
      // Handle arrays
      if (Array.isArray(obj)) {
        for (const item of obj) {
          walk(item);
        }
        return;
      }
      // Handle plain objects
      for (const value of Object.values(obj)) {
        walk(value);
      }
    }
  }

  walk(colors);
  _tokenColorsCache = result;
  return result;
}

/**
 * Check if a given hex color is a recognized design token color.
 */
export function isTokenColor(hex: string): boolean {
  return getAllTokenColors().has(hex.toLowerCase());
}

// ── Validators ──

/**
 * Scan a source string for hex color patterns (#xxx, #xxxxxx, #xxxxxxxx)
 * that are NOT in the design token set. Returns violations with line numbers.
 *
 * Skips files whose name contains "tokens" or "design-system" to avoid
 * flagging token definition files themselves.
 */
export function findHardcodedColors(
  source: string,
  fileName?: string,
): DesignViolation[] {
  // Skip token/design-system definition files
  if (fileName && (/tokens/i.test(fileName) || /design-system/i.test(fileName))) {
    return [];
  }

  const violations: DesignViolation[] = [];
  const tokenColors = getAllTokenColors();
  const hexPattern = /#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?(?:[0-9A-Fa-f]{2})?\b/g;
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment lines
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) {
      continue;
    }

    let match: RegExpExecArray | null;
    hexPattern.lastIndex = 0;
    while ((match = hexPattern.exec(line)) !== null) {
      const hex = match[0].toLowerCase();
      if (!tokenColors.has(hex)) {
        violations.push({
          category: 'hardcoded_color',
          severity: 'error',
          message: `Hardcoded color "${match[0]}" is not a design token. Use a token from @/lib/design-system/tokens/colors instead.`,
          file: fileName,
          line: i + 1,
          element: match[0],
          suggestedFix: `Replace "${match[0]}" with the appropriate colors.* token reference.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Approved spacing scale values (in px).
 */
const SPACING_SCALE: ReadonlySet<number> = new Set([
  4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96,
]);

/**
 * Find the nearest value on the spacing scale for a suggestion.
 */
function nearestSpacingValue(px: number): number {
  const scale = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
  let nearest = scale[0];
  let minDiff = Math.abs(px - nearest);
  for (const v of scale) {
    const diff = Math.abs(px - v);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = v;
    }
  }
  return nearest;
}

/**
 * Scan for hardcoded pixel values in style-related properties that don't
 * match the spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96).
 *
 * Detects:
 * - CSS-in-JS patterns like `padding: '17px'` or `margin: 13`
 * - Tailwind arbitrary value patterns like `p-[17px]`, `mx-[13px]`
 */
export function findHardcodedSpacingValues(
  source: string,
  fileName?: string,
): DesignViolation[] {
  // Skip token definition files
  if (fileName && (/tokens/i.test(fileName) || /design-system/i.test(fileName))) {
    return [];
  }

  const violations: DesignViolation[] = [];
  const lines = source.split('\n');

  // CSS/JS style property patterns: padding: '17px', margin: 13px, gap: "5px"
  const cssPropertyPattern =
    /(?:padding|margin|gap|top|right|bottom|left|paddingTop|paddingRight|paddingBottom|paddingLeft|marginTop|marginRight|marginBottom|marginLeft|paddingInline|paddingBlock|marginInline|marginBlock)\s*[:=]\s*['"]?(\d+)px/gi;

  // Tailwind arbitrary spacing patterns: p-[17px], mx-[13px], gap-[5px], etc.
  const tailwindPattern =
    /(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|inset|top|right|bottom|left)-\[(\d+)px\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) {
      continue;
    }

    let match: RegExpExecArray | null;

    // Check CSS/JS property patterns
    cssPropertyPattern.lastIndex = 0;
    while ((match = cssPropertyPattern.exec(line)) !== null) {
      const px = parseInt(match[1], 10);
      if (px > 0 && !SPACING_SCALE.has(px)) {
        violations.push({
          category: 'hardcoded_spacing',
          severity: 'warning',
          message: `Spacing value "${px}px" is not on the design system spacing scale.`,
          file: fileName,
          line: i + 1,
          element: match[0],
          suggestedFix: `Use ${nearestSpacingValue(px)}px (nearest spacing token) instead of ${px}px.`,
        });
      }
    }

    // Check Tailwind arbitrary value patterns
    tailwindPattern.lastIndex = 0;
    while ((match = tailwindPattern.exec(line)) !== null) {
      const px = parseInt(match[1], 10);
      if (px > 0 && !SPACING_SCALE.has(px)) {
        violations.push({
          category: 'hardcoded_spacing',
          severity: 'warning',
          message: `Tailwind arbitrary spacing "${match[0]}" uses a non-token value (${px}px).`,
          file: fileName,
          line: i + 1,
          element: match[0],
          suggestedFix: `Use ${nearestSpacingValue(px)}px (nearest spacing token) instead of ${px}px.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Calculate the WCAG 2.0 contrast ratio between two hex colors.
 *
 * - AA requires >= 4.5:1 for normal text
 * - AAA requires >= 7:1 for normal text
 */
export function validateContrastRatio(
  foreground: string,
  background: string,
): { ratio: number; passesAA: boolean; passesAAA: boolean } {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    return { ratio: 0, passesAA: false, passesAAA: false };
  }

  const fgLum = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100, // round to 2 decimals
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
  };
}

/**
 * Scan for elements displaying currency or percentage values that lack
 * `tabular-nums` or `font-variant-numeric` in their vicinity.
 *
 * Looks for: formatCurrency, formatPercent, dollar signs in template literals,
 * and percentage patterns near numeric output.
 */
export function findMissingTabularNums(source: string): DesignViolation[] {
  const violations: DesignViolation[] = [];
  const lines = source.split('\n');

  // Patterns that indicate financial/numeric display
  const financialPatterns = [
    /formatCurrency/,
    /formatPercent/,
    /\$\{.*?\}/,       // template literal with dollar sign interpolation
    /\$\d/,            // literal dollar amount like $100
    /\d+(\.\d+)?%/,    // percentage values like 12.5%
  ];

  // Patterns that indicate tabular-nums is already applied
  const tabularNumsPatterns = [
    /tabular-nums/,
    /font-variant-numeric/,
    /fontVariantNumeric/,
    /fontFeatureSettings.*tnum/,
    /font-feature-settings.*tnum/,
    /financialNumber/,
    /mono/i, // monospace font typically includes tabular figures
  ];

  // Scan with a sliding window: check ~10 lines of surrounding context
  const CONTEXT_WINDOW = 10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and imports
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.trimStart().startsWith('import ')) {
      continue;
    }

    const hasFinancialPattern = financialPatterns.some((p) => p.test(line));
    if (!hasFinancialPattern) {
      continue;
    }

    // Look for tabular-nums in surrounding context
    const contextStart = Math.max(0, i - CONTEXT_WINDOW);
    const contextEnd = Math.min(lines.length, i + CONTEXT_WINDOW + 1);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    const hasTabularNums = tabularNumsPatterns.some((p) => p.test(context));

    if (!hasTabularNums) {
      violations.push({
        category: 'missing_tabular_nums',
        severity: 'warning',
        message: `Financial/numeric display on line ${i + 1} may lack tabular-nums styling. Columns of numbers will not align properly.`,
        line: i + 1,
        element: line.trim().slice(0, 80),
        suggestedFix:
          'Add font-variant-numeric: tabular-nums (or use the financialNumber token from componentStandards).',
      });
    }
  }

  return violations;
}

/**
 * Check that a chart height meets the 200px minimum defined in component standards.
 * Returns a violation if the height is below the minimum, or null if compliant.
 */
export function validateChartMinHeight(heightValue: number): DesignViolation | null {
  const MIN_CHART_HEIGHT = 200;

  if (heightValue < MIN_CHART_HEIGHT) {
    return {
      category: 'chart_below_min_height',
      severity: 'error',
      message: `Chart height ${heightValue}px is below the minimum of ${MIN_CHART_HEIGHT}px.`,
      suggestedFix: `Set the chart height to at least ${MIN_CHART_HEIGHT}px per the design system chart standards.`,
    };
  }

  return null;
}

/**
 * Scan for patterns that expose raw error messages to users.
 * Detects: TypeError, Cannot read, undefined is not, Error:, and
 * common exception class names rendered in UI-facing code.
 */
export function findRawErrorMessages(source: string): DesignViolation[] {
  const violations: DesignViolation[] = [];
  const lines = source.split('\n');

  // Patterns indicating raw error messages being shown to users
  const rawErrorPatterns: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /TypeError/, description: 'TypeError reference' },
    { pattern: /Cannot read propert/, description: '"Cannot read property" error text' },
    { pattern: /undefined is not/, description: '"undefined is not" error text' },
    { pattern: /ReferenceError/, description: 'ReferenceError reference' },
    { pattern: /SyntaxError/, description: 'SyntaxError reference' },
    { pattern: /RangeError/, description: 'RangeError reference' },
    { pattern: /NetworkError/, description: 'NetworkError reference' },
    { pattern: /Error:\s/, description: 'Generic "Error:" prefix' },
  ];

  // Context patterns that suggest the error is being displayed in UI
  const uiContextPatterns = [
    /return\s/,
    /render/,
    /jsx/i,
    /tsx/i,
    /className/,
    /dangerouslySetInnerHTML/,
    /textContent/,
    /innerHTML/,
    /message\s*[=:]/,
    /title\s*[=:]/,
    /label\s*[=:]/,
    /text\s*[=:]/,
    /\{.*error.*\.message/,
    /\{.*err.*\.message/,
    />`.*Error/,
    />\s*\{/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments, imports, and catch blocks (where errors are properly handled)
    if (
      line.trimStart().startsWith('//') ||
      line.trimStart().startsWith('*') ||
      line.trimStart().startsWith('import ') ||
      line.trimStart().startsWith('console.')
    ) {
      continue;
    }

    for (const { pattern, description } of rawErrorPatterns) {
      if (pattern.test(line)) {
        // Check nearby lines for UI context to reduce false positives
        const contextStart = Math.max(0, i - 3);
        const contextEnd = Math.min(lines.length, i + 4);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        const isInUIContext = uiContextPatterns.some((p) => p.test(context));

        if (isInUIContext) {
          violations.push({
            category: 'raw_error_exposed',
            severity: 'error',
            message: `Possible raw error message exposed to users: ${description} detected in UI context.`,
            line: i + 1,
            element: line.trim().slice(0, 80),
            suggestedFix:
              'Use a user-friendly error message instead. Display "Something went wrong" or a contextual message, and log the raw error for debugging.',
          });
          break; // Only one violation per line
        }
      }
    }
  }

  return violations;
}

/**
 * Run all validators across the provided source files, aggregate violations,
 * and compute a compliance score.
 *
 * Scoring: starts at 100, then -5 per error, -2 per warning, -1 per info.
 * Score is clamped to [0, 100].
 */
export function runFullValidation(
  sources: Array<{ content: string; fileName: string }>,
): ValidationResult {
  const allViolations: DesignViolation[] = [];
  let checkedRules = 0;

  for (const { content, fileName } of sources) {
    // Color check
    const colorViolations = findHardcodedColors(content, fileName);
    allViolations.push(...colorViolations);
    checkedRules++;

    // Spacing check
    const spacingViolations = findHardcodedSpacingValues(content, fileName);
    allViolations.push(...spacingViolations);
    checkedRules++;

    // Tabular nums check
    const tabularNumsViolations = findMissingTabularNums(content);
    // Attach file name to violations
    for (const v of tabularNumsViolations) {
      v.file = fileName;
    }
    allViolations.push(...tabularNumsViolations);
    checkedRules++;

    // Raw error messages check
    const rawErrorViolations = findRawErrorMessages(content);
    // Attach file name to violations
    for (const v of rawErrorViolations) {
      v.file = fileName;
    }
    allViolations.push(...rawErrorViolations);
    checkedRules++;
  }

  // Compute score
  let score = 100;
  for (const v of allViolations) {
    switch (v.severity) {
      case 'error':
        score -= 5;
        break;
      case 'warning':
        score -= 2;
        break;
      case 'info':
        score -= 1;
        break;
    }
  }
  score = Math.max(0, Math.min(100, score));

  return {
    passed: allViolations.filter((v) => v.severity === 'error').length === 0,
    score,
    violations: allViolations,
    checkedRules,
    timestamp: new Date(),
  };
}
