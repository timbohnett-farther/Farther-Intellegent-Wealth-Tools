// =============================================================================
// UPL Filter — Unauthorized Practice of Law Prevention
// =============================================================================
//
// Scans all agent output and report text for UPL violations before showing
// to clients. Pattern-based detection prevents legal advice language from
// appearing in deliverables. All flagged text must be sanitized or removed.
//
// =============================================================================

import type { UPLCheckResult } from './types';

// ── Prohibited Patterns ──────────────────────────────────────────────────────

export const UPL_PROHIBITED_PATTERNS = [
  // Direct legal advice
  {
    pattern: /\b(you (need|must|should) (create|draft|amend|execute|establish|form|set up|update|revise))\b/gi,
    replacement: 'Consider discussing with your attorney whether to $3',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(this (trust|will|document) is (defective|invalid|unenforceable|improperly executed))\b/gi,
    replacement: 'This $2 may benefit from legal review to assess $3',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(we (advise|recommend|counsel) you to)\b/gi,
    replacement: 'You may wish to discuss with your attorney whether to',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(our legal (advice|opinion) is)\b/gi,
    replacement: 'From a planning perspective, it may be worth exploring',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(in our legal judgment)\b/gi,
    replacement: 'From a financial planning standpoint',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(this constitutes a violation of)\b/gi,
    replacement: 'This may be inconsistent with',
    severity: 'HIGH' as const,
  },

  // Prescriptive instructions
  {
    pattern: /\b(you are required to)\b/gi,
    replacement: 'It may be important to consider',
    severity: 'MEDIUM' as const,
  },
  {
    pattern: /\b(the (law|statute|regulation|code) (requires|mandates|demands))\b/gi,
    replacement: 'The $2 generally provides for',
    severity: 'MEDIUM' as const,
  },
  {
    pattern: /\b(failure to comply will result in)\b/gi,
    replacement: 'Not addressing this may lead to',
    severity: 'MEDIUM' as const,
  },

  // Legal conclusions
  {
    pattern: /\b(this (is|constitutes) (legal|unlawful|prohibited|invalid))\b/gi,
    replacement: 'This may have legal implications that warrant review',
    severity: 'MEDIUM' as const,
  },
  {
    pattern: /\b(you have a legal obligation to)\b/gi,
    replacement: 'It may be advisable to',
    severity: 'MEDIUM' as const,
  },

  // Attorney-client relationship language
  {
    pattern: /\b(as your (attorney|counsel|legal advisor))\b/gi,
    replacement: 'As your financial advisor',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(we represent (you|your interests) in)\b/gi,
    replacement: 'We provide financial planning services regarding',
    severity: 'HIGH' as const,
  },

  // Drafting language
  {
    pattern: /\b(we (will|shall) draft (a|an|the|your))\b/gi,
    replacement: 'An attorney can draft the',
    severity: 'HIGH' as const,
  },
  {
    pattern: /\b(we recommend the following language:)\b/gi,
    replacement: 'You may wish to discuss with your attorney whether language such as the following would be appropriate:',
    severity: 'MEDIUM' as const,
  },
];

// ── UPL Check ────────────────────────────────────────────────────────────────

/**
 * Scans text for UPL violations. Returns list of flagged patterns.
 */
export function checkUPL(text: string): UPLCheckResult {
  const flaggedPatterns: UPLCheckResult['flagged_patterns'] = [];

  for (const { pattern, severity } of UPL_PROHIBITED_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));

    for (const match of matches) {
      flaggedPatterns.push({
        pattern: pattern.source,
        match: match[0],
        severity,
      });
    }
  }

  return {
    passed: flaggedPatterns.length === 0,
    flagged_patterns: flaggedPatterns,
  };
}

// ── Sanitization ─────────────────────────────────────────────────────────────

/**
 * Replaces UPL patterns with compliant alternatives.
 * Returns sanitized text safe for client delivery.
 */
export function sanitizeForClient(text: string): string {
  let sanitized = text;

  for (const { pattern, replacement } of UPL_PROHIBITED_PATTERNS) {
    sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), replacement);
  }

  return sanitized;
}

// ── Bulk Sanitization Helper ─────────────────────────────────────────────────

/**
 * Sanitizes an array of strings (e.g., all findings in a report).
 */
export function sanitizeStrings(strings: string[]): string[] {
  return strings.map(sanitizeForClient);
}

// ── Check Before Output ──────────────────────────────────────────────────────

/**
 * Throws an error if text contains UPL violations.
 * Use before finalizing client-facing reports.
 */
export function assertNoUPL(text: string, context: string): void {
  const result = checkUPL(text);

  if (!result.passed) {
    const violations = result.flagged_patterns
      .map((f) => `"${f.match}" (${f.severity})`)
      .join(', ');

    throw new Error(
      `[UPL Filter] Violations detected in ${context}: ${violations}. Text must be sanitized before client delivery.`
    );
  }
}
