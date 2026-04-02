// =============================================================================
// Rollover Engine — Narrative Prompts (5 Templates)
// =============================================================================

import type { RolloverAnalysis, RolloverScore, RolloverPlan, NarrativeTemplate } from '../types';

export interface NarrativePromptContext {
  analysis: RolloverAnalysis;
  score: RolloverScore;
  plan: RolloverPlan;
}

interface PromptPair {
  system: string;
  user: string;
}

const SYSTEM_BASE = `You are a senior financial advisor at Farther Financial Advisors, a registered investment advisory firm. You are drafting a fiduciary-quality rollover analysis narrative for a client's 401(k) plan.

CRITICAL REQUIREMENTS:
- Write in a professional, empathetic tone appropriate for high-net-worth clients
- Support every claim with specific data points from the analysis
- Reference the 10-factor Rollover Recommendation Score (RRS) framework
- Include relevant regulatory citations (Reg BI, ERISA 404(a), IRC 402(c))
- Present a balanced view — acknowledge factors that favor both staying and rolling over
- Never make definitive recommendations — frame as "the analysis suggests" or "factors indicate"
- Use dollar amounts and basis points for all fee comparisons
- Write in second person ("your plan", "your account")`;

function buildUserPrompt(ctx: NarrativePromptContext): string {
  const { analysis, score, plan } = ctx;
  const balance = (analysis.participant_balance_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const factorSummaries = score.factor_scores
    .map((f) => `- ${f.factor_name.replace(/_/g, ' ')}: ${f.score}/100 (${f.direction.replace(/_/g, ' ')}) — ${f.rationale}`)
    .join('\n');

  return `Generate a rollover analysis narrative for the following:

CLIENT: ${analysis.client_name}, age ${analysis.participant_age}, ${analysis.state_of_residence}
PLAN: ${plan.plan_name} (${plan.sponsor_name}), EIN: ${plan.ein}
BALANCE: ${balance}
YEARS OF SERVICE: ${analysis.years_of_service}
RETIREMENT TARGET: Age ${analysis.retirement_target_age}
PLAN FEES: ${plan.total_plan_expense_bps} bps total
FARTHER IRA FEES: 55 bps all-in
PLAN TYPE: ${plan.plan_type}, ${plan.plan_size_tier} tier
FUNDS: ${plan.fund_count} total, ${plan.index_fund_count} index
${analysis.has_outstanding_loan ? `OUTSTANDING LOAN: $${(analysis.outstanding_loan_cents / 100).toLocaleString()}` : ''}
${analysis.has_employer_stock ? `EMPLOYER STOCK: Basis $${(analysis.employer_stock_cost_basis_cents / 100).toLocaleString()}, ${plan.employer_stock_pct}% allocation` : ''}

COMPOSITE RRS: ${score.composite_score}/100 — ${score.recommendation_tier.replace(/_/g, ' ')}

10-FACTOR BREAKDOWN:
${factorSummaries}

Generate:
1. EXECUTIVE SUMMARY (2-3 paragraphs)
2. DETAILED ANALYSIS (factor-by-factor narrative, 1-2 paragraphs each)
3. RECOMMENDATION (balanced, non-directive)
4. KEY CONSIDERATIONS for client discussion`;
}

// ==================== Template-Specific Prompts ====================

function standardPrompt(ctx: NarrativePromptContext): PromptPair {
  return {
    system: SYSTEM_BASE,
    user: buildUserPrompt(ctx),
  };
}

function uhnwPrompt(ctx: NarrativePromptContext): PromptPair {
  return {
    system: SYSTEM_BASE + `\n\nADDITIONAL CONTEXT: This is a UHNW (Ultra High Net Worth) client. Emphasize:
- Tax optimization strategies (NUA, Roth conversion ladder, QLAC)
- Estate planning implications of IRA vs 401(k) designations
- Concentrated stock and diversification considerations
- Direct indexing and tax-loss harvesting opportunities
- Multi-generational wealth transfer aspects`,
    user: buildUserPrompt(ctx),
  };
}

function nearRetirementPrompt(ctx: NarrativePromptContext): PromptPair {
  return {
    system: SYSTEM_BASE + `\n\nADDITIONAL CONTEXT: This client is near retirement. Emphasize:
- Rule of 55 penalty-free access implications
- RMD planning and still-working exception
- Income distribution strategy optimization
- Social Security coordination
- Healthcare cost considerations (Medicare, HSA)
- Sequence of returns risk management`,
    user: buildUserPrompt(ctx),
  };
}

function smallBusinessPrompt(ctx: NarrativePromptContext): PromptPair {
  return {
    system: SYSTEM_BASE + `\n\nADDITIONAL CONTEXT: This involves a small business plan. Emphasize:
- Plan termination risk for small employers
- Limited investment options typical of small plans
- High per-participant costs in small plans
- Owner-employee considerations
- Fiduciary liability transfer benefits`,
    user: buildUserPrompt(ctx),
  };
}

function customPrompt(ctx: NarrativePromptContext): PromptPair {
  return {
    system: SYSTEM_BASE + '\n\nADDITIONAL CONTEXT: Generate a comprehensive analysis covering all factors. The advisor will customize the narrative before delivery.',
    user: buildUserPrompt(ctx),
  };
}

// ==================== Template Registry ====================

const PROMPT_TEMPLATES: Record<NarrativeTemplate, (ctx: NarrativePromptContext) => PromptPair> = {
  STANDARD: standardPrompt,
  UHNW: uhnwPrompt,
  NEAR_RETIREMENT: nearRetirementPrompt,
  SMALL_BUSINESS: smallBusinessPrompt,
  CUSTOM: customPrompt,
};

export function getPromptForTemplate(
  template: NarrativeTemplate,
  ctx: NarrativePromptContext,
): PromptPair {
  const generator = PROMPT_TEMPLATES[template];
  return generator(ctx);
}

export { PROMPT_TEMPLATES };
