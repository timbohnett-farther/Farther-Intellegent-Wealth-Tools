/**
 * MiniMax M2.7 SMA Fact Sheet Extractor
 *
 * Extracts structured data from SMA fact sheets using MiniMax M2.7 AI model.
 * Returns typed JSON with manager info, AUM, fees, performance, risk metrics.
 *
 * Usage:
 *   const result = await extractSMAData(factSheetContent, 'https://example.com/sma.pdf');
 */

import crypto from 'crypto';

// SMA extraction result interface
export interface SMAExtractionResult {
  success: boolean;
  data: SMAData | null;
  extractionHash: string | null;
  error: string | null;
  extractedAt: Date;
  tokensUsed?: number;
}

// Structured SMA data schema
export interface SMAData {
  // Manager Information
  strategy_name: string;
  manager_name: string;
  manager_firm: string | null;
  inception_date: string | null;  // YYYY-MM-DD
  aum_mm: number | null;  // AUM in millions

  // Investment Details
  asset_class: string | null;  // equity, fixed_income, alternative, multi_asset
  strategy_type: string | null;  // growth, value, blend, etc.
  investment_objective: string | null;
  benchmark: string | null;

  // Fees
  management_fee_bps: number | null;  // basis points
  performance_fee_pct: number | null;
  minimum_investment: number | null;

  // Performance Metrics (annualized where applicable)
  ytd_return: number | null;
  one_year_return: number | null;
  three_year_return: number | null;
  five_year_return: number | null;
  ten_year_return: number | null;
  inception_return: number | null;

  // Risk Metrics
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  max_drawdown: number | null;  // as decimal (e.g., -0.15 for -15%)
  standard_deviation: number | null;
  beta: number | null;
  alpha: number | null;

  // Holdings
  top_holdings: string[] | null;  // Array of top 10 holdings
  sector_allocation: Record<string, number> | null;  // { "Technology": 25.5, ... }
  number_of_holdings: number | null;

  // Additional Metadata
  fact_sheet_date: string | null;  // YYYY-MM-DD
  source_url: string;
}

/**
 * Extract structured SMA data from fact sheet content
 */
export async function extractSMAData(
  content: string,
  sourceUrl: string,
  options?: {
    model?: 'minimax-2.7' | 'minimax-2.7-highspeed';
    timeout?: number;
  }
): Promise<SMAExtractionResult> {
  const { model = 'minimax-2.7', timeout = 60000 } = options || {};

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      data: null,
      extractionHash: null,
      error: 'MINIMAX_API_KEY not configured',
      extractedAt: new Date(),
    };
  }

  // Generate hash for deduplication
  const extractionHash = generateExtractionHash(content);

  // Build extraction prompt
  const prompt = buildSMAExtractionPrompt(content, sourceUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial data extraction specialist. Extract structured data from SMA fact sheets with high accuracy. Return only valid JSON matching the provided schema. Use null for missing values.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,  // Low temperature for factual extraction
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MiniMax API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content || '';
    const tokensUsed = result.usage?.total_tokens || 0;

    // Parse JSON from response
    const smaData = parseExtractedJSON(extractedText, sourceUrl);

    return {
      success: true,
      data: smaData,
      extractionHash,
      error: null,
      extractedAt: new Date(),
      tokensUsed,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    return {
      success: false,
      data: null,
      extractionHash,
      error: error instanceof Error ? error.message : 'Unknown extraction error',
      extractedAt: new Date(),
    };
  }
}

/**
 * Build extraction prompt with schema and examples
 */
function buildSMAExtractionPrompt(content: string, sourceUrl: string): string {
  return `Extract structured data from this SMA (Separately Managed Account) fact sheet.

SOURCE URL: ${sourceUrl}

FACT SHEET CONTENT:
${content.slice(0, 15000)}  // Limit to ~15k chars to stay within context

EXTRACTION SCHEMA (return JSON matching this exact structure):
{
  "strategy_name": "string (required)",
  "manager_name": "string (required)",
  "manager_firm": "string or null",
  "inception_date": "YYYY-MM-DD or null",
  "aum_mm": number (in millions) or null,
  "asset_class": "equity|fixed_income|alternative|multi_asset or null",
  "strategy_type": "growth|value|blend|dividend|momentum or null",
  "investment_objective": "string or null",
  "benchmark": "string (e.g. 'S&P 500') or null",
  "management_fee_bps": number (basis points, e.g. 50 for 0.50%) or null,
  "performance_fee_pct": number (percent, e.g. 20 for 20%) or null,
  "minimum_investment": number (in dollars) or null,
  "ytd_return": number (as decimal, e.g. 0.12 for 12%) or null,
  "one_year_return": number (as decimal) or null,
  "three_year_return": number (annualized as decimal) or null,
  "five_year_return": number (annualized as decimal) or null,
  "ten_year_return": number (annualized as decimal) or null,
  "inception_return": number (annualized as decimal) or null,
  "sharpe_ratio": number or null,
  "sortino_ratio": number or null,
  "max_drawdown": number (as negative decimal, e.g. -0.15 for -15%) or null,
  "standard_deviation": number (as decimal) or null,
  "beta": number or null,
  "alpha": number (as decimal) or null,
  "top_holdings": ["string", "string", ...] (array of top 10) or null,
  "sector_allocation": {"Technology": 25.5, "Healthcare": 20.0, ...} or null,
  "number_of_holdings": number or null,
  "fact_sheet_date": "YYYY-MM-DD or null",
  "source_url": "${sourceUrl}"
}

EXTRACTION RULES:
1. All returns should be decimals (12% = 0.12, NOT 12)
2. Max drawdown should be negative (e.g., -15% = -0.15)
3. Management fees in basis points (0.50% = 50 bps)
4. AUM in millions (not raw dollars)
5. Dates in YYYY-MM-DD format
6. Use null for any missing/unavailable fields
7. Return ONLY valid JSON, no explanation text
8. If multiple strategies in document, extract the primary/first one

Return the extracted JSON now:`;
}

/**
 * Parse extracted JSON from MiniMax response
 */
function parseExtractedJSON(extractedText: string, sourceUrl: string): SMAData {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = extractedText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : extractedText;

    const parsed = JSON.parse(jsonString);

    // Ensure source_url is set
    parsed.source_url = sourceUrl;

    // Validate required fields
    if (!parsed.strategy_name || !parsed.manager_name) {
      throw new Error('Missing required fields: strategy_name and manager_name');
    }

    return parsed as SMAData;
  } catch (error) {
    console.error('Failed to parse extracted JSON:', error);
    console.error('Raw response:', extractedText);

    // Return minimal valid object
    return {
      strategy_name: 'Unknown Strategy',
      manager_name: 'Unknown Manager',
      manager_firm: null,
      inception_date: null,
      aum_mm: null,
      asset_class: null,
      strategy_type: null,
      investment_objective: null,
      benchmark: null,
      management_fee_bps: null,
      performance_fee_pct: null,
      minimum_investment: null,
      ytd_return: null,
      one_year_return: null,
      three_year_return: null,
      five_year_return: null,
      ten_year_return: null,
      inception_return: null,
      sharpe_ratio: null,
      sortino_ratio: null,
      max_drawdown: null,
      standard_deviation: null,
      beta: null,
      alpha: null,
      top_holdings: null,
      sector_allocation: null,
      number_of_holdings: null,
      fact_sheet_date: null,
      source_url: sourceUrl,
    };
  }
}

/**
 * Generate SHA-256 hash of content for deduplication
 */
function generateExtractionHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}
