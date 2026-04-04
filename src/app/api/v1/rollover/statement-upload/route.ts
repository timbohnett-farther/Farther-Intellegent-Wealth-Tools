/**
 * 401(k) Statement Upload API
 *
 * Accepts PDF/image uploads of 401(k) statements and uses MiniMax 2.7
 * to extract account details, holdings, and fees.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/lib/document-processing/minimax-processor';

interface StatementUploadResponse {
  success: boolean;
  data?: {
    accountNumber: string;
    custodian: string;
    statementDate: string;
    balance: number;
    contributions?: {
      employee: number;
      employer: number;
      yearToDate: number;
    };
    holdings?: Array<{
      fundName: string;
      ticker: string;
      shares: number;
      value: number;
      allocationPercent: number;
    }>;
    fees?: {
      managementFee: number;
      expenseRatio: number;
      annualFees: number;
    };
  };
  rawText?: string;
  confidence?: number;
  error?: string;
  processingTimeMs?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
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

    console.log(`[Statement Upload] Processing 401(k) statement: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Process with MiniMax 2.7
    const processingResult = await processDocument({
      documentType: '401k_statement',
      fileBuffer: fileBuffer,
      mimeType: file.type,
    });

    if (!processingResult.success) {
      console.error('[Statement Upload] Processing failed:', processingResult);
      return NextResponse.json(
        { success: false, error: 'Failed to process statement. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[Statement Upload] Processing successful (confidence: ${processingResult.confidence}, time: ${processingResult.processingTimeMs}ms)`);

    // Extract and validate data
    const extractedData = processingResult.extractedData;

    // Validate required fields
    if (!extractedData.accountNumber || !extractedData.custodian || !extractedData.balance) {
      console.warn('[Statement Upload] Missing required fields:', extractedData);
      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract required fields from statement. Please check the document quality.',
          confidence: processingResult.confidence,
        },
        { status: 422 }
      );
    }

    // Normalize balance to number
    const balance = typeof extractedData.balance === 'string'
      ? parseFloat(extractedData.balance.replace(/[^0-9.-]/g, ''))
      : extractedData.balance;

    // Build response
    const response: StatementUploadResponse = {
      success: true,
      data: {
        accountNumber: extractedData.accountNumber,
        custodian: extractedData.custodian,
        statementDate: extractedData.statementDate || new Date().toISOString().split('T')[0],
        balance: balance,
        contributions: extractedData.contributions,
        holdings: extractedData.holdings,
        fees: extractedData.fees,
      },
      rawText: processingResult.rawText,
      confidence: processingResult.confidence,
      processingTimeMs: processingResult.processingTimeMs,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Statement Upload] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
