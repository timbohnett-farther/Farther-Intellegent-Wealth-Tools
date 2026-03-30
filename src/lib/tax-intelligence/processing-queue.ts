/**
 * Processing Queue Service — Phase 2 Sprint 1
 *
 * Manages document processing pipeline:
 * uploaded → queued → processing → ocr_complete → classified →
 * fields_extracted → needs_review → approved/rejected/failed
 *
 * Handles:
 * - Queue initialization
 * - Status transitions
 * - Error handling and retry logic
 * - Progress tracking
 */

import { prisma } from '@/lib/prisma';

export type ProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'ocr_complete'
  | 'classified'
  | 'fields_extracted'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'failed';

export interface QueueItem {
  documentId: string;
  householdId: string;
  status: ProcessingStatus;
  currentStep: string;
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusTransition {
  documentId: string;
  from: ProcessingStatus;
  to: ProcessingStatus;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Initialize document in processing queue
 */
export async function initializeInQueue(documentId: string): Promise<boolean> {
  try {
    await prisma.taxDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: 'queued',
        updatedAt: new Date(),
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'TaxDocument',
        entityId: documentId,
        documentId,
        action: 'queued',
        actor: 'system',
        actorType: 'system',
        metadata: JSON.stringify({ step: 'queue_initialization' }),
      },
    });

    return true;
  } catch (error) {
    console.error('Queue initialization error:', error);
    return false;
  }
}

/**
 * Transition document to new processing status
 */
export async function transitionStatus(transition: StatusTransition): Promise<boolean> {
  try {
    const { documentId, from, to, reason, metadata } = transition;

    // Verify current status matches expected 'from' status
    const document = await prisma.taxDocument.findUnique({
      where: { id: documentId },
      select: { processingStatus: true },
    });

    if (!document) {
      console.error(`Document ${documentId} not found`);
      return false;
    }

    if (document.processingStatus !== from) {
      console.warn(
        `Status mismatch: expected ${from}, got ${document.processingStatus}`
      );
      // Continue anyway - might be a retry scenario
    }

    // Update status
    await prisma.taxDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: to,
        updatedAt: new Date(),
        // Clear error if moving to non-failed status
        ...(to !== 'failed' && { processingError: null }),
      },
    });

    // Log transition
    await prisma.auditLog.create({
      data: {
        entityType: 'TaxDocument',
        entityId: documentId,
        documentId,
        action: 'status_transition',
        actor: 'system',
        actorType: 'system',
        changesBefore: JSON.stringify({ status: from }),
        changesAfter: JSON.stringify({ status: to }),
        metadata: JSON.stringify({
          reason,
          ...metadata,
        }),
      },
    });

    return true;
  } catch (error) {
    console.error('Status transition error:', error);
    return false;
  }
}

/**
 * Mark document as failed with error details
 */
export async function markAsFailed(
  documentId: string,
  error: string,
  allowRetry: boolean = true
): Promise<boolean> {
  try {
    const document = await prisma.taxDocument.findUnique({
      where: { id: documentId },
      select: { retryCount: true },
    });

    if (!document) {
      return false;
    }

    const maxRetries = 3;
    const shouldRetry = allowRetry && document.retryCount < maxRetries;

    await prisma.taxDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: shouldRetry ? 'queued' : 'failed',
        processingError: error,
        retryCount: document.retryCount + 1,
        lastRetryAt: shouldRetry ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    // Log failure
    await prisma.auditLog.create({
      data: {
        entityType: 'TaxDocument',
        entityId: documentId,
        documentId,
        action: shouldRetry ? 'retry_queued' : 'failed',
        actor: 'system',
        actorType: 'system',
        metadata: JSON.stringify({
          error,
          retryCount: document.retryCount + 1,
          maxRetries,
          willRetry: shouldRetry,
        }),
      },
    });

    return true;
  } catch (error) {
    console.error('Mark as failed error:', error);
    return false;
  }
}

/**
 * Get processing queue for household
 */
export async function getHouseholdQueue(householdId: string): Promise<QueueItem[]> {
  try {
    const documents = await prisma.taxDocument.findMany({
      where: {
        householdId,
        processingStatus: {
          in: ['queued', 'processing', 'ocr_complete', 'classified', 'fields_extracted'],
        },
      },
      select: {
        id: true,
        householdId: true,
        processingStatus: true,
        processingError: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return documents.map((doc: { id: string; householdId: string; processingStatus: string; processingError: string | null; createdAt: Date; updatedAt: Date }) => ({
      documentId: doc.id,
      householdId: doc.householdId,
      status: doc.processingStatus as ProcessingStatus,
      currentStep: getStepDescription(doc.processingStatus as ProcessingStatus),
      progress: calculateProgress(doc.processingStatus as ProcessingStatus),
      error: doc.processingError || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  } catch (error) {
    console.error('Get household queue error:', error);
    return [];
  }
}

/**
 * Get human-readable step description
 */
function getStepDescription(status: ProcessingStatus): string {
  const descriptions: Record<ProcessingStatus, string> = {
    uploaded: 'Uploaded',
    queued: 'Waiting in queue',
    processing: 'Processing document',
    ocr_complete: 'OCR extraction complete',
    classified: 'Document classified',
    fields_extracted: 'Fields extracted',
    needs_review: 'Ready for review',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Processing failed',
  };
  return descriptions[status] || status;
}

/**
 * Calculate progress percentage based on status
 */
function calculateProgress(status: ProcessingStatus): number {
  const progressMap: Record<ProcessingStatus, number> = {
    uploaded: 10,
    queued: 20,
    processing: 40,
    ocr_complete: 60,
    classified: 70,
    fields_extracted: 85,
    needs_review: 95,
    approved: 100,
    rejected: 100,
    failed: 0,
  };
  return progressMap[status] || 0;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(householdId?: string) {
  try {
    const where = householdId ? { householdId } : {};

    const stats = await prisma.taxDocument.groupBy({
      by: ['processingStatus'],
      where,
      _count: true,
    });

    return stats.reduce(
      (acc: Record<string, number>, stat: { processingStatus: string; _count: number }) => {
        acc[stat.processingStatus] = stat._count;
        return acc;
      },
      {} as Record<string, number>
    );
  } catch (error) {
    console.error('Get queue stats error:', error);
    return {};
  }
}
