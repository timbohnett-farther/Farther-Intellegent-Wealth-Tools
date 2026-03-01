// =============================================================================
// Tax Planning Platform -- Extraction Pipeline v0 (Stage 1 Stub)
// =============================================================================
//
// Generates deterministic, realistic-looking extracted fields for a small set
// of common Form 1040 lines.  Values are seeded from a hash of the document ID
// so that repeated calls with the same docId produce identical results.
//
// In Stage 2+, this module will be replaced by real OCR / PDF-parsing logic
// backed by a document intelligence provider.
// =============================================================================

import {
  ExtractedField,
  MoneyCents,
  TaxLineRef,
  TaxYear,
  DocType,
  SourceKind,
  cents,
  COMMON_TAX_LINE_REFS,
} from './types';

// =====================================================================
// Public Types
// =====================================================================

/**
 * Result returned by the extraction pipeline for a single document.
 */
export interface ExtractionResult {
  /** Extracted field records (field_id is assigned downstream). */
  fields: Omit<ExtractedField, 'field_id'>[];
  /** Simulated wall-clock processing time in milliseconds. */
  processingTimeMs: number;
  /** The tax form that was detected (or inferred) from the document. */
  formDetected: string;
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Generate stub extracted fields for a document.
 *
 * Returns deterministic but realistic-looking values based on a simple
 * hash of `docId`.  The field set covers the eight most common Form 1040
 * lines defined in {@link COMMON_TAX_LINE_REFS}.
 *
 * @param params.docId   - Unique document identifier (used as seed).
 * @param params.taxYear - Tax year for the document.
 * @param params.docType - Classification of the uploaded document.
 * @returns An {@link ExtractionResult} with populated fields.
 */
export function extractDocument(params: {
  docId: string;
  taxYear: TaxYear;
  docType: DocType;
}): ExtractionResult {
  const seed = hashString(params.docId);

  // Determine source kind from document type
  const sourceKind: SourceKind =
    params.docType === 'IRS_RETURN_TRANSCRIPT_PDF'
      ? 'TRANSCRIPT_TABLE'
      : params.docType === 'FORM1040_PDF'
        ? 'OCR'
        : 'PDF_TEXT';

  // Transcript sources have perfect confidence; OCR/PDF_TEXT vary
  const baseConfidence = sourceKind === 'TRANSCRIPT_TABLE' ? 1.0 : 0.0;

  // ------------------------------------------------------------------
  // Generate income line items
  // ------------------------------------------------------------------

  // Wages: $50,000 - $250,000
  const wages = seededAmount(seed, 50_000, 250_000);

  // Taxable interest: $500 - $15,000
  const interest = seededAmount(seed + 1, 500, 15_000);

  // Qualified dividends: $1,000 - $30,000
  const qualDivs = seededAmount(seed + 2, 1_000, 30_000);

  // Ordinary dividends: qualified + $200 - $5,000 extra
  const ordDivs = ((qualDivs as number) + seededAmount(seed + 3, 200, 5_000)) as MoneyCents;

  // Capital gain/loss: -$3,000 to $50,000
  const capGain = seededAmount(seed + 4, -3_000, 50_000);

  // AGI: sum of income items (floor at $0)
  const agiRaw =
    (wages as number) +
    (interest as number) +
    (ordDivs as number) +
    (capGain as number);
  const agi = Math.max(0, agiRaw) as MoneyCents;

  // Taxable income: AGI minus a rough standard deduction (~$15,000)
  const approxDeduction = cents(15_000);
  const taxableIncome = Math.max(0, (agi as number) - (approxDeduction as number)) as MoneyCents;

  // Tax: rough progressive estimate (not exact -- extraction is OCR'd value)
  const tax = estimateStubTax(taxableIncome, seed);

  // ------------------------------------------------------------------
  // Build field array
  // ------------------------------------------------------------------

  const fieldDefs: Array<{
    ref: TaxLineRef;
    value: MoneyCents;
    page: number;
    confOffset: number; // added to baseConfidence for OCR variance
  }> = [
    { ref: COMMON_TAX_LINE_REFS.WAGES, value: wages, page: 1, confOffset: 0.97 },
    { ref: COMMON_TAX_LINE_REFS.TAXABLE_INTEREST, value: interest, page: 1, confOffset: 0.93 },
    { ref: COMMON_TAX_LINE_REFS.QUALIFIED_DIVIDENDS, value: qualDivs, page: 1, confOffset: 0.91 },
    { ref: COMMON_TAX_LINE_REFS.ORDINARY_DIVIDENDS, value: ordDivs, page: 1, confOffset: 0.92 },
    { ref: COMMON_TAX_LINE_REFS.CAPITAL_GAIN_LOSS, value: capGain, page: 1, confOffset: 0.89 },
    { ref: COMMON_TAX_LINE_REFS.AGI, value: agi, page: 1, confOffset: 0.95 },
    { ref: COMMON_TAX_LINE_REFS.TAXABLE_INCOME, value: taxableIncome, page: 2, confOffset: 0.94 },
    { ref: COMMON_TAX_LINE_REFS.TAX, value: tax, page: 2, confOffset: 0.88 },
  ];

  const fields: Omit<ExtractedField, 'field_id'>[] = fieldDefs.map((fd) => ({
    doc_id: params.docId,
    tax_line_ref: fd.ref,
    value_cents: fd.value,
    confidence: baseConfidence === 1.0 ? 1.0 : fd.confOffset,
    source_kind: sourceKind,
    page_num: fd.page,
  }));

  return {
    fields,
    processingTimeMs: 150 + (seed % 200), // simulate 150-349ms processing
    formDetected:
      params.docType === 'FORM1040_PDF'
        ? 'Form 1040'
        : params.docType === 'IRS_RETURN_TRANSCRIPT_PDF'
          ? 'IRS Return Transcript'
          : 'Unknown',
  };
}

// =====================================================================
// Internal Helpers
// =====================================================================

/**
 * Simple deterministic string hash (djb2 variant).
 * Returns a positive 32-bit integer.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic money value within [minDollars, maxDollars].
 * Uses the seed to pick a value in the range, returned as MoneyCents.
 */
function seededAmount(seed: number, minDollars: number, maxDollars: number): MoneyCents {
  // Ensure positive seed for modulus
  const positiveSeed = Math.abs(seed);
  const rangeCents = (maxDollars - minDollars) * 100;

  // Use golden ratio fractional part for better distribution
  const phi = 0.6180339887;
  const fraction = ((positiveSeed * phi) % 1 + 1) % 1; // always [0, 1)

  const valueCents = Math.round(minDollars * 100 + fraction * rangeCents);
  return valueCents as MoneyCents;
}

/**
 * Produce a rough tax estimate for the stub extraction.
 * This is intentionally imprecise -- it simulates what OCR would read
 * off a filed return, not what the computation engine calculates.
 */
function estimateStubTax(taxableIncome: MoneyCents, seed: number): MoneyCents {
  const ti = taxableIncome as number;

  // Rough effective rate: 10% for low income, scaling to ~30% for high
  let effectiveRate: number;
  if (ti <= 1_000_000) {
    // up to $10k taxable -> ~10%
    effectiveRate = 0.10;
  } else if (ti <= 5_000_000) {
    // $10k-$50k -> ~12-15%
    effectiveRate = 0.12 + ((ti - 1_000_000) / 4_000_000) * 0.03;
  } else if (ti <= 10_000_000) {
    // $50k-$100k -> ~15-20%
    effectiveRate = 0.15 + ((ti - 5_000_000) / 5_000_000) * 0.05;
  } else if (ti <= 25_000_000) {
    // $100k-$250k -> ~20-28%
    effectiveRate = 0.20 + ((ti - 10_000_000) / 15_000_000) * 0.08;
  } else {
    // $250k+ -> ~28-32%
    effectiveRate = 0.28 + Math.min(0.04, ((ti - 25_000_000) / 50_000_000) * 0.04);
  }

  // Add a tiny seed-based jitter (±1%) to simulate real OCR'd values
  const jitter = ((seed % 200) - 100) / 10_000; // ±0.01
  effectiveRate += jitter;

  return Math.round(ti * effectiveRate) as MoneyCents;
}
