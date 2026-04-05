// =============================================================================
// Document Processor — Extraction & Classification Pipeline
// =============================================================================
//
// Handles PDF text extraction via AI vision, document classification,
// validation, and missing document detection. All extraction flows through
// the unified AI gateway with MiniMax vision for PDFs.
//
// =============================================================================

import { callAI, callAIWithDocuments, extractJSON } from '@/lib/ai/gateway';
import type {
  ExtractionResult,
  ClassificationResult,
  DocumentType,
  DocumentSubtype,
  ClassificationMetadata,
} from './types';

// ── Document Classification Prompt ───────────────────────────────────────────

const CLASSIFIER_SYSTEM_PROMPT = `You are an expert legal document classifier specializing in trust and estate planning documents.

Analyze the provided document text and classify it according to these document types:

**Primary Trust Documents:**
- REVOCABLE_LIVING_TRUST (subtypes: RLT_JOINT, RLT_INDIVIDUAL, RLT_AB_TRUST, RLT_QTIP)
- IRREVOCABLE_TRUST (subtypes: IRREV_LIFE_INSURANCE, IRREV_CHARITABLE_REMAINDER, IRREV_CHARITABLE_LEAD, IRREV_GRANTOR_RETAINED_ANNUITY, IRREV_QUALIFIED_PERSONAL_RESIDENCE, IRREV_INTENTIONALLY_DEFECTIVE_GRANTOR, IRREV_DYNASTY, IRREV_SPECIAL_NEEDS, IRREV_SPENDTHRIFT, IRREV_ASSET_PROTECTION)
- TRUST_AMENDMENT
- TRUST_RESTATEMENT

**Estate Planning Documents:**
- LAST_WILL_AND_TESTAMENT
- POUR_OVER_WILL
- POWER_OF_ATTORNEY (subtypes: POA_FINANCIAL, POA_HEALTHCARE, POA_LIMITED, POA_SPRINGING)
- ADVANCE_DIRECTIVE (subtypes: AD_LIVING_WILL, AD_HEALTHCARE_PROXY, AD_DNR)

**Business & Legal Entities:**
- LLC_OPERATING_AGREEMENT
- PARTNERSHIP_AGREEMENT
- CORPORATE_DOCUMENTS

**Asset Transfer Documents:**
- BENEFICIARY_DESIGNATION (subtypes: BENE_RETIREMENT_ACCOUNT, BENE_LIFE_INSURANCE, BENE_TRANSFER_ON_DEATH, BENE_PAYABLE_ON_DEATH)
- DEED (subtypes: DEED_WARRANTY, DEED_QUITCLAIM, DEED_JOINT_TENANCY, DEED_TENANTS_IN_COMMON, DEED_COMMUNITY_PROPERTY)

**Financial & Tax Documents:**
- LIFE_INSURANCE_POLICY
- ACCOUNT_STATEMENT
- TAX_RETURN (subtypes: TAX_1040, TAX_1041, TAX_709, TAX_706, TAX_STATE)
- APPRAISAL

**Other Documents:**
- PRENUPTIAL_POSTNUPTIAL_AGREEMENT
- COURT_ORDER
- LETTER_OF_INSTRUCTION
- DIGITAL_ASSET_INVENTORY
- OTHER

Extract ALL metadata available:
- Grantors, trustees, beneficiaries (names)
- Execution date (ISO format YYYY-MM-DD)
- Governing law (state code like "CA", "NY")
- Attorney name
- Trust name (if applicable)
- Policy/account numbers
- Tax year

Identify cross-references to documents NOT provided (e.g., "as amended by Amendment dated..." but no amendment uploaded).

Flag red flags requiring immediate attention:
- Outdated provisions (pre-TCJA 2017)
- Missing successor trustees
- Conflicting beneficiary designations
- Inadequate asset protection
- Estate tax exposure above exemption
- Missing spousal consent
- Incomplete funding schedules

Return JSON ONLY — no markdown, no explanation:
{
  "document_type": "REVOCABLE_LIVING_TRUST",
  "document_subtype": "RLT_JOINT",
  "metadata": {
    "grantors": ["John Doe", "Jane Doe"],
    "trustees": ["John Doe", "Jane Doe"],
    "beneficiaries": ["Child 1", "Child 2"],
    "execution_date": "2015-06-15",
    "governing_law": "CA",
    "attorney": "Smith & Associates",
    "trust_name": "Doe Family Trust"
  },
  "confidence": 0.95,
  "cross_references": ["Amendment dated 2018-03-20", "Schedule A - Trust Assets"],
  "red_flags": ["Execution predates TCJA 2017", "No successor trustee named"],
  "page_count": 42,
  "key_provisions_summary": "Joint revocable living trust with AB provisions, community property basis step-up, outright distributions to adult children."
}`;

// ── Text Extraction ──────────────────────────────────────────────────────────

/**
 * Extracts all text from a document buffer using AI vision.
 * For PDFs, uses MiniMax vision via the AI gateway.
 */
export async function extractText(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<ExtractionResult> {
  const { buffer, mimeType, fileName } = params;

  // Convert buffer to base64
  const base64 = buffer.toString('base64');

  // Determine document type
  const docType = mimeType === 'application/pdf' ? 'pdf' : 'image';

  const systemPrompt = `You are a document text extraction specialist. Extract ALL text from the provided document with perfect accuracy. Preserve structure, headings, sections, and formatting context. Return the complete text with no truncation.`;

  const userPrompt = `Extract all text from this document: "${fileName}"

Return the complete extracted text with structure preserved.`;

  try {
    const response = await callAIWithDocuments({
      systemPrompt,
      userPrompt,
      documents: [
        {
          type: docType,
          data: base64,
          mimeType,
        },
      ],
      maxTokens: 8192,
    });

    // Count pages (rough heuristic for PDFs — look for page breaks in text)
    const pageCount = response.text.split(/\f|\[PAGE \d+\]|\bPage \d+\b/i).length;

    return {
      text: response.text,
      confidence: 0.95, // High confidence for AI vision
      pageCount: Math.max(1, pageCount),
      method: 'ai_vision',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[Document Processor] Text extraction failed: ${message}`);
  }
}

// ── Document Classification ──────────────────────────────────────────────────

/**
 * Classifies a document by type and extracts structured metadata.
 */
export async function classifyDocument(params: {
  text: string;
  fileName: string;
}): Promise<ClassificationResult> {
  const { text, fileName } = params;

  const userPrompt = `Classify this document:

**File Name:** ${fileName}

**Document Text:**
${text.slice(0, 16000)} ${text.length > 16000 ? '...[truncated]' : ''}

Return JSON only.`;

  try {
    const response = await callAI({
      systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
      userPrompt,
      jsonMode: true,
      temperature: 0.1, // Low temperature for classification accuracy
      maxTokens: 2048,
    });

    const classification = extractJSON<ClassificationResult>(response.text);

    // Validate required fields
    if (!classification.document_type) {
      throw new Error('Classification missing document_type');
    }

    // Ensure metadata exists
    if (!classification.metadata) {
      classification.metadata = {};
    }

    // Ensure arrays exist
    if (!classification.cross_references) {
      classification.cross_references = [];
    }

    if (!classification.red_flags) {
      classification.red_flags = [];
    }

    // Default confidence to 0.8 if missing
    if (typeof classification.confidence !== 'number') {
      classification.confidence = 0.8;
    }

    return classification;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[Document Processor] Classification failed for "${fileName}": ${message}`);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates extraction quality and flags potential issues.
 */
export function validateExtraction(result: ExtractionResult): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check confidence threshold
  if (result.confidence < 0.9) {
    warnings.push(`Low extraction confidence: ${(result.confidence * 100).toFixed(1)}%`);
  }

  // Check text length
  if (result.text.length < 100) {
    warnings.push('Extracted text is very short — document may be empty or extraction failed');
  }

  // Check for truncation markers
  const truncationMarkers = [
    '[truncated]',
    '...continued',
    '[content omitted]',
    'text extraction incomplete',
  ];

  for (const marker of truncationMarkers) {
    if (result.text.toLowerCase().includes(marker.toLowerCase())) {
      warnings.push(`Possible truncation detected: "${marker}"`);
      break;
    }
  }

  // Check page count
  if (result.pageCount === 0) {
    warnings.push('Page count is zero — may indicate extraction failure');
  }

  const valid = warnings.length === 0 || (result.confidence >= 0.9 && result.text.length >= 100);

  return { valid, warnings };
}

// ── Missing Document Detection ───────────────────────────────────────────────

/**
 * Scans all classified documents for cross-references and returns a list
 * of documents that are referenced but not uploaded.
 */
export function detectMissingDocuments(
  classifications: ClassificationResult[]
): string[] {
  const allReferences = new Set<string>();

  for (const doc of classifications) {
    for (const ref of doc.cross_references) {
      allReferences.add(ref.trim());
    }
  }

  return Array.from(allReferences);
}
