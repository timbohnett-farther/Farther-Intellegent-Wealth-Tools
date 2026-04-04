/**
 * Upload API Route — Phase 2 Sprint 1
 *
 * Handles multi-file document uploads with:
 * - File validation (type, size)
 * - Duplicate detection (exact + likely)
 * - Storage to disk (S3-ready structure)
 * - Database record creation
 * - Processing queue initialization
 * - Full audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  validateFile,
  calculateFileHash,
  storeFile,
  type FileMetadata,
} from '@/lib/tax-intelligence/file-storage';
import { checkForDuplicates } from '@/lib/tax-intelligence/duplicate-detection';
import { initializeInQueue } from '@/lib/tax-intelligence/processing-queue';
import { processDocument, type DocumentType } from '@/lib/document-processing/minimax-processor';

interface UploadResult {
  documentId: string;
  filename: string;
  fileUrl: string;
  status: 'success' | 'duplicate' | 'error';
  duplicateWarning?: string;
  error?: string;
}

interface UploadResponse {
  success: boolean;
  results: UploadResult[];
  stats: {
    total: number;
    successful: number;
    duplicates: number;
    failed: number;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    // Extract metadata
    const householdId = formData.get('householdId') as string;
    const uploadedBy = formData.get('uploadedBy') as string;
    const taxYear = formData.get('taxYear') as string;
    const documentType = formData.get('documentType') as string;

    // Validation
    if (!householdId || !uploadedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: householdId, uploadedBy' },
        { status: 400 }
      );
    }

    // Verify household exists
    const household = await prisma.household.findUnique({
      where: { id: householdId },
    });

    if (!household) {
      return NextResponse.json(
        { success: false, error: `Household ${householdId} not found` },
        { status: 404 }
      );
    }

    // Extract files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 files per upload' },
        { status: 400 }
      );
    }

    // Process each file
    const results: UploadResult[] = [];
    const stats = {
      total: files.length,
      successful: 0,
      duplicates: 0,
      failed: 0,
    };

    for (const file of files) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Validate file
        const validation = validateFile(fileBuffer, file.type, file.size);
        if (!validation.valid) {
          results.push({
            documentId: '',
            filename: file.name,
            fileUrl: '',
            status: 'error',
            error: validation.error,
          });
          stats.failed++;
          continue;
        }

        // Calculate hash
        const fileHash = await calculateFileHash(fileBuffer);

        // Check for duplicates
        const duplicateCheck = await checkForDuplicates(
          householdId,
          file.name,
          fileHash,
          taxYear ? parseInt(taxYear) : undefined,
          documentType !== 'unknown' ? documentType : undefined
        );

        if (duplicateCheck.isDuplicate) {
          results.push({
            documentId: '',
            filename: file.name,
            fileUrl: '',
            status: 'duplicate',
            duplicateWarning: duplicateCheck.reason,
          });
          stats.duplicates++;
          continue;
        }

        // Generate document ID
        const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Store file
        const metadata: FileMetadata = {
          documentId,
          householdId,
          taxYear: taxYear ? parseInt(taxYear) : new Date().getFullYear(),
          originalFilename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        };

        const storageResult = await storeFile(fileBuffer, metadata);

        // Check storage succeeded
        if (!storageResult.success || !storageResult.fileUrl) {
          results.push({
            documentId: '',
            filename: file.name,
            fileUrl: '',
            status: 'error',
            error: storageResult.error || 'File storage failed',
          });
          stats.failed++;
          continue;
        }

        // Create TaxDocument record
        const document = await (prisma as any).taxDocument.create({
          data: {
            householdId,
            documentType: documentType !== 'unknown' ? documentType : 'unknown',
            taxYear: taxYear ? parseInt(taxYear) : new Date().getFullYear(),
            originalFilename: file.name,
            uploadedBy,
            fileUrl: storageResult.fileUrl,
            fileSize: file.size,
            contentType: file.type,
            fileHash,
            processingStatus: 'uploaded',
            hasTextLayer: false,
            retryCount: 0,
          },
        });

        // Initialize in processing queue
        await initializeInQueue(document.id);

        // Process document with MiniMax 2.7 AI
        try {
          console.log(`[Upload API] Processing document ${document.id} with MiniMax...`);

          // Determine document type for processor
          const processorDocType: DocumentType =
            documentType === 'form_1040' ? 'tax_return_1040' :
            documentType === 'schedule_d' ? 'tax_return_schedule_d' :
            documentType === 'w2' ? 'tax_return_w2' :
            'generic_financial';

          // Process with MiniMax
          const processingResult = await processDocument({
            documentType: processorDocType,
            fileBuffer: fileBuffer,
            mimeType: file.type,
          });

          if (processingResult.success) {
            console.log(`[Upload API] Document processed successfully (confidence: ${processingResult.confidence})`);

            // Store extracted data to DocumentPage
            await (prisma as any).documentPage.create({
              data: {
                documentId: document.id,
                pageNumber: 1,
                rawText: processingResult.rawText,
                textLayerJson: JSON.stringify(processingResult.extractedData),
                ocrConfidence: processingResult.confidence,
                processingTimeMs: processingResult.processingTimeMs,
              },
            });

            // Update document status to ocr_complete
            await (prisma as any).taxDocument.update({
              where: { id: document.id },
              data: {
                processingStatus: 'ocr_complete',
                hasTextLayer: true,
              },
            });

            console.log(`[Upload API] Document ${document.id} marked as ocr_complete`);
          } else {
            console.warn(`[Upload API] Document processing failed for ${document.id}`);

            // Update status to processing_failed
            await (prisma as any).taxDocument.update({
              where: { id: document.id },
              data: { processingStatus: 'processing_failed' },
            });
          }
        } catch (processingError) {
          console.error(`[Upload API] MiniMax processing error for ${document.id}:`, processingError);

          // Mark as processing_failed but don't fail the upload
          await (prisma as any).taxDocument.update({
            where: { id: document.id },
            data: { processingStatus: 'processing_failed' },
          });
        }

        // Create audit log
        await (prisma as any).auditLog.create({
          data: {
            entityType: 'TaxDocument',
            entityId: document.id,
            documentId: document.id,
            action: 'created',
            actor: uploadedBy,
            actorType: 'advisor',
            changesAfter: JSON.stringify({
              id: document.id,
              filename: file.name,
              taxYear: document.taxYear,
              documentType: document.documentType,
              fileSize: file.size,
              fileHash,
            }),
            metadata: JSON.stringify({
              uploadSource: 'web',
              userAgent: request.headers.get('user-agent'),
            }),
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        results.push({
          documentId: document.id,
          filename: file.name,
          fileUrl: storageResult.fileUrl,
          status: 'success',
        });
        stats.successful++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          documentId: '',
          filename: file.name,
          fileUrl: '',
          status: 'error',
          error: 'File processing failed',
        });
        stats.failed++;
      }
    }

    const response: UploadResponse = {
      success: stats.successful > 0,
      results,
      stats,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed. Please try again.',
      },
      { status: 500 }
    );
  }
}
