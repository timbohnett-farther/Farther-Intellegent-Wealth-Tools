// =============================================================================
// Rollover Engine — Report Service
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import type { RolloverReport } from '../types';
import { renderPDF } from './pdf-renderer';

/**
 * Generates a PDF report for a scored and narrated analysis.
 */
export async function generateReport(
  analysisId: string,
  auth: AuthContext,
  ip?: string,
): Promise<RolloverReport> {
  if (!hasPermission(auth.role, 'rollover:export')) {
    throw new Error('Authorization denied: role does not have rollover:export permission.');
  }

  const analysis = store.getRolloverAnalysis(analysisId);
  if (!analysis) throw new Error(`Rollover analysis not found: ${analysisId}`);
  if (analysis.firm_id !== auth.firmId) throw new Error(`Rollover analysis not found: ${analysisId}`);

  const score = store.getRolloverScoreByAnalysis(analysisId);
  if (!score) throw new Error('Analysis must be scored before generating a report.');

  const narrative = store.getRolloverNarrativeByAnalysis(analysisId);
  if (!narrative) throw new Error('Narrative must be generated before generating a report.');

  const plan = store.getRolloverPlan(analysis.plan_id);
  if (!plan) throw new Error(`Associated plan not found: ${analysis.plan_id}`);

  // Count existing reports for versioning
  const existingReports = store.listRolloverReports(analysisId);
  const version = existingReports.length + 1;

  // Generate PDF
  const pdf = await renderPDF({ analysis, score, narrative, plan });

  const now = new Date().toISOString();
  const reportId = `rr-${crypto.randomUUID().slice(0, 8)}`;

  const report: RolloverReport = {
    report_id: reportId,
    analysis_id: analysisId,
    format: 'PDF',
    version,
    filename: pdf.filename,
    file_size_bytes: pdf.size_bytes,
    sections: pdf.sections,
    generated_at: now,
    generated_by: auth.userId,
    download_url: `/api/v1/rollover/analyses/${analysisId}/report?download=true`,
  };

  store.upsertRolloverReport(report);

  // Update analysis
  store.upsertRolloverAnalysis({
    ...analysis,
    report_id: reportId,
    status: analysis.status === 'NARRATIVE_GENERATION' ? 'REVIEW' : analysis.status,
    updated_at: now,
    last_modified_by: auth.userId,
  });

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.report.generated',
    ip,
    payload: { analysisId, reportId, version, format: 'PDF' },
  });

  return report;
}

/**
 * Gets reports for an analysis.
 */
export function getReports(
  analysisId: string,
  auth: AuthContext,
): RolloverReport[] {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }
  return store.listRolloverReports(analysisId);
}
