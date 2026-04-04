/**
 * Enterprise Compliance Monitoring
 * CCO dashboard and FINRA 17a-4 compliance audit trail
 */

import { randomUUID } from 'crypto';

export type ComplianceEventType =
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_MODIFIED'
  | 'RISK_OVERRIDE'
  | 'MODEL_CHANGED'
  | 'CLIENT_SUITABILITY_CHANGE'
  | 'DOCUMENT_GENERATED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED';

export type SuitabilitySeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ComplianceEvent {
  eventId: string;
  eventType: ComplianceEventType;
  proposalId?: string;
  advisorId: string;
  clientId?: string;
  details: Record<string, unknown>;
  timestamp: string;
  retentionExpiresAt: string; // FINRA 17a-4 requires 6-year retention
}

export interface ComplianceReport {
  reportId: string;
  period: {
    start: string;
    end: string;
  };
  totalEvents: number;
  proposalsCreated: number;
  proposalsSent: number;
  riskOverrides: number;
  suitabilityIssues: number;
  averageResponseTime: number; // milliseconds from create to send
  complianceScore: number; // 0-100
  flaggedItems: Array<{
    eventId: string;
    reason: string;
    severity: SuitabilitySeverity;
  }>;
}

export interface SuitabilityCheck {
  suitable: boolean;
  riskGap: number; // positive = proposal riskier than profile
  warnings: string[];
  requiresOverride: boolean;
}

// In-memory compliance event log (FINRA 17a-4 compliant retention)
const complianceLog: ComplianceEvent[] = [];

// FINRA 17a-4 requires 6-year retention for client communications and recommendations
const RETENTION_YEARS = 6;

/**
 * Log a compliance event with automatic FINRA 17a-4 retention calculation
 * @param event - Event details (eventId, timestamp, retentionExpiresAt auto-computed)
 * @returns Logged compliance event
 */
export function logComplianceEvent(
  event: Omit<ComplianceEvent, 'eventId' | 'timestamp' | 'retentionExpiresAt'>
): ComplianceEvent {
  if (!event.advisorId?.trim()) {
    throw new Error('advisorId required for all compliance events');
  }

  const timestamp = new Date();
  const retentionExpiresAt = new Date(timestamp);
  retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + RETENTION_YEARS);

  const completeEvent: ComplianceEvent = {
    eventId: randomUUID(),
    timestamp: timestamp.toISOString(),
    retentionExpiresAt: retentionExpiresAt.toISOString(),
    ...event,
  };

  complianceLog.push(completeEvent);
  return completeEvent;
}

/**
 * Retrieve compliance log with optional filters
 * @param filters - Optional filters for advisorId, clientId, eventType, date range
 * @returns Filtered compliance events sorted by timestamp (newest first)
 */
export function getComplianceLog(filters?: {
  advisorId?: string;
  clientId?: string;
  eventType?: ComplianceEventType;
  startDate?: string;
  endDate?: string;
}): ComplianceEvent[] {
  let filtered = [...complianceLog];

  if (filters?.advisorId) {
    filtered = filtered.filter(e => e.advisorId === filters.advisorId);
  }

  if (filters?.clientId) {
    filtered = filtered.filter(e => e.clientId === filters.clientId);
  }

  if (filters?.eventType) {
    filtered = filtered.filter(e => e.eventType === filters.eventType);
  }

  if (filters?.startDate) {
    const start = new Date(filters.startDate);
    filtered = filtered.filter(e => new Date(e.timestamp) >= start);
  }

  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    filtered = filtered.filter(e => new Date(e.timestamp) <= end);
  }

  return filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Generate compliance report for CCO dashboard
 * @param params - Report parameters (date range, optional advisorId)
 * @returns Comprehensive compliance report with KPIs and flagged items
 */
export function generateComplianceReport(params: {
  startDate: string;
  endDate: string;
  advisorId?: string;
}): ComplianceReport {
  const events = getComplianceLog({
    advisorId: params.advisorId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const proposalsCreated = events.filter(
    e => e.eventType === 'PROPOSAL_CREATED'
  ).length;
  const proposalsSent = events.filter(
    e => e.eventType === 'PROPOSAL_SENT'
  ).length;
  const riskOverrides = events.filter(
    e => e.eventType === 'RISK_OVERRIDE'
  ).length;
  const suitabilityIssues = events.filter(
    e => e.eventType === 'CLIENT_SUITABILITY_CHANGE'
  ).length;

  // Calculate average response time (create to send)
  const createEvents = events.filter(e => e.eventType === 'PROPOSAL_CREATED');
  const sendEvents = events.filter(e => e.eventType === 'PROPOSAL_SENT');

  let totalResponseTime = 0;
  let responseCounts = 0;

  for (const create of createEvents) {
    if (!create.proposalId) continue;
    const sent = sendEvents.find(s => s.proposalId === create.proposalId);
    if (sent) {
      const responseTime =
        new Date(sent.timestamp).getTime() -
        new Date(create.timestamp).getTime();
      totalResponseTime += responseTime;
      responseCounts++;
    }
  }

  const averageResponseTime =
    responseCounts > 0 ? totalResponseTime / responseCounts : 0;

  // Compliance score calculation (100 - deductions)
  let complianceScore = 100;

  // Deduct for excessive risk overrides (threshold: >5% of proposals)
  if (proposalsSent > 0 && riskOverrides / proposalsSent > 0.05) {
    complianceScore -= 15;
  }

  // Deduct for slow response times (threshold: >48h)
  const HOURS_48_MS = 48 * 60 * 60 * 1000;
  if (averageResponseTime > HOURS_48_MS) {
    complianceScore -= 10;
  }

  // Deduct for suitability issues
  if (suitabilityIssues > 0) {
    complianceScore -= Math.min(suitabilityIssues * 5, 25);
  }

  // Flag high-risk items
  const flaggedItems: ComplianceReport['flaggedItems'] = [];

  // Flag proposals with risk overrides
  const overrideEvents = events.filter(e => e.eventType === 'RISK_OVERRIDE');
  for (const override of overrideEvents) {
    flaggedItems.push({
      eventId: override.eventId,
      reason: 'Risk tolerance override applied',
      severity: 'HIGH',
    });
  }

  // Flag suitability changes
  const suitabilityEvents = events.filter(
    e => e.eventType === 'CLIENT_SUITABILITY_CHANGE'
  );
  for (const suitability of suitabilityEvents) {
    flaggedItems.push({
      eventId: suitability.eventId,
      reason: 'Client suitability profile changed',
      severity: 'MEDIUM',
    });
  }

  // Flag proposals created but not sent within 7 days
  const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  for (const create of createEvents) {
    if (!create.proposalId) continue;
    const sent = sendEvents.find(s => s.proposalId === create.proposalId);
    if (!sent && now - new Date(create.timestamp).getTime() > DAYS_7_MS) {
      flaggedItems.push({
        eventId: create.eventId,
        reason: 'Proposal created but not sent within 7 days',
        severity: 'LOW',
      });
    }
  }

  return {
    reportId: randomUUID(),
    period: {
      start: params.startDate,
      end: params.endDate,
    },
    totalEvents: events.length,
    proposalsCreated,
    proposalsSent,
    riskOverrides,
    suitabilityIssues,
    averageResponseTime,
    complianceScore: Math.max(0, complianceScore),
    flaggedItems,
  };
}

/**
 * Check client suitability for a proposed model
 * @param params - Client risk score, proposed model risk, assets in scope
 * @returns Suitability determination with warnings and override requirement
 */
export function checkSuitability(params: {
  clientRiskScore: number; // 1-10 scale (1=conservative, 10=aggressive)
  proposedModelRisk: number; // 1-10 scale
  assetsInScope: number; // dollar amount
}): SuitabilityCheck {
  const { clientRiskScore, proposedModelRisk, assetsInScope } = params;

  if (clientRiskScore < 1 || clientRiskScore > 10) {
    throw new Error('clientRiskScore must be between 1 and 10');
  }
  if (proposedModelRisk < 1 || proposedModelRisk > 10) {
    throw new Error('proposedModelRisk must be between 1 and 10');
  }
  if (assetsInScope < 0) {
    throw new Error('assetsInScope must be non-negative');
  }

  const riskGap = proposedModelRisk - clientRiskScore;
  const warnings: string[] = [];
  let requiresOverride = false;

  // Rule 1: Proposal must not exceed client risk tolerance by more than 1 point
  if (riskGap > 1) {
    warnings.push(
      `Proposed model risk (${proposedModelRisk}) exceeds client risk tolerance (${clientRiskScore}) by ${riskGap.toFixed(1)} points.`
    );
    requiresOverride = true;
  }

  // Rule 2: Conservative clients (1-3) cannot be placed in aggressive models (8-10)
  if (clientRiskScore <= 3 && proposedModelRisk >= 8) {
    warnings.push(
      'Conservative client cannot be placed in aggressive model without documented justification.'
    );
    requiresOverride = true;
  }

  // Rule 3: Large accounts (>$1M) require additional review if risk gap > 0.5
  if (assetsInScope > 1_000_000 && Math.abs(riskGap) > 0.5) {
    warnings.push(
      'Accounts over $1M with risk gap >0.5 require compliance review.'
    );
    if (!requiresOverride && Math.abs(riskGap) > 1) {
      requiresOverride = true;
    }
  }

  // Rule 4: Aggressive proposals (9-10) require enhanced documentation
  if (proposedModelRisk >= 9) {
    warnings.push(
      'Aggressive model (risk 9-10) requires enhanced client acknowledgment.'
    );
  }

  const suitable =
    riskGap <= 1 &&
    !(clientRiskScore <= 3 && proposedModelRisk >= 8) &&
    !requiresOverride;

  return {
    suitable,
    riskGap,
    warnings,
    requiresOverride,
  };
}

/**
 * Purge events beyond FINRA retention period (for testing/admin)
 * @returns Number of events purged
 */
export function purgeExpiredEvents(): number {
  const now = new Date();
  const beforeLength = complianceLog.length;

  const retained = complianceLog.filter(
    e => new Date(e.retentionExpiresAt) > now
  );

  complianceLog.length = 0;
  complianceLog.push(...retained);

  return beforeLength - complianceLog.length;
}

/**
 * Get compliance statistics for a given advisor
 * @param advisorId - Advisor to analyze
 * @param days - Number of days to look back (default 30)
 * @returns Compliance metrics for the advisor
 */
export function getAdvisorComplianceStats(
  advisorId: string,
  days: number = 30
): {
  totalProposals: number;
  riskOverrides: number;
  overrideRate: number;
  averageResponseTimeHours: number;
  complianceScore: number;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const report = generateComplianceReport({
    advisorId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const overrideRate =
    report.proposalsSent > 0
      ? (report.riskOverrides / report.proposalsSent) * 100
      : 0;

  const averageResponseTimeHours = report.averageResponseTime / (1000 * 60 * 60);

  return {
    totalProposals: report.proposalsSent,
    riskOverrides: report.riskOverrides,
    overrideRate,
    averageResponseTimeHours,
    complianceScore: report.complianceScore,
  };
}
