/**
 * Brokerage Statement OCR Scanner
 * Uses MiniMax M2.7 vision model via Zolo/AIZOLO gateway to extract holdings
 * from PDF or image statements.
 *
 * @module proposal-engine/ocr/statement-scanner
 */

import { callAIWithDocuments, extractJSON } from '@/lib/ai/gateway';
import type {
  StatementScanResult,
  Holding,
  AccountType,
  AssetClass,
  MoneyCents,
} from '@/lib/proposal-engine/types';
import { cents } from '@/lib/tax-planning/types';

// =====================================================================
// System Prompt for Brokerage Statement Extraction
// =====================================================================

export const STATEMENT_SCAN_SYSTEM_PROMPT = `You are an expert financial document analyst specializing in OCR extraction from brokerage account statements.

Your task is to extract structured data from brokerage statements (PDF or images) with extreme accuracy.

Extract the following fields:

**Account Information:**
- institution: string (e.g., "Schwab", "Fidelity", "Vanguard")
- accountType: string (e.g., "TAXABLE", "IRA", "ROTH_IRA", "401K")
- accountNumber: string (mask all but last 4 digits as "****1234")
- accountHolder: string (full name as shown on statement)
- statementDate: string (ISO 8601 date YYYY-MM-DD)

**Holdings Array (each position):**
For each holding, extract:
- symbol: string (ticker symbol, or null for non-traded assets)
- description: string (security name/description)
- shares: number (quantity held)
- price: number (price per share in DOLLARS)
- value: number (total market value in DOLLARS)
- costBasis: number | null (cost basis in DOLLARS, null if unavailable)
- assetClass: string (classify as one of: EQUITY_US_LARGE, EQUITY_US_MID, EQUITY_US_SMALL, EQUITY_INTL_DEVELOPED, EQUITY_INTL_EMERGING, EQUITY_SECTOR, FIXED_INCOME_GOVT, FIXED_INCOME_CORP, FIXED_INCOME_CORP_IG, FIXED_INCOME_CORP_HY, FIXED_INCOME_MUNI, FIXED_INCOME_INTL, FIXED_INCOME_TIPS, REAL_ESTATE, ALTERNATIVES_COMMODITIES, ALTERNATIVES_OTHER, CASH, CASH_EQUIVALENT, ANNUITY, OTHER)

**Account Totals:**
- cashBalance: number (cash and cash equivalents in DOLLARS)
- totalValue: number (total account value in DOLLARS)

**Quality:**
- confidence: number (0.0 to 1.0 — your overall confidence in the extraction accuracy)

**CRITICAL RULES:**
1. All monetary amounts must be in DOLLARS (not cents) — e.g., $150.25 should be returned as 150.25
2. If you cannot read a field, use null for numbers, empty string for text
3. Classify asset class as precisely as possible based on description:
   - Large cap US equities → EQUITY_US_LARGE
   - International developed equities → EQUITY_INTL_DEVELOPED
   - Treasury bonds → FIXED_INCOME_GOVT
   - Corporate investment grade → FIXED_INCOME_CORP_IG
   - REITs → REAL_ESTATE
   - Money market funds → CASH_EQUIVALENT
   - Unknown → OTHER
4. Account type mapping:
   - "Individual", "Joint", "Brokerage" → TAXABLE
   - "Traditional IRA" → IRA
   - "Roth IRA" → ROTH_IRA
   - "401(k)" → 401K
   - "SEP IRA" → SEP_IRA
   - "Simple IRA" → SIMPLE_IRA
   - "403(b)" → 403B
   - "529 Plan" → 529
   - "Trust" → TRUST
5. Set confidence lower (< 0.90) if any data is unclear, partial, or estimated

Return ONLY valid JSON in this exact structure:

{
  "institution": "string",
  "accountType": "TAXABLE|IRA|ROTH_IRA|401K|SEP_IRA|SIMPLE_IRA|403B|529|TRUST|JOINT|CUSTODIAL|HSA|ANNUITY|OTHER",
  "accountNumber": "string",
  "accountHolder": "string",
  "statementDate": "YYYY-MM-DD",
  "holdings": [
    {
      "symbol": "string | null",
      "description": "string",
      "shares": number,
      "price": number,
      "value": number,
      "costBasis": number | null,
      "assetClass": "EQUITY_US_LARGE|EQUITY_INTL_DEVELOPED|..."
    }
  ],
  "cashBalance": number,
  "totalValue": number,
  "confidence": number
}`;

// =====================================================================
// Types
// =====================================================================

export interface ScanStatementParams {
  /** Base64-encoded document data */
  base64Data: string;
  /** MIME type (e.g., "application/pdf", "image/jpeg", "image/png") */
  mimeType: string;
  /** Original filename for tracking */
  fileName: string;
  /** Account holder name for validation */
  accountHolder: string;
}

interface AIExtractedData {
  institution: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  statementDate: string;
  holdings: Array<{
    symbol: string | null;
    description: string;
    shares: number;
    price: number; // in DOLLARS
    value: number; // in DOLLARS
    costBasis: number | null; // in DOLLARS
    assetClass: string;
  }>;
  cashBalance: number; // in DOLLARS
  totalValue: number; // in DOLLARS
  confidence: number;
}

// =====================================================================
// Asset Class Mapping
// =====================================================================

const ASSET_CLASS_MAP: Record<string, AssetClass> = {
  EQUITY_US_LARGE: 'EQUITY_US_LARGE',
  EQUITY_US_MID: 'EQUITY_US_MID',
  EQUITY_US_SMALL: 'EQUITY_US_SMALL',
  EQUITY_INTL_DEVELOPED: 'EQUITY_INTL_DEVELOPED',
  EQUITY_INTL_EMERGING: 'EQUITY_INTL_EMERGING',
  EQUITY_SECTOR: 'EQUITY_SECTOR',
  FIXED_INCOME_GOVT: 'FIXED_INCOME_GOVT',
  FIXED_INCOME_CORP: 'FIXED_INCOME_CORP',
  FIXED_INCOME_CORP_IG: 'FIXED_INCOME_CORP_IG',
  FIXED_INCOME_CORP_HY: 'FIXED_INCOME_CORP_HY',
  FIXED_INCOME_MUNI: 'FIXED_INCOME_MUNI',
  FIXED_INCOME_INTL: 'FIXED_INCOME_INTL',
  FIXED_INCOME_TIPS: 'FIXED_INCOME_TIPS',
  REAL_ESTATE: 'REAL_ESTATE',
  ALTERNATIVES_REAL_ESTATE: 'ALTERNATIVES_REAL_ESTATE',
  ALTERNATIVES_COMMODITIES: 'ALTERNATIVES_COMMODITIES',
  ALTERNATIVES_OTHER: 'ALTERNATIVES_OTHER',
  COMMODITIES: 'COMMODITIES',
  GOLD: 'GOLD',
  ALTERNATIVE_PE: 'ALTERNATIVE_PE',
  ALTERNATIVE_HEDGE: 'ALTERNATIVE_HEDGE',
  ALTERNATIVE_PRIVATE_CREDIT: 'ALTERNATIVE_PRIVATE_CREDIT',
  CASH: 'CASH',
  CASH_EQUIVALENT: 'CASH_EQUIVALENT',
  ANNUITY: 'ANNUITY',
  OTHER: 'OTHER',
};

function mapAssetClass(aiAssetClass: string): AssetClass {
  const normalized = aiAssetClass.toUpperCase().trim();
  return ASSET_CLASS_MAP[normalized] || 'OTHER';
}

// =====================================================================
// Account Type Mapping
// =====================================================================

const ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  TAXABLE: 'TAXABLE',
  '401K': '401K',
  IRA: 'IRA',
  ROTH_IRA: 'ROTH_IRA',
  SEP_IRA: 'SEP_IRA',
  SIMPLE_IRA: 'SIMPLE_IRA',
  '403B': '403B',
  '529': '529',
  TRUST: 'TRUST',
  JOINT: 'JOINT',
  CUSTODIAL: 'CUSTODIAL',
  HSA: 'HSA',
  ANNUITY: 'ANNUITY',
  OTHER: 'OTHER',
};

function mapAccountType(aiAccountType: string): AccountType {
  const normalized = aiAccountType.toUpperCase().trim();
  return ACCOUNT_TYPE_MAP[normalized] || 'OTHER';
}

// =====================================================================
// Main Scanner Function
// =====================================================================

/**
 * Scan a brokerage statement using MiniMax vision model.
 * Returns structured holdings data with confidence scoring.
 */
export async function scanStatement(
  params: ScanStatementParams
): Promise<StatementScanResult> {
  const { base64Data, mimeType, fileName, accountHolder } = params;

  // Detect document type for AI request
  const docType = mimeType === 'application/pdf' ? 'pdf' : 'image';

  try {
    // Call AI with document
    const aiResponse = await callAIWithDocuments({
      systemPrompt: STATEMENT_SCAN_SYSTEM_PROMPT,
      userPrompt: `Extract all holdings and account information from this brokerage statement. Account holder: ${accountHolder}`,
      documents: [
        {
          type: docType,
          data: base64Data,
          mimeType,
        },
      ],
      temperature: 0.1, // Low temp for factual extraction
      maxTokens: 8192,
      jsonMode: true,
    });

    // Extract JSON from response
    const extracted = extractJSON<AIExtractedData>(aiResponse.text);

    // Map holdings to Holding type
    const holdings: Holding[] = extracted.holdings.map((h) => {
      const priceCents = cents(h.price); // Convert dollars to cents
      const marketValueCents = cents(h.value); // Convert dollars to cents
      const costBasisCents = h.costBasis !== null ? cents(h.costBasis) : null;

      let unrealizedGain: MoneyCents | null = null;
      let gainPct: number | null = null;

      if (costBasisCents !== null && marketValueCents !== null) {
        unrealizedGain = (marketValueCents - costBasisCents) as MoneyCents;
        if (costBasisCents > 0) {
          gainPct = ((unrealizedGain as number) / (costBasisCents as number)) * 100;
        }
      }

      return {
        ticker: h.symbol,
        cusip: null, // Not extracted from statements (would require ticker lookup)
        name: h.description.substring(0, 100), // Truncate for name field
        description: h.description,
        assetClass: mapAssetClass(h.assetClass),
        isSingleStock: h.symbol !== null && !h.description.toLowerCase().includes('fund') && !h.description.toLowerCase().includes('etf'),
        quantity: h.shares,
        shares: h.shares,
        price: priceCents,
        marketValue: marketValueCents,
        costBasis: costBasisCents,
        unrealizedGain,
        gainPct,
        holdingPeriod: null, // Not available from statement
        expenseRatio: null, // Not available from statement
        dividendYield: null, // Not available from statement
        accountType: mapAccountType(extracted.accountType),
        accountName: `${extracted.institution} ${extracted.accountNumber}`,
      };
    });

    // Quality flags for items requiring review
    const flaggedForReview: string[] = [];

    // Flag low confidence extraction
    if (extracted.confidence < 0.90) {
      flaggedForReview.push(
        `Overall extraction confidence is ${(extracted.confidence * 100).toFixed(0)}% (below 90% threshold)`
      );
    }

    // Flag holdings with missing cost basis
    const noCostBasis = holdings.filter((h) => h.costBasis === null).length;
    if (noCostBasis > 0) {
      flaggedForReview.push(
        `${noCostBasis} holding(s) missing cost basis data`
      );
    }

    // Flag holdings with null symbols (non-traded assets)
    const noSymbol = holdings.filter((h) => h.ticker === null).length;
    if (noSymbol > 0) {
      flaggedForReview.push(
        `${noSymbol} holding(s) have no ticker symbol (may be non-traded assets)`
      );
    }

    // Build result
    const result: StatementScanResult = {
      scanId: crypto.randomUUID(),
      accountHolder: extracted.accountHolder,
      institution: extracted.institution,
      accountType: mapAccountType(extracted.accountType),
      accountNumber: extracted.accountNumber,
      statementDate: extracted.statementDate,
      totalValue: cents(extracted.totalValue),
      holdings,
      cashAndEquivalents: cents(extracted.cashBalance),
      confidence: extracted.confidence,
      flaggedForReview,
      captureMethod: 'OCR_SCAN',
      processedAt: new Date().toISOString(),
      fileName,
      custodian: extracted.institution,
      status: 'COMPLETE',
    };

    return result;
  } catch (err) {
    // Error handling — return failed scan result
    console.error('[statement-scanner] Scan failed:', err);

    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error during OCR extraction';

    return {
      scanId: crypto.randomUUID(),
      accountHolder: accountHolder,
      institution: 'UNKNOWN',
      accountType: 'OTHER',
      accountNumber: 'ERROR',
      statementDate: new Date().toISOString().split('T')[0],
      totalValue: cents(0),
      holdings: [],
      cashAndEquivalents: cents(0),
      confidence: 0,
      flaggedForReview: [
        `OCR extraction failed: ${errorMessage}`,
        'Manual review required',
      ],
      captureMethod: 'OCR_SCAN',
      processedAt: new Date().toISOString(),
      fileName,
      status: 'ERROR',
    };
  }
}
