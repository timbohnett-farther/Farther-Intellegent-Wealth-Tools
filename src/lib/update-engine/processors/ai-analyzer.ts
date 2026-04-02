// =============================================================================
// Update Engine — AI Analyzer
// =============================================================================
//
// Provides AI-assisted analysis of tax table changes. Template-based stubs
// for synchronous use, with async AI-enhanced versions via the AI gateway.
// =============================================================================

import type { ChangeItem, TaxTableType } from '../types';
import { callAI, extractJSON, isAIAvailable } from '../../ai/gateway';

// ==================== Interfaces ====================

/**
 * Structured result of AI analysis of a tax table change.
 */
export interface AIAnalysisResult {
  /** Human-readable summary of the change and its implications. */
  summary: string;
  /** Legal citation (e.g. IRC section, Rev. Proc. number). */
  legalCitation: string;
  /** When the change takes effect (ISO-8601). */
  effectiveDate: string;
  /** Specific tax code provisions affected by this change. */
  affectedProvisions: string[];
  /** Recommended action for advisors. */
  recommendedAction: string;
  /** Confidence score from the AI model (0-1). */
  confidence: number;
}

/**
 * Classification result from AI-based change categorization.
 */
interface ChangeTypeClassification {
  /** The classified type. */
  type: 'numeric_adjustment' | 'law_change' | 'new_provision' | 'pending_legislation';
  /** Confidence in the classification (0-1). */
  confidence: number;
  /** Reasoning for the classification. */
  reasoning: string;
}

// ==================== AI Analysis (Template Stubs) ====================

/**
 * Analyzes a tax change using AI to generate a structured summary.
 *
 * PRODUCTION NOTE: This function would call the OpenAI GPT-4o API with:
 *   - System prompt: "You are a tax law expert analyzing changes to US tax tables..."
 *   - User prompt: JSON-serialized ChangeItem
 *   - Response format: Structured JSON matching AIAnalysisResult
 *   - Temperature: 0.2 (for consistent, factual output)
 *
 * @param change - The change item to analyze.
 * @returns A structured AI analysis result.
 */
export function analyzeChangeWithAI(change: ChangeItem): AIAnalysisResult {
  // Template-based stub — generates realistic output without an API call
  const tableType: TaxTableType = change.tableType;
  const effectiveDateStr = change.effectiveDate;

  const legalCitation = deriveLegalCitation(tableType, change);
  const affectedProvisions = deriveAffectedProvisions(tableType);
  const recommendedAction = deriveRecommendedAction(change);

  const summary = buildAnalysisSummary(change, legalCitation, effectiveDateStr);

  return {
    summary,
    legalCitation,
    effectiveDate: effectiveDateStr,
    affectedProvisions,
    recommendedAction,
    confidence: change.type === 'numeric_adjustment' ? 0.95 : 0.82,
  };
}

/**
 * Generates a quarterly bulletin summarizing all changes detected
 * in the quarter. Uses AI to create a cohesive narrative.
 *
 * PRODUCTION NOTE: This function would call GPT-4o with:
 *   - System prompt: "Generate an advisor-facing quarterly tax update bulletin..."
 *   - User prompt: JSON array of all ChangeItems
 *   - Temperature: 0.4 (slightly more creative for narrative)
 *
 * @param changes - All changes detected in the quarter.
 * @returns A formatted bulletin string.
 */
export function generateQuarterlyBulletin(changes: ChangeItem[]): string {
  if (changes.length === 0) {
    return 'No tax table changes detected this quarter. All tables remain current.';
  }

  const sections: string[] = [];
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();

  sections.push(`QUARTERLY TAX UPDATE — Q${quarter} ${year}`);
  sections.push('='.repeat(50));
  sections.push('');

  // Group changes by type
  const byType = groupBy(changes, (c) => c.type);

  // Numeric adjustments (inflation)
  const adjustments = byType.get('numeric_adjustment') ?? [];
  if (adjustments.length > 0) {
    sections.push('INFLATION ADJUSTMENTS');
    sections.push('-'.repeat(30));
    for (const change of adjustments) {
      sections.push(`  * ${change.description}`);
      sections.push(`    Source: ${change.source} | Effective: ${change.effectiveDate}`);
    }
    sections.push('');
  }

  // Law changes
  const lawChanges = byType.get('law_change') ?? [];
  if (lawChanges.length > 0) {
    sections.push('LAW CHANGES');
    sections.push('-'.repeat(30));
    for (const change of lawChanges) {
      sections.push(`  * ${change.description}`);
      sections.push(`    Severity: ${change.severity.toUpperCase()} | Effective: ${change.effectiveDate}`);
    }
    sections.push('');
  }

  // New provisions
  const newProvisions = byType.get('new_provision') ?? [];
  if (newProvisions.length > 0) {
    sections.push('NEW PROVISIONS');
    sections.push('-'.repeat(30));
    for (const change of newProvisions) {
      sections.push(`  * ${change.description}`);
    }
    sections.push('');
  }

  // Pending legislation
  const pending = byType.get('pending_legislation') ?? [];
  if (pending.length > 0) {
    sections.push('PENDING LEGISLATION (monitoring)');
    sections.push('-'.repeat(30));
    for (const change of pending) {
      const billInfo = change.billNumber ? ` [${change.billNumber}]` : '';
      sections.push(`  * ${change.description}${billInfo}`);
      if (change.billStatus) {
        sections.push(`    Status: ${change.billStatus}`);
      }
    }
    sections.push('');
  }

  // Summary
  sections.push('SUMMARY');
  sections.push('-'.repeat(30));
  sections.push(`Total changes detected: ${changes.length}`);
  sections.push(`  - Inflation adjustments: ${adjustments.length}`);
  sections.push(`  - Law changes: ${lawChanges.length}`);
  sections.push(`  - New provisions: ${newProvisions.length}`);
  sections.push(`  - Pending legislation: ${pending.length}`);

  const autoApproved = changes.filter((c) => c.autoApprovable).length;
  const humanReview = changes.length - autoApproved;
  sections.push(`  - Auto-approved: ${autoApproved}`);
  sections.push(`  - Requiring human review: ${humanReview}`);

  return sections.join('\n');
}

/**
 * Classifies a change description into one of the standard change types
 * using AI-based text classification.
 *
 * PRODUCTION NOTE: This function would call GPT-4o with:
 *   - System prompt: "Classify the following tax change description..."
 *   - Temperature: 0.1 (very consistent classification)
 *
 * @param description - The change description to classify.
 * @returns A classification result with type, confidence, and reasoning.
 */
export function classifyChangeType(description: string): ChangeTypeClassification {
  const lowerDesc = description.toLowerCase();

  // Template-based classification using keyword matching
  // In production, GPT-4o would provide more nuanced classification

  if (lowerDesc.includes('bill') || lowerDesc.includes('proposed') ||
      lowerDesc.includes('legislation') || lowerDesc.includes('introduced')) {
    return {
      type: 'pending_legislation',
      confidence: 0.88,
      reasoning: 'Description references proposed or pending legislative action.',
    };
  }

  if (lowerDesc.includes('enacted') || lowerDesc.includes('signed into law') ||
      lowerDesc.includes('repealed') || lowerDesc.includes('new law')) {
    return {
      type: 'law_change',
      confidence: 0.92,
      reasoning: 'Description references enacted legislation or law change.',
    };
  }

  if (lowerDesc.includes('new provision') || lowerDesc.includes('new section') ||
      lowerDesc.includes('added provision') || lowerDesc.includes('new credit')) {
    return {
      type: 'new_provision',
      confidence: 0.85,
      reasoning: 'Description references a newly added tax code provision.',
    };
  }

  // Default to numeric adjustment for inflation and threshold changes
  return {
    type: 'numeric_adjustment',
    confidence: 0.90,
    reasoning: 'Description appears to reference a numeric or inflation-based adjustment.',
  };
}

// ==================== Internal Helpers ====================

/**
 * Derives a legal citation based on the table type and change details.
 */
function deriveLegalCitation(tableType: TaxTableType, change: ChangeItem): string {
  const citations: Record<string, string> = {
    ordinary_income_brackets: 'IRC Section 1; Rev. Proc. (annual)',
    capital_gains_brackets: 'IRC Section 1(h)',
    amt_exemptions: 'IRC Section 55-59',
    contribution_limits_401k: 'IRC Section 402(g)',
    contribution_limits_ira: 'IRC Sections 408(a), 219(b)',
    contribution_limits_hsa: 'IRC Section 223',
    rmd_tables: 'IRC Section 401(a)(9); Treas. Reg. 1.401(a)(9)-9',
    irmaa_part_b: '42 CFR Part 407; SSA IRMAA determination',
    irmaa_part_d: '42 CFR Part 423; SSA IRMAA determination',
    estate_exemption: 'IRC Section 2010(c); Rev. Proc. (annual)',
    gift_exemption: 'IRC Section 2503(b)',
    afr_rates: 'IRC Section 7520; Rev. Rul. (monthly)',
    ss_cola: '42 USC 415; SSA COLA determination',
    ss_wage_base: '42 USC 430; SSA wage base determination',
    ss_bend_points: '42 USC 415(a); SSA PIA formula',
    standard_deductions: 'IRC Section 63(c)',
    state_income_tax: 'State revenue code (varies by jurisdiction)',
  };

  const baseCitation = citations[tableType] ?? `IRC (${tableType})`;

  if (change.billNumber) {
    return `${baseCitation}; ${change.billNumber}`;
  }

  return baseCitation;
}

/**
 * Derives affected tax code provisions based on table type.
 */
function deriveAffectedProvisions(tableType: TaxTableType): string[] {
  const provisionMap: Record<string, string[]> = {
    ordinary_income_brackets: ['Ordinary income tax rates', 'Tax bracket thresholds', 'Filing status adjustments'],
    capital_gains_brackets: ['Long-term capital gains rates', 'Net investment income thresholds'],
    amt_exemptions: ['AMT exemption amounts', 'AMT phase-out thresholds'],
    contribution_limits_401k: ['401(k) elective deferrals', 'Catch-up contributions', 'Employer match limits'],
    contribution_limits_ira: ['IRA contribution limits', 'Roth IRA income phase-outs'],
    contribution_limits_hsa: ['HSA contribution limits', 'HSA catch-up contributions'],
    rmd_tables: ['Required minimum distribution factors', 'Uniform lifetime table', 'Joint life expectancy table'],
    irmaa_part_b: ['Part B premium surcharges', 'MAGI thresholds for Part B'],
    irmaa_part_d: ['Part D premium surcharges', 'MAGI thresholds for Part D'],
    estate_exemption: ['Unified credit amount', 'Estate tax exemption', 'Portability provisions'],
    gift_exemption: ['Annual exclusion amount', 'Lifetime exemption'],
    afr_rates: ['Short-term AFR', 'Mid-term AFR', 'Long-term AFR', 'Section 7520 rate'],
    ss_cola: ['COLA adjustment', 'Benefit increase percentage'],
    ss_wage_base: ['Maximum taxable earnings', 'FICA tax ceiling'],
    ss_bend_points: ['First bend point', 'Second bend point', 'PIA formula factors'],
    standard_deductions: ['Standard deduction amounts', 'Additional deduction for elderly/blind'],
    state_income_tax: ['State income tax rates', 'State-specific deductions'],
  };

  return provisionMap[tableType] ?? [`${tableType} provisions`];
}

/**
 * Derives a recommended action based on the change type and severity.
 */
function deriveRecommendedAction(change: ChangeItem): string {
  switch (change.type) {
    case 'numeric_adjustment':
      return 'Update tax tables and recalculate affected financial plans. Notify advisors of inflation-adjusted values.';
    case 'law_change':
      return 'Conduct thorough review of all affected provisions. Update planning strategies and notify all advisors immediately.';
    case 'new_provision':
      return 'Evaluate applicability to client base. Update planning engine to incorporate new provision. Brief advisor team.';
    case 'pending_legislation':
      return 'Monitor legislative progress. Prepare scenario analysis for potential impact. No immediate action required.';
    default:
      return 'Review change and determine appropriate action.';
  }
}

/**
 * Builds a narrative summary for an AI analysis result.
 */
function buildAnalysisSummary(
  change: ChangeItem,
  legalCitation: string,
  effectiveDate: string
): string {
  const typeLabel: Record<string, string> = {
    numeric_adjustment: 'Annual Inflation Adjustment',
    law_change: 'Legislative Change',
    new_provision: 'New Tax Provision',
    pending_legislation: 'Pending Legislation',
  };

  const label = typeLabel[change.type] ?? 'Tax Change';

  return (
    `[${label}] ${change.description}\n\n` +
    `Affected table: ${change.tableType}\n` +
    `Legal basis: ${legalCitation}\n` +
    `Effective date: ${effectiveDate}\n` +
    `Severity: ${change.severity}\n` +
    `Auto-approvable: ${change.autoApprovable ? 'Yes' : 'No — requires human review'}\n\n` +
    `This change has been detected from ${change.source} and ` +
    (change.autoApprovable
      ? 'can be automatically applied after validation.'
      : 'requires manual review before publication.')
  );
}

/**
 * Groups an array by a key function.
 */
function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

// ==================== AI-ENHANCED ANALYSIS ====================

const ANALYZER_SYSTEM_PROMPT = `You are a tax law expert analyzing changes to US tax tables for a wealth management platform called "Farther Prism."

Your analysis must:
1. Identify the specific IRC section, Rev. Proc., or regulation affected
2. Explain the change in clear, advisor-facing language
3. List all affected tax code provisions
4. Provide a concrete recommended action for financial advisors
5. Assess confidence in the analysis (0-1)

Return ONLY a valid JSON object:
{
  "summary": "Detailed analysis of the change and its implications",
  "legalCitation": "IRC Section / Rev. Proc. / regulation citation",
  "effectiveDate": "YYYY-MM-DD",
  "affectedProvisions": ["provision 1", "provision 2"],
  "recommendedAction": "What advisors should do",
  "confidence": 0.0 to 1.0
}`;

/**
 * AI-enhanced tax change analysis.
 * Falls back to the template-based `analyzeChangeWithAI()` on any error.
 */
export async function analyzeChangeWithAIEnhanced(
  change: ChangeItem,
): Promise<AIAnalysisResult> {
  if (!isAIAvailable()) {
    return analyzeChangeWithAI(change);
  }

  try {
    const userPrompt = `Analyze this tax table change:

Type: ${change.type}
Table: ${change.tableType}
Source: ${change.source}
Effective Date: ${change.effectiveDate}
Description: ${change.description}
Severity: ${change.severity}
Auto-approvable: ${change.autoApprovable}
${change.billNumber ? `Bill Number: ${change.billNumber}` : ''}
${change.billStatus ? `Bill Status: ${change.billStatus}` : ''}

New Data: ${JSON.stringify(change.newData)}
Previous Data: ${change.previousData ? JSON.stringify(change.previousData) : 'N/A'}

Affected Tables: ${change.affectedTables.join(', ')}`;

    const response = await callAI({
      systemPrompt: ANALYZER_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 1536,
      jsonMode: true,
    });

    const parsed = extractJSON<AIAnalysisResult>(response.text);

    // Validate required fields
    if (!parsed.summary || !parsed.legalCitation || !parsed.effectiveDate) {
      throw new Error('AI response missing required fields');
    }

    return {
      summary: parsed.summary,
      legalCitation: parsed.legalCitation,
      effectiveDate: parsed.effectiveDate,
      affectedProvisions: parsed.affectedProvisions ?? [],
      recommendedAction: parsed.recommendedAction ?? 'Review change and determine appropriate action.',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
    };
  } catch (error) {
    console.warn('[AIAnalyzer] AI analysis failed, falling back to template:', error);
    return analyzeChangeWithAI(change);
  }
}
