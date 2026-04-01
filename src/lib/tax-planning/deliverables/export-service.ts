// =============================================================================
// Deliverables & Reporting Engine — Export Service
// =============================================================================
//
// Handles deliverable export operations. Creates export records with metadata
// and generates export payloads for different output formats.
// =============================================================================

import type { Deliverable, DeliverableExport, DeliverableExportType } from './types';
import { store } from '../store';
import { auditService } from '../audit';
import { randomUUID } from 'crypto';

// =====================================================================
// Export Creation
// =====================================================================

/**
 * Creates an export record for a deliverable.
 *
 * @param deliverableId - The deliverable ID to export.
 * @param exportType - The export format (pdf, docx, email_draft, crm_note, archive).
 * @param exportedBy - The user ID performing the export.
 * @param options - Optional export-specific metadata.
 * @returns The created export record.
 * @throws {Error} If deliverable not found.
 */
export function exportDeliverable(
  deliverableId: string,
  exportType: DeliverableExportType,
  exportedBy: string,
  options?: Record<string, unknown>
): DeliverableExport {
  const deliverable = store.getDeliverable(deliverableId);
  if (!deliverable) {
    throw new Error(`Deliverable "${deliverableId}" not found.`);
  }

  // Optional: Enforce approval requirement for certain export types
  // (Policy can be configured per deployment)
  const requiresApproval = ['pdf', 'docx', 'email_draft'].includes(exportType);
  if (requiresApproval && deliverable.status !== 'approved' && deliverable.status !== 'exported') {
    throw new Error(
      `Cannot export deliverable in status "${deliverable.status}". Export type "${exportType}" requires approval.`
    );
  }

  const now = new Date().toISOString();

  // Create export record
  const deliverableExport: DeliverableExport = {
    exportId: randomUUID(),
    deliverableId,
    exportType,
    exportedBy,
    exportedAt: now,
    exportMetadata: options ?? {},
  };

  store.upsertDeliverableExport(deliverableExport);

  // Transition deliverable to 'exported' if it's approved
  if (deliverable.status === 'approved') {
    const updated: Deliverable = {
      ...deliverable,
      status: 'exported',
      updatedAt: now,
    };
    store.upsertDeliverable(updated);
  }

  // Emit audit event
  auditService.emit({
    firmId: 'firm-001', // TODO: Extract from authContext
    userId: exportedBy,
    eventKey: 'deliverable.exported',
    payload: {
      deliverable_id: deliverableId,
      export_id: deliverableExport.exportId,
      export_type: exportType,
      household_id: deliverable.householdId,
      tax_year: deliverable.taxYear,
      deliverable_type: deliverable.deliverableType,
      options,
    },
  });

  return deliverableExport;
}

// =====================================================================
// Export Payload Generation
// =====================================================================

/**
 * Generates a structured export payload for a deliverable.
 * This payload can be consumed by renderers (PDF, DOCX, email templates, etc.).
 *
 * @param deliverable - The deliverable to export.
 * @param exportType - The export format.
 * @returns A structured export payload with metadata and content.
 */
export function generateExportPayload(
  deliverable: Deliverable,
  exportType: DeliverableExportType
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    meta: {
      deliverableId: deliverable.deliverableId,
      householdId: deliverable.householdId,
      taxYear: deliverable.taxYear,
      deliverableType: deliverable.deliverableType,
      audienceMode: deliverable.audienceMode,
      title: deliverable.title,
      templateId: deliverable.templateId,
      templateVersion: deliverable.templateVersion,
      version: deliverable.version,
      status: deliverable.status,
      approvedBy: deliverable.approvedBy,
      approvedAt: deliverable.approvedAt,
      createdAt: deliverable.createdAt,
      exportType,
      exportedAt: new Date().toISOString(),
    },
    sections: deliverable.sectionBlocks.map((block) => ({
      blockId: block.blockId,
      blockType: block.blockType,
      title: block.title,
      content: block.content,
      order: block.order,
    })),
  };

  // Add export-type-specific rendering hints
  switch (exportType) {
    case 'pdf':
      payload.renderHints = {
        pageOrientation: 'portrait',
        includeTableOfContents: true,
        includePageNumbers: true,
        headerText: deliverable.title,
      };
      break;
    case 'docx':
      payload.renderHints = {
        styleTemplate: 'farther_default',
        includeReviewComments: false,
      };
      break;
    case 'email_draft':
      payload.renderHints = {
        format: 'html',
        subjectLine: `${deliverable.title} — Tax Year ${deliverable.taxYear}`,
        includeAttachmentLinks: true,
      };
      break;
    case 'crm_note':
      payload.renderHints = {
        format: 'plain_text',
        maxLength: 10000,
        includeMetadata: true,
      };
      break;
    case 'archive':
      payload.renderHints = {
        includeSourceRefs: true,
        includeFullMetadata: true,
      };
      break;
  }

  return payload;
}

// =====================================================================
// Export History
// =====================================================================

/**
 * Retrieves the export history for a deliverable.
 *
 * @param deliverableId - The deliverable ID.
 * @returns An array of export records, sorted newest first.
 */
export function getExportHistory(deliverableId: string): DeliverableExport[] {
  return store.listDeliverableExports(deliverableId);
}

/**
 * Retrieves a single export record by ID.
 *
 * @param exportId - The export ID.
 * @returns The export record, or undefined if not found.
 */
export function getExport(exportId: string): DeliverableExport | undefined {
  return store.getDeliverableExport(exportId);
}
