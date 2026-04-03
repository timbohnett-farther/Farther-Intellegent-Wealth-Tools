/**
 * MiniMax 2.7 Document Processor
 *
 * Unified service for all document uploads across the platform.
 * Handles: Tax docs, 401k statements, loan statements, estate docs, vault docs.
 *
 * Uses MiniMax 2.7 vision capabilities to directly process PDFs and images
 * without needing separate OCR libraries.
 */

import { callAIWithDocuments, extractJSON } from '@/lib/ai/gateway';
import { readFile } from 'fs/promises';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'tax_return_1040'
  | 'tax_return_schedule_d'
  | 'tax_return_w2'
  | '401k_statement'
  | 'brokerage_statement'
  | 'loan_statement'
  | 'mortgage_statement'
  | 'credit_card_statement'
  | 'estate_will'
  | 'estate_trust'
  | 'generic_financial';

export interface DocumentProcessingRequest {
  documentType: DocumentType;
  filePath?: string;        // Local file path OR
  fileBuffer?: Buffer;      // File buffer OR
  base64Data?: string;      // Already base64 encoded
  mimeType: string;         // 'application/pdf' | 'image/jpeg' | etc.
  extractionSchema?: any;   // Optional: specific fields to extract
}

export interface DocumentProcessingResult {
  success: boolean;
  documentType: DocumentType;
  extractedData: Record<string, any>;
  rawText: string;
  confidence: number; // 0-1
  processingTimeMs: number;
  metadata: {
    pageCount?: number;
    fileSize?: number;
    ocrLanguage?: string;
  };
}

// ─── Main Processor ──────────────────────────────────────────────────────────

/**
 * Process a document using MiniMax 2.7 vision AI.
 * Extracts structured data based on document type.
 */
export async function processDocument(
  request: DocumentProcessingRequest
): Promise<DocumentProcessingResult> {
  const startTime = Date.now();

  try {
    // Convert to base64 if needed
    const base64Data = await getBase64Data(request);

    // Build extraction prompt based on document type
    const { systemPrompt, userPrompt } = buildPrompts(
      request.documentType,
      request.extractionSchema
    );

    // Call MiniMax 2.7 with vision
    const response = await callAIWithDocuments({
      systemPrompt,
      userPrompt,
      documents: [{
        type: request.mimeType === 'application/pdf' ? 'pdf' : 'image',
        data: base64Data,
        mimeType: request.mimeType,
      }],
      temperature: 0.1, // Low temp for factual extraction
      maxTokens: 4096,
      jsonMode: true,
    });

    // Parse extracted data
    const extracted = extractJSON<any>(response.text);

    // Validate and normalize
    const result: DocumentProcessingResult = {
      success: true,
      documentType: request.documentType,
      extractedData: extracted.data || extracted,
      rawText: extracted.rawText || extracted.raw_text || '',
      confidence: extracted.confidence || 0.95,
      processingTimeMs: Date.now() - startTime,
      metadata: {
        pageCount: extracted.pageCount || extracted.page_count,
        ocrLanguage: 'en',
      },
    };

    console.log(`[MiniMax Processor] ${request.documentType} processed in ${result.processingTimeMs}ms (confidence: ${result.confidence})`);

    return result;
  } catch (error) {
    console.error(`[MiniMax Processor] Failed to process ${request.documentType}:`, error);

    return {
      success: false,
      documentType: request.documentType,
      extractedData: {},
      rawText: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      metadata: {},
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getBase64Data(request: DocumentProcessingRequest): Promise<string> {
  if (request.base64Data) return request.base64Data;

  if (request.fileBuffer) {
    return request.fileBuffer.toString('base64');
  }

  if (request.filePath) {
    const buffer = await readFile(request.filePath);
    return buffer.toString('base64');
  }

  throw new Error('[MiniMax Processor] No file data provided');
}

function buildPrompts(
  documentType: DocumentType,
  customSchema?: any
): { systemPrompt: string; userPrompt: string } {

  const prompts: Record<DocumentType, { system: string; user: string }> = {

    tax_return_1040: {
      system: `You are a tax document analysis specialist. Extract structured data from Form 1040 tax returns with high accuracy.

CRITICAL RULES:
1. Extract ONLY data that is clearly visible in the document
2. Use exact numbers as shown (do not calculate or infer)
3. Return 0 for fields that are blank or not applicable
4. Assign confidence score based on clarity (0-1 scale)
5. Return ONLY valid JSON with no additional commentary`,

      user: `Extract the following fields from this Form 1040 tax return:

Return JSON with this exact structure:
{
  "data": {
    "taxYear": number,
    "filingStatus": "single" | "married_joint" | "married_separate" | "head_of_household" | "qualifying_widow",
    "taxpayerName": string,
    "spouseName": string | null,
    "ssn": string | null,
    "wages": number,
    "interest": number,
    "dividends": number,
    "capitalGains": number,
    "agi": number,
    "standardDeduction": number,
    "itemizedDeduction": number,
    "taxableIncome": number,
    "totalTax": number,
    "federalWithholding": number,
    "refundAmount": number,
    "amountOwed": number
  },
  "rawText": string,
  "confidence": number,
  "pageCount": number
}`,
    },

    tax_return_schedule_d: {
      system: `You are a tax document specialist. Extract capital gains and losses from Schedule D with precision.`,
      user: `Extract Schedule D capital gains data:

Return JSON with:
{
  "data": {
    "shortTermGains": number,
    "shortTermLosses": number,
    "shortTermNet": number,
    "longTermGains": number,
    "longTermLosses": number,
    "longTermNet": number,
    "totalCapitalGains": number
  },
  "rawText": string,
  "confidence": number
}`,
    },

    tax_return_w2: {
      system: `You are a W-2 form extraction specialist. Extract wage and tax information accurately.`,
      user: `Extract W-2 wage and tax data:

Return JSON with:
{
  "data": {
    "employerName": string,
    "employerEIN": string,
    "employeeName": string,
    "employeeSSN": string,
    "wages": number,
    "federalWithholding": number,
    "socialSecurityWages": number,
    "socialSecurityWithholding": number,
    "medicareWages": number,
    "medicareWithholding": number,
    "stateWages": number,
    "stateWithholding": number
  },
  "rawText": string,
  "confidence": number
}`,
    },

    '401k_statement': {
      system: `You are a retirement account analysis specialist. Extract account details, holdings, and fees from 401(k) statements.

CRITICAL RULES:
1. Extract account number, custodian, and statement date first
2. List ALL holdings with ticker symbols and values
3. Calculate total balance by summing all holdings
4. Extract fees if visible (management fees, expense ratios)
5. Return confidence based on data completeness`,

      user: `Extract the following from this 401(k) statement:

Return JSON with:
{
  "data": {
    "accountNumber": string,
    "custodian": string,
    "statementDate": string,
    "balance": number,
    "contributions": {
      "employee": number,
      "employer": number,
      "yearToDate": number
    },
    "holdings": [
      {
        "fundName": string,
        "ticker": string,
        "shares": number,
        "value": number,
        "allocationPercent": number
      }
    ],
    "fees": {
      "managementFee": number,
      "expenseRatio": number,
      "annualFees": number
    }
  },
  "rawText": string,
  "confidence": number
}`,
    },

    brokerage_statement: {
      system: `You are a brokerage statement analyst. Extract account info, positions, and transactions with precision.`,
      user: `Extract account details and holdings from this brokerage statement:

Return JSON with:
{
  "data": {
    "accountNumber": string,
    "custodian": string,
    "statementDate": string,
    "accountType": "individual" | "joint" | "ira" | "roth_ira" | "401k" | "other",
    "totalValue": number,
    "cashBalance": number,
    "holdings": [
      {
        "symbol": string,
        "description": string,
        "quantity": number,
        "price": number,
        "value": number
      }
    ]
  },
  "rawText": string,
  "confidence": number
}`,
    },

    loan_statement: {
      system: `You are a loan document specialist. Extract loan terms, balances, and payment schedules.`,
      user: `Extract loan details from this statement:

Return JSON with:
{
  "data": {
    "loanType": "auto" | "personal" | "student" | "other",
    "lender": string,
    "accountNumber": string,
    "originalAmount": number,
    "currentBalance": number,
    "interestRate": number,
    "monthlyPayment": number,
    "remainingTerm": number,
    "nextPaymentDate": string
  },
  "rawText": string,
  "confidence": number
}`,
    },

    mortgage_statement: {
      system: `You are a mortgage document specialist. Extract property, loan, and payment details.`,
      user: `Extract mortgage details from this statement:

Return JSON with:
{
  "data": {
    "propertyAddress": string,
    "lender": string,
    "loanNumber": string,
    "originalAmount": number,
    "currentBalance": number,
    "interestRate": number,
    "monthlyPayment": number,
    "principalAndInterest": number,
    "escrowAmount": number,
    "remainingTerm": number
  },
  "rawText": string,
  "confidence": number
}`,
    },

    credit_card_statement: {
      system: `You are a credit card statement analyst. Extract account info, balances, and transactions.`,
      user: `Extract credit card details from this statement:

Return JSON with:
{
  "data": {
    "cardIssuer": string,
    "lastFourDigits": string,
    "statementDate": string,
    "dueDate": string,
    "previousBalance": number,
    "currentBalance": number,
    "creditLimit": number,
    "availableCredit": number,
    "minimumPayment": number,
    "apr": number
  },
  "rawText": string,
  "confidence": number
}`,
    },

    estate_will: {
      system: `You are an estate planning document specialist. Extract beneficiaries, executors, and key provisions from wills.`,
      user: `Extract will details from this document:

Return JSON with:
{
  "data": {
    "testatorName": string,
    "dateExecuted": string,
    "executors": [string],
    "beneficiaries": [
      {
        "name": string,
        "relationship": string,
        "bequest": string
      }
    ],
    "witnessCount": number,
    "specialProvisions": [string]
  },
  "rawText": string,
  "confidence": number
}`,
    },

    estate_trust: {
      system: `You are an estate planning document specialist. Extract trust details, trustees, and beneficiaries.`,
      user: `Extract trust details from this document:

Return JSON with:
{
  "data": {
    "trustName": string,
    "trustType": "revocable" | "irrevocable" | "living" | "testamentary" | "other",
    "dateCreated": string,
    "grantors": [string],
    "trustees": [string],
    "beneficiaries": [
      {
        "name": string,
        "relationship": string,
        "interest": string
      }
    ]
  },
  "rawText": string,
  "confidence": number
}`,
    },

    generic_financial: {
      system: `You are a financial document analyst. Extract all visible financial data with high accuracy.`,
      user: `Extract all financial information from this document.

Return JSON with:
{
  "data": {
    "documentType": string,
    "accountNumbers": [string],
    "amounts": [number],
    "dates": [string],
    "entities": [string]
  },
  "rawText": string,
  "confidence": number
}`,
    },
  };

  const config = prompts[documentType] || prompts.generic_financial;

  return {
    systemPrompt: config.system,
    userPrompt: customSchema
      ? `${config.user}\n\nCUSTOM EXTRACTION SCHEMA:\n${JSON.stringify(customSchema, null, 2)}`
      : config.user,
  };
}

// ─── Batch Processing ────────────────────────────────────────────────────────

/**
 * Process multiple documents in batches with rate limit protection.
 * Batches of 3 with 1-second delays between batches.
 */
export async function batchProcessDocuments(
  requests: DocumentProcessingRequest[]
): Promise<DocumentProcessingResult[]> {
  const results: DocumentProcessingResult[] = [];

  // Process in batches of 3 to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(req => processDocument(req))
    );

    results.push(...batchResults);

    // Small delay between batches
    if (i + batchSize < requests.length) {
      console.log(`[MiniMax Processor] Processed batch ${Math.floor(i / batchSize) + 1}, waiting 1s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
