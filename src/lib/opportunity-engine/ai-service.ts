/**
 * AI Service for Opportunity Summaries
 *
 * Integrates Claude API to generate plain-language summaries and explanations
 * for detected tax planning opportunities with citations and hallucination detection.
 *
 * CRITICAL RULES:
 * 1. AI explains calculations, NEVER performs tax math
 * 2. All citations must reference real IRS publications
 * 3. Include "Consult a CPA" disclaimer on all outputs
 * 4. No specific tax advice - only educational context
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Opportunity } from '@/types/opportunity-engine';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

export interface AiSummaryRequest {
  opportunity: Opportunity;
  includeComparisons?: boolean;
  includeCitations?: boolean;
}

export interface Citation {
  source: string;
  section?: string;
  url?: string;
  quote?: string;
}

export interface AiSummaryResponse {
  summary: string;
  citations: Citation[];
  generatedAt: Date;
  hallucinations: string[];
}

// ============================================================================
// TAX KNOWLEDGE BASE
// ============================================================================

/**
 * Curated IRS publications for citation validation
 *
 * Only references from this list are allowed in AI responses.
 * Prevents hallucination of fake IRS sources.
 */
const TAX_KNOWLEDGE_BASE = [
  {
    id: 'pub_590a',
    title: 'IRS Publication 590-A',
    subtitle: 'Contributions to Individual Retirement Arrangements (IRAs)',
    url: 'https://www.irs.gov/publications/p590a',
    topics: ['Roth conversion', 'Traditional IRA', 'Contribution limits', 'Income limits'],
  },
  {
    id: 'pub_590b',
    title: 'IRS Publication 590-B',
    subtitle: 'Distributions from Individual Retirement Arrangements (IRAs)',
    url: 'https://www.irs.gov/publications/p590b',
    topics: ['RMD', 'Roth distributions', 'Early withdrawal penalty', 'Rollovers'],
  },
  {
    id: 'pub_554',
    title: 'IRS Publication 554',
    subtitle: 'Tax Guide for Seniors',
    url: 'https://www.irs.gov/publications/p554',
    topics: ['IRMAA', 'Medicare premiums', 'Social Security', 'Senior tax benefits'],
  },
  {
    id: 'pub_505',
    title: 'IRS Publication 505',
    subtitle: 'Tax Withholding and Estimated Tax',
    url: 'https://www.irs.gov/publications/p505',
    topics: ['Withholding', 'Estimated payments', 'Underpayment penalty', 'Safe harbor'],
  },
  {
    id: 'pub_550',
    title: 'IRS Publication 550',
    subtitle: 'Investment Income and Expenses',
    url: 'https://www.irs.gov/publications/p550',
    topics: ['Capital gains', 'Dividends', 'Interest', 'Investment expenses', 'NIIT'],
  },
  {
    id: 'pub_526',
    title: 'IRS Publication 526',
    subtitle: 'Charitable Contributions',
    url: 'https://www.irs.gov/publications/p526',
    topics: ['Charitable deductions', 'Donor-advised funds', 'QCD', 'Bunching'],
  },
  {
    id: 'pub_535',
    title: 'IRS Publication 535',
    subtitle: 'Business Expenses',
    url: 'https://www.irs.gov/publications/p535',
    topics: ['QBI deduction', 'Section 199A', 'Business deductions'],
  },
];

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a tax planning assistant for financial advisors.

CRITICAL RULES:
1. NEVER invent tax law or regulations
2. NEVER perform tax calculations (calculations are already done deterministically)
3. ONLY reference real IRS publications from the provided knowledge base
4. ALWAYS cite sources using [Source Title, Section] format
5. If uncertain, say "Consult a CPA for confirmation"
6. Provide educational context, NOT specific tax advice
7. Include standard disclaimer at the end

AVAILABLE SOURCES:
${TAX_KNOWLEDGE_BASE.map(
  (doc) => `- ${doc.title}: ${doc.subtitle}
  Topics: ${doc.topics.join(', ')}
  URL: ${doc.url}`
).join('\n\n')}

OUTPUT FORMAT (JSON):
{
  "summary": "3-4 paragraph plain-language explanation",
  "citations": [
    {
      "source": "IRS Publication 590-B",
      "section": "Chapter 1: Distributions from IRAs",
      "url": "https://www.irs.gov/publications/p590b",
      "quote": "Roth IRA distributions are tax-free if..."
    }
  ]
}

SUMMARY STRUCTURE:
1. **What was detected:** Brief description of the opportunity
2. **Why it matters:** Tax impact and potential savings
3. **Key considerations:** Important factors and risks
4. **Next steps:** Recommended actions

TONE:
- Clear and professional
- Explain complex concepts simply
- Focus on the "why" not just the "what"
- Educational, not prescriptive

DISCLAIMER (always include at end):
**Important:** This analysis is for educational purposes. Consult a qualified tax professional before making any tax-related decisions.
`;

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build user prompt for opportunity summary generation
 */
function buildUserPrompt(request: AiSummaryRequest): string {
  const { opportunity, includeComparisons = true } = request;

  const evidence = opportunity.evidence
    .map(
      (e) => `- ${e.label}: ${e.displayValue}${e.sourceField ? ` (Source: ${e.sourceField})` : ''}`
    )
    .join('\n');

  const prompt = `
**Opportunity Detected:**
- Category: ${opportunity.category}
- Title: ${opportunity.title}
- Summary: ${opportunity.summary}
- Priority: ${opportunity.priority}
- Estimated Value: $${(opportunity.estimatedValue ?? 0).toLocaleString()}
- Confidence: ${opportunity.confidence}

**Evidence:**
${evidence}

**Scoring Breakdown:**
- Impact Score: ${opportunity.score.impactScore}/100
- Urgency Score: ${opportunity.score.urgencyScore}/100
- Confidence Score: ${opportunity.score.confidenceScore}/100
- Complexity Score: ${opportunity.score.complexityScore}/100
- Final Score: ${opportunity.score.finalScore}/100

**Task:**
Generate a clear, plain-language explanation of this tax planning opportunity for a financial advisor to share with their client.

Explain:
1. What tax strategy was identified
2. Why this opportunity exists (based on the evidence)
3. Potential tax savings or benefits
4. Important considerations and risks
5. Recommended next steps

${includeComparisons ? '\nInclude comparison to current baseline if relevant.' : ''}

Provide citations for all tax concepts mentioned.
  `.trim();

  return prompt;
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Generate AI-powered summary for an opportunity
 *
 * @param request Summary request with opportunity details
 * @returns AI-generated summary with citations
 * @throws Error if API call fails or response is invalid
 */
export async function generateAiSummary(request: AiSummaryRequest): Promise<AiSummaryResponse> {
  try {
    // Build prompt
    const userPrompt = buildUserPrompt(request);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Latest Sonnet model
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3, // Low temperature for factual accuracy
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    // Parse JSON response
    let parsed: { summary: string; citations: Citation[] };
    try {
      parsed = JSON.parse(textContent.text);
    } catch {
      // If not JSON, treat as plain text summary
      parsed = {
        summary: textContent.text,
        citations: [],
      };
    }

    // Validate citations
    const { validCitations, hallucinations } = validateCitations(parsed.citations || []);

    return {
      summary: parsed.summary,
      citations: validCitations,
      generatedAt: new Date(),
      hallucinations,
    };
  } catch (error) {
    console.error('[AI Service] Error generating summary:', error);
    throw new Error(`Failed to generate AI summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// CITATION VALIDATION
// ============================================================================

/**
 * Validate citations against knowledge base
 *
 * Ensures all citations reference real IRS publications.
 * Flags any hallucinated sources.
 *
 * @param citations Citations from AI response
 * @returns Valid citations and list of hallucinations
 */
function validateCitations(citations: Citation[]): {
  validCitations: Citation[];
  hallucinations: string[];
} {
  const validCitations: Citation[] = [];
  const hallucinations: string[] = [];

  for (const citation of citations) {
    const isValid = TAX_KNOWLEDGE_BASE.some(
      (doc) =>
        citation.source.includes(doc.title) ||
        citation.source.includes(doc.subtitle) ||
        citation.url === doc.url
    );

    if (isValid) {
      validCitations.push(citation);
    } else {
      hallucinations.push(
        `Hallucinated source: "${citation.source}" - not found in knowledge base`
      );
      console.warn('[AI Service] Hallucinated citation detected:', citation.source);
    }
  }

  return { validCitations, hallucinations };
}

/**
 * Get knowledge base entry by topic
 *
 * Helper for finding relevant IRS publications
 */
export function findKnowledgeByTopic(topic: string): typeof TAX_KNOWLEDGE_BASE {
  return TAX_KNOWLEDGE_BASE.filter((doc) =>
    doc.topics.some((t) => t.toLowerCase().includes(topic.toLowerCase()))
  );
}
