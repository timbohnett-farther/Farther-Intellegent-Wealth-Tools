/**
 * Shared in-memory stores for estate analysis
 * Used across multiple route handlers
 */

import type { ClassificationResult, AgentFinding, AnalysisStatus } from '@/lib/estate-intelligence/types';
import type { EstateReport } from '@/lib/estate-intelligence/report-engine';

// ── Analysis Records ─────────────────────────────────────────────────────────

export interface AnalysisRecord {
  analysisId: string;
  clientName: string;
  advisorId?: string;
  firmId?: string;
  householdId?: string;
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
}

// Main analyses storage
export const analysesStore = new Map<string, AnalysisRecord>();

// In-memory document storage (per analysis)
export const documentsStore = new Map<
  string,
  Array<ClassificationResult & { id: string; fileName: string; extractedText: string }>
>();

// In-memory findings storage (per analysis)
export const findingsStore = new Map<string, AgentFinding[]>();

// In-memory report cache (per analysis)
export const reportsStore = new Map<string, EstateReport>();

// ── Helper Functions ─────────────────────────────────────────────────────────

export function updateAnalysisStatus(analysisId: string, status: AnalysisStatus) {
  const analysis = analysesStore.get(analysisId);
  if (analysis) {
    analysis.status = status;
    analysis.updatedAt = new Date().toISOString();
    analysesStore.set(analysisId, analysis);
  }
}

export function getAnalysis(analysisId: string): AnalysisRecord | undefined {
  return analysesStore.get(analysisId);
}

export function deleteAnalysis(analysisId: string): boolean {
  return analysesStore.delete(analysisId);
}
