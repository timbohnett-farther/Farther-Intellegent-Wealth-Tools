// =============================================================================
// Compliance Layer — Reg BI Document Generation & Verification
// =============================================================================

import type {
  RegBIDocumentation,
  RegBIRecommendation,
  RegBIInput,
  AuditEntry,
  ComplianceReport,
  ComplianceAlert,
} from './types';

// ==================== Simple SHA-256 Hash ====================

/**
 * A pure-TypeScript implementation of a SHA-256-like hash function.
 * This uses a deterministic string hashing algorithm suitable for
 * document integrity verification. NOT a cryptographic implementation;
 * use only for application-level integrity checks.
 */
function simpleHash(input: string): string {
  // Initialize hash values (first 32 bits of the fractional parts of the
  // square roots of the first 8 primes)
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h0 = (h0 ^ ch) * 0x01000193;
    h1 = (h1 ^ (ch >>> 1)) * 0x01000193;
    h2 = (h2 ^ (ch << 1)) * 0x01000193;
    h3 = (h3 ^ (ch + i)) * 0x01000193;
    h4 = (h4 ^ (ch ^ i)) * 0x01000193;
    h5 = (h5 ^ ((ch + i) >>> 2)) * 0x01000193;
    h6 = (h6 ^ ((ch * (i + 1)) & 0xff)) * 0x01000193;
    h7 = (h7 ^ ((ch ^ (i * 7)) & 0xffff)) * 0x01000193;
  }

  // Convert to hex
  const toHex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0');
  return (
    toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) +
    toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)
  );
}

/**
 * Serializes the content fields of a RegBIDocumentation for hashing.
 * Excludes the `locked` and `lockHash` fields so the hash is stable.
 */
function serializeDocumentContent(doc: RegBIDocumentation): string {
  const content = {
    planId: doc.planId,
    documentationDate: doc.documentationDate instanceof Date
      ? doc.documentationDate.toISOString()
      : String(doc.documentationDate),
    advisorId: doc.advisorId,
    clientId: doc.clientId,
    clientProfile: doc.clientProfile,
    recommendations: doc.recommendations,
    conflictsDisclosed: doc.conflictsDisclosed,
    conflictDetails: doc.conflictDetails,
    clientAcknowledgedAt: doc.clientAcknowledgedAt instanceof Date
      ? doc.clientAcknowledgedAt.toISOString()
      : doc.clientAcknowledgedAt,
    deliveryMethod: doc.deliveryMethod,
  };
  return JSON.stringify(content, null, 0);
}

// ==================== Document Generation ====================

/**
 * Generates a complete Reg BI documentation package from plan data,
 * advisor information, and planning insights.
 *
 * Each insight is automatically converted into a Reg BI recommendation
 * with reasonable basis, alternatives considered, costs, and conflicts.
 *
 * @param input - Plan data, insights, advisor info, and conflict disclosures.
 * @returns A fully populated (but unlocked) RegBIDocumentation object.
 */
export function generateRegBIDocument(input: RegBIInput): RegBIDocumentation {
  const recommendations: RegBIRecommendation[] = input.insights.map(
    (insight) => ({
      type: insight.type,
      description: `${insight.title}: ${insight.description}`,
      reasonableBasis: insight.rationale,
      alternativesConsidered: insight.alternatives.length > 0
        ? insight.alternatives
        : ['No alternatives considered — recommendation is the only suitable option given client profile.'],
      costsAndFees: insight.costs || 'No additional costs or fees associated with this recommendation.',
      conflictsOfInterest: insight.conflicts || 'No conflicts of interest identified.',
      clientBenefit: insight.benefit,
    })
  );

  const doc: RegBIDocumentation = {
    planId: input.planId,
    documentationDate: new Date(),
    advisorId: input.advisorId,
    clientId: input.clientId,
    clientProfile: {
      name: input.clientName,
      age: input.clientAge,
      riskTolerance: input.riskTolerance,
      investmentObjective: input.investmentObjective,
      timeHorizon: input.timeHorizon,
      liquidityNeeds: input.liquidityNeeds,
      financialSituation: input.financialSituation,
      taxStatus: input.taxStatus,
      otherInvestments: input.otherInvestments,
    },
    recommendations,
    conflictsDisclosed: input.conflicts.length > 0,
    conflictDetails: input.conflicts,
    clientAcknowledgedAt: null,
    deliveryMethod: input.deliveryMethod,
    locked: false,
    lockHash: null,
  };

  return doc;
}

// ==================== Document Locking ====================

/**
 * Locks a Reg BI document, making it immutable and computing
 * a SHA-256-like hash of its contents for integrity verification.
 *
 * @param doc - The document to lock. Must not already be locked.
 * @returns A new RegBIDocumentation object with `locked=true` and `lockHash` set.
 * @throws Error if the document is already locked.
 */
export function lockDocument(doc: RegBIDocumentation): RegBIDocumentation {
  if (doc.locked) {
    throw new Error('Document is already locked and cannot be modified.');
  }

  const contentToHash = serializeDocumentContent(doc);
  const hash = simpleHash(contentToHash);

  return {
    ...doc,
    locked: true,
    lockHash: hash,
  };
}

// ==================== Integrity Verification ====================

/**
 * Verifies that a locked Reg BI document has not been tampered with
 * by recomputing the hash and comparing it to the stored lockHash.
 *
 * @param doc - The document to verify.
 * @returns `true` if the document is locked and the hash matches; `false` otherwise.
 */
export function verifyDocumentIntegrity(doc: RegBIDocumentation): boolean {
  if (!doc.locked || !doc.lockHash) {
    return false;
  }

  const contentToHash = serializeDocumentContent(doc);
  const computedHash = simpleHash(contentToHash);

  return computedHash === doc.lockHash;
}

// ==================== Compliance Report Generation ====================

/**
 * Generates a compliance report from a set of audit entries within a
 * given time period. Includes action counts by actor type, recommendation
 * summaries, and compliance alerts.
 *
 * @param auditEntries - All available audit entries (will be filtered by period).
 * @param period - The start and end dates for the report.
 * @returns A ComplianceReport summarizing all activity in the period.
 */
export function generateComplianceReport(
  auditEntries: AuditEntry[],
  period: { start: Date; end: Date }
): ComplianceReport {
  // Filter entries to the specified period
  const periodEntries = auditEntries.filter((entry) => {
    const ts = entry.timestamp instanceof Date
      ? entry.timestamp
      : new Date(entry.timestamp);
    return ts >= period.start && ts <= period.end;
  });

  // Count actions by actor type
  let advisorActions = 0;
  let clientActions = 0;
  let systemActions = 0;

  for (const entry of periodEntries) {
    switch (entry.actorType) {
      case 'advisor':
        advisorActions++;
        break;
      case 'client':
        clientActions++;
        break;
      case 'system':
        systemActions++;
        break;
      case 'admin':
        advisorActions++; // Admin actions are counted with advisor actions
        break;
    }
  }

  // Aggregate recommendations by action type
  const recommendationCounts = new Map<string, number>();
  for (const entry of periodEntries) {
    if (entry.action.startsWith('recommend') || entry.action.includes('recommendation')) {
      const current = recommendationCounts.get(entry.action) ?? 0;
      recommendationCounts.set(entry.action, current + 1);
    }
  }
  const recommendations = Array.from(recommendationCounts.entries()).map(
    ([type, count]) => ({ type, count })
  );

  // Generate compliance alerts
  const alerts: ComplianceAlert[] = [];

  // Alert: high volume of delete actions
  const deleteActions = periodEntries.filter((e) => e.action.includes('delete'));
  if (deleteActions.length > 10) {
    alerts.push({
      severity: 'warning',
      message: `High volume of delete actions detected: ${deleteActions.length} deletions in the reporting period.`,
      resourceType: null,
      count: deleteActions.length,
    });
  }

  // Alert: actions without a session ID (potential automation without tracking)
  const noSessionActions = periodEntries.filter((e) => !e.sessionId);
  if (noSessionActions.length > 0) {
    alerts.push({
      severity: 'info',
      message: `${noSessionActions.length} action(s) recorded without a session ID.`,
      resourceType: null,
      count: noSessionActions.length,
    });
  }

  // Alert: after-hours activity (before 6 AM or after 10 PM)
  const afterHoursActions = periodEntries.filter((e) => {
    const ts = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
    const hour = ts.getUTCHours();
    return hour < 6 || hour >= 22;
  });
  if (afterHoursActions.length > 5) {
    alerts.push({
      severity: 'info',
      message: `${afterHoursActions.length} action(s) recorded outside standard business hours (UTC).`,
      resourceType: null,
      count: afterHoursActions.length,
    });
  }

  // Alert: plan modifications without corresponding Reg BI documentation
  const planModifications = periodEntries.filter(
    (e) => e.resourceType === 'plan' && (e.action === 'update' || e.action === 'recalculate')
  );
  const regBiDocCreations = periodEntries.filter(
    (e) => e.resourceType === 'document' && e.action === 'create_reg_bi'
  );
  if (planModifications.length > 0 && regBiDocCreations.length === 0) {
    alerts.push({
      severity: 'warning',
      message: `${planModifications.length} plan modification(s) detected without corresponding Reg BI documentation.`,
      resourceType: 'plan',
      count: planModifications.length,
    });
  }

  // Determine firmId from entries or default
  const firmId = periodEntries.length > 0 ? periodEntries[0].firmId : '';

  return {
    firmId,
    period,
    totalActions: periodEntries.length,
    advisorActions,
    clientActions,
    systemActions,
    recommendations,
    alerts,
  };
}
