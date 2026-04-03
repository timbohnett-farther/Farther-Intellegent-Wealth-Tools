/**
 * AI Tax Rule Extractor
 *
 * Uses AI to extract structured tax rule updates from scraped documents
 * (Tax Foundation, NCSL, ACTEC websites)
 */

import { callAI, extractJSON } from '@/lib/ai/gateway';

export interface TaxRuleExtractionRequest {
  jurisdictionCode: string;
  documentUrl: string;
  documentContent: string;
  sourceType: 'tax_foundation' | 'ncsl_state_tax_actions' | 'actec_death_tax_chart' | 'puerto_rico_official';
}

export interface ExtractedTaxRule {
  jurisdictionCode: string;
  taxYear: number;
  changes: {
    incomeTax?: {
      systemType?: 'none' | 'flat' | 'graduated';
      flatRate?: number;
      brackets?: Array<{ minIncome: number; maxIncome: number | null; rate: number }>;
    };
    capitalGains?: {
      treatment?: 'as_ordinary' | 'separate_rate' | 'exempt' | 'special';
      rate?: number;
    };
    estateTax?: {
      hasEstateTax?: boolean;
      exemption?: number;
      topRate?: number;
    };
    puertoRico?: {
      act60Changes?: string;
      cohortRates?: Record<string, number>;
    };
  };
  confidenceScore: number; // 0-1
  summary: string;
  effectiveDate?: string;
}

/**
 * Extract tax rule changes from document content using AI
 */
export async function extractTaxRules(
  request: TaxRuleExtractionRequest
): Promise<ExtractedTaxRule> {
  const systemPrompt = buildExtractionPrompt(request.sourceType);
  const userPrompt = buildUserPrompt(request);

  const response = await callAI({
    systemPrompt,
    userPrompt,
    temperature: 0.1, // Low temperature for factual extraction
    maxTokens: 2048,
    jsonMode: true,
  });

  const extracted = extractJSON<ExtractedTaxRule>(response.text);

  // Validate and normalize the extracted data
  return normalizeExtractedRule(extracted, request.jurisdictionCode);
}

/**
 * Build system prompt based on source type
 */
function buildExtractionPrompt(sourceType: string): string {
  const basePrompt = `You are a tax law extraction specialist. Your task is to analyze tax policy documents and extract structured information about state income tax rates, capital gains treatment, and estate tax rules.

CRITICAL RULES:
1. Only extract factual, verifiable tax rates and brackets
2. Do NOT make assumptions or inferences
3. If a value is unclear or not present, omit it from the response
4. Assign a confidence score (0-1) based on clarity of the source
5. Return ONLY valid JSON with no additional commentary

OUTPUT FORMAT:
{
  "jurisdictionCode": "CA",
  "taxYear": 2026,
  "changes": {
    "incomeTax": {
      "systemType": "graduated",
      "brackets": [
        { "minIncome": 0, "maxIncome": 10000, "rate": 0.01 },
        { "minIncome": 10000, "maxIncome": null, "rate": 0.05 }
      ]
    },
    "capitalGains": {
      "treatment": "as_ordinary"
    },
    "estateTax": {
      "hasEstateTax": true,
      "exemption": 5000000,
      "topRate": 0.16
    }
  },
  "confidenceScore": 0.95,
  "summary": "California maintains graduated income tax with top rate of 13.3%. No changes to estate tax.",
  "effectiveDate": "2026-01-01"
}`;

  const sourceSpecific = {
    tax_foundation: `\n\nSOURCE: Tax Foundation State Tax Tables\nFOCUS: Income tax brackets and rates by filing status`,
    ncsl_state_tax_actions: `\n\nSOURCE: NCSL State Tax Actions\nFOCUS: Recently enacted or proposed tax law changes`,
    actec_death_tax_chart: `\n\nSOURCE: ACTEC State Death Tax Chart\nFOCUS: Estate and inheritance tax exemptions and rates`,
    puerto_rico_official: `\n\nSOURCE: Puerto Rico Official Documents\nFOCUS: Act 60 updates, decree timing, preferential rates`,
  };

  return basePrompt + (sourceSpecific[sourceType as keyof typeof sourceSpecific] || '');
}

/**
 * Build user prompt with document content
 */
function buildUserPrompt(request: TaxRuleExtractionRequest): string {
  return `JURISDICTION: ${request.jurisdictionCode}
SOURCE URL: ${request.documentUrl}

DOCUMENT CONTENT (extract tax rule changes from this):
${request.documentContent.substring(0, 8000)}

Extract structured tax rule changes as JSON. Focus on factual rates and brackets only.`;
}

/**
 * Normalize and validate extracted rule
 */
function normalizeExtractedRule(
  extracted: ExtractedTaxRule,
  jurisdictionCode: string
): ExtractedTaxRule {
  // Ensure jurisdiction code matches
  extracted.jurisdictionCode = jurisdictionCode;

  // Validate confidence score
  if (!extracted.confidenceScore || extracted.confidenceScore < 0 || extracted.confidenceScore > 1) {
    extracted.confidenceScore = 0.5;
  }

  // Ensure tax year is reasonable
  const currentYear = new Date().getFullYear();
  if (!extracted.taxYear || extracted.taxYear < currentYear - 1 || extracted.taxYear > currentYear + 2) {
    extracted.taxYear = currentYear;
  }

  // Normalize bracket rates to decimals
  if (extracted.changes.incomeTax?.brackets) {
    extracted.changes.incomeTax.brackets = extracted.changes.incomeTax.brackets.map(b => ({
      ...b,
      rate: b.rate > 1 ? b.rate / 100 : b.rate, // Convert percentage to decimal if needed
    }));
  }

  return extracted;
}

/**
 * Batch extract tax rules for multiple jurisdictions
 */
export async function batchExtractTaxRules(
  requests: TaxRuleExtractionRequest[]
): Promise<ExtractedTaxRule[]> {
  const results: ExtractedTaxRule[] = [];

  // Process in batches of 3 to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(req => extractTaxRules(req).catch(err => {
        console.error(`Failed to extract rules for ${req.jurisdictionCode}:`, err);
        return null;
      }))
    );

    results.push(...batchResults.filter((r): r is ExtractedTaxRule => r !== null));

    // Small delay between batches
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
