/**
 * Debt Statement Upload API
 *
 * Accepts PDF/image uploads of debt statements (mortgage, credit card, loans)
 * and uses MiniMax 2.7 to extract debt details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/lib/document-processing/minimax-processor';

export type DebtType = 'mortgage' | 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan';

interface MortgageData {
  property: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  escrowAmount?: number;
  remainingTerm?: number;
  originalAmount?: number;
  loanType?: string;
  statementDate?: string;
}

interface CreditCardData {
  issuer: string;
  last4: string;
  balance: number;
  creditLimit: number;
  apr: number;
  minimumPayment: number;
  dueDate: string;
  statementDate?: string;
  availableCredit?: number;
}

interface LoanData {
  lender: string;
  loanType: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  remainingTerm?: number;
  originalAmount?: number;
  statementDate?: string;
}

interface StatementUploadResponse {
  success: boolean;
  debtType: DebtType;
  data?: MortgageData | CreditCardData | LoanData;
  rawText?: string;
  confidence?: number;
  processingTimeMs?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const debtType = formData.get('debtType') as DebtType;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!debtType || !['mortgage', 'credit_card', 'auto_loan', 'student_loan', 'personal_loan'].includes(debtType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid debt type. Must be: mortgage, credit_card, auto_loan, student_loan, or personal_loan.' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Must be PDF, JPG, PNG, or TIFF.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`[Debt Statement Upload] Processing ${debtType} statement: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Map debt type to document processor type
    const documentType =
      debtType === 'mortgage' ? 'mortgage_statement' :
      debtType === 'credit_card' ? 'credit_card_statement' :
      'loan_statement'; // auto_loan, student_loan, personal_loan

    // Process with MiniMax 2.7
    const processingResult = await processDocument({
      documentType: documentType,
      fileBuffer: fileBuffer,
      mimeType: file.type,
    });

    if (!processingResult.success) {
      console.error('[Debt Statement Upload] Processing failed:', processingResult);
      return NextResponse.json(
        { success: false, error: 'Failed to process statement. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[Debt Statement Upload] Processing successful (confidence: ${processingResult.confidence}, time: ${processingResult.processingTimeMs}ms)`);

    const extractedData = processingResult.extractedData;

    // Type-specific validation and normalization
    let normalizedData: MortgageData | CreditCardData | LoanData;

    if (debtType === 'mortgage') {
      // Validate required fields for mortgage
      if (!extractedData.property || !extractedData.lender || !extractedData.balance) {
        console.warn('[Debt Statement Upload] Missing required mortgage fields:', extractedData);
        return NextResponse.json(
          {
            success: false,
            error: 'Could not extract required mortgage fields. Please check the document quality.',
            confidence: processingResult.confidence,
          },
          { status: 422 }
        );
      }

      normalizedData = {
        property: extractedData.property,
        lender: extractedData.lender,
        balance: normalizeNumber(extractedData.balance),
        interestRate: normalizeNumber(extractedData.interestRate || extractedData.rate),
        monthlyPayment: normalizeNumber(extractedData.monthlyPayment || extractedData.payment),
        escrowAmount: extractedData.escrowAmount ? normalizeNumber(extractedData.escrowAmount) : undefined,
        remainingTerm: extractedData.remainingTerm ? parseInt(String(extractedData.remainingTerm)) : undefined,
        originalAmount: extractedData.originalAmount ? normalizeNumber(extractedData.originalAmount) : undefined,
        loanType: extractedData.loanType,
        statementDate: extractedData.statementDate || new Date().toISOString().split('T')[0],
      };
    } else if (debtType === 'credit_card') {
      // Validate required fields for credit card
      if (!extractedData.issuer || !extractedData.balance) {
        console.warn('[Debt Statement Upload] Missing required credit card fields:', extractedData);
        return NextResponse.json(
          {
            success: false,
            error: 'Could not extract required credit card fields. Please check the document quality.',
            confidence: processingResult.confidence,
          },
          { status: 422 }
        );
      }

      normalizedData = {
        issuer: extractedData.issuer,
        last4: extractedData.last4 || extractedData.accountNumber?.slice(-4) || 'XXXX',
        balance: normalizeNumber(extractedData.balance),
        creditLimit: normalizeNumber(extractedData.creditLimit || extractedData.limit),
        apr: normalizeNumber(extractedData.apr || extractedData.interestRate || extractedData.rate),
        minimumPayment: normalizeNumber(extractedData.minimumPayment || extractedData.minPayment),
        dueDate: extractedData.dueDate || '',
        statementDate: extractedData.statementDate || new Date().toISOString().split('T')[0],
        availableCredit: extractedData.availableCredit ? normalizeNumber(extractedData.availableCredit) : undefined,
      };
    } else {
      // Loan (auto, student, personal)
      if (!extractedData.lender || !extractedData.balance) {
        console.warn('[Debt Statement Upload] Missing required loan fields:', extractedData);
        return NextResponse.json(
          {
            success: false,
            error: 'Could not extract required loan fields. Please check the document quality.',
            confidence: processingResult.confidence,
          },
          { status: 422 }
        );
      }

      normalizedData = {
        lender: extractedData.lender,
        loanType: extractedData.loanType || debtType.replace('_', ' '),
        balance: normalizeNumber(extractedData.balance),
        interestRate: normalizeNumber(extractedData.interestRate || extractedData.rate),
        monthlyPayment: normalizeNumber(extractedData.monthlyPayment || extractedData.payment),
        remainingTerm: extractedData.remainingTerm ? parseInt(String(extractedData.remainingTerm)) : undefined,
        originalAmount: extractedData.originalAmount ? normalizeNumber(extractedData.originalAmount) : undefined,
        statementDate: extractedData.statementDate || new Date().toISOString().split('T')[0],
      };
    }

    // Build response
    const response: StatementUploadResponse = {
      success: true,
      debtType: debtType,
      data: normalizedData,
      rawText: processingResult.rawText,
      confidence: processingResult.confidence,
      processingTimeMs: processingResult.processingTimeMs,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Debt Statement Upload] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Normalize a value to a number, handling strings with currency symbols and commas
 */
function normalizeNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^0-9.-]/g, ''));
  }
  return 0;
}
