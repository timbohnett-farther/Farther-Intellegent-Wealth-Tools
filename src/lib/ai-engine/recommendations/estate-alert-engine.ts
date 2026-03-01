// ==================== ESTATE ALERT ENGINE ====================
// Generates estate planning alerts for document staleness, beneficiary reviews,
// exemption sunset concerns, and trust review needs.

import type {
  EstateAlertInput,
  EstateAlert,
  AlertSeverity,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function yearsSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function yearEnd(year: number): string {
  return `${year}-12-31`;
}

// ---------------------------------------------------------------------------
// Individual alert generators
// ---------------------------------------------------------------------------

/** Check if estate documents are stale and need review. */
function checkDocumentStaleness(input: EstateAlertInput): EstateAlert | null {
  const yearsSinceReview = yearsSince(input.documentsLastReviewed);

  if (yearsSinceReview < 3) return null;

  const severity: AlertSeverity = yearsSinceReview > 7 ? 'high'
    : yearsSinceReview > 5 ? 'medium'
    : 'low';

  const timeDesc = yearsSinceReview === Infinity
    ? 'have never been reviewed'
    : `were last reviewed over ${Math.floor(yearsSinceReview)} years ago`;

  return {
    alertType: 'estate_document_stale',
    severity,
    title: 'Estate Documents Need Review',
    description: `Estate planning documents ${timeDesc}. Changes in tax law, family circumstances, and asset ownership may have rendered existing documents outdated. With an estate valued at ${formatCurrency(input.grossEstateValue)}, proper documentation is critical.`,
    recommendedAction: 'Schedule a comprehensive estate document review with the estate planning attorney. Review will, trust(s), powers of attorney, and healthcare directives.',
    estimatedImpact: input.grossEstateValue * 0.02,
    deadline: null,
  };
}

/** Check if beneficiary designations need review. */
function checkBeneficiaryReview(input: EstateAlertInput): EstateAlert | null {
  const yearsSinceReview = yearsSince(input.beneficiaryLastReviewed);

  if (yearsSinceReview < 2) return null;

  const severity: AlertSeverity = yearsSinceReview > 5 ? 'high' : 'medium';

  return {
    alertType: 'beneficiary_review_overdue',
    severity,
    title: 'Beneficiary Designations Need Review',
    description: yearsSinceReview === Infinity
      ? `No record of beneficiary designation review. Beneficiary designations on retirement accounts, life insurance, and annuities supersede wills and trusts. Incorrect designations can result in assets passing to unintended recipients.`
      : `Beneficiary designations were last reviewed over ${Math.floor(yearsSinceReview)} years ago. Life events such as marriages, divorces, births, and deaths may have changed the intended beneficiaries.`,
    recommendedAction: 'Review and update all beneficiary designations on retirement accounts, life insurance policies, annuity contracts, and TOD/POD accounts.',
    estimatedImpact: input.grossEstateValue * 0.01,
    deadline: null,
  };
}

/** Check for estate exemption sunset concerns. */
function checkExemptionSunset(input: EstateAlertInput): EstateAlert | null {
  const yearsToSunset = input.tcjaSunsetYear - input.currentYear;

  // Only alert if sunset is approaching and estate is substantial
  if (yearsToSunset > 5) return null;
  if (yearsToSunset <= 0) return null;

  // Post-sunset exemption is roughly half the current amount
  const postSunsetExemption = input.currentExemption * 0.5;
  const currentExposure = Math.max(0, input.grossEstateValue - input.currentExemption);
  const postSunsetExposure = Math.max(0, input.grossEstateValue - postSunsetExemption);

  // Only alert if sunset creates new or significantly increased exposure
  if (postSunsetExposure <= currentExposure * 1.5 && postSunsetExposure === 0) return null;

  const additionalExposure = postSunsetExposure - currentExposure;
  const additionalTax = additionalExposure * 0.40; // 40% estate tax rate

  const severity: AlertSeverity = yearsToSunset <= 2 ? 'critical'
    : yearsToSunset <= 3 ? 'high'
    : 'medium';

  return {
    alertType: 'exemption_sunset',
    severity,
    title: 'Estate Tax Exemption Sunset Approaching',
    description: `The TCJA estate tax exemption of ${formatCurrency(input.currentExemption)} is scheduled to sunset in ${yearsToSunset} year${yearsToSunset > 1 ? 's' : ''} (${input.tcjaSunsetYear}), potentially dropping to approximately ${formatCurrency(postSunsetExemption)}. With an estate of ${formatCurrency(input.grossEstateValue)}, this could create ${formatCurrency(additionalExposure)} in additional taxable estate and ${formatCurrency(additionalTax)} in additional estate taxes.`,
    recommendedAction: `Evaluate strategies to use the current elevated exemption before sunset: (1) Make lifetime gifts using available exemption, (2) Fund irrevocable trusts (SLATs, GRATs, ILITs), (3) Consider dynasty trust structures. ${input.spouseAge ? 'As a married couple, coordinate use of both spouses\' exemptions.' : ''}`,
    estimatedImpact: additionalTax,
    deadline: yearEnd(input.tcjaSunsetYear - 1),
  };
}

/** Check if a trust review is needed. */
function checkTrustReview(input: EstateAlertInput): EstateAlert | null {
  if (!input.hasTrust) return null;

  const yearsSinceReview = yearsSince(input.trustLastReviewed);

  if (yearsSinceReview < 3) return null;

  const severity: AlertSeverity = yearsSinceReview > 7 ? 'high' : 'medium';

  return {
    alertType: 'trust_review_needed',
    severity,
    title: 'Trust Agreement Needs Review',
    description: yearsSinceReview === Infinity
      ? `The trust agreement has never been reviewed since establishment. Trust provisions should be reviewed to ensure they still align with planning goals, account for changes in tax law, and reflect current family dynamics.`
      : `The trust agreement was last reviewed ${Math.floor(yearsSinceReview)} years ago. Trust provisions, trustees, beneficiaries, and distribution terms should be evaluated for continued appropriateness.`,
    recommendedAction: 'Schedule a trust review meeting with the estate planning attorney. Verify trust funding (asset titling), review trustee succession, and confirm distribution provisions.',
    estimatedImpact: input.grossEstateValue * 0.015,
    deadline: null,
  };
}

/** Check for missing essential estate documents. */
function checkMissingDocuments(input: EstateAlertInput): EstateAlert[] {
  const alerts: EstateAlert[] = [];

  if (!input.hasWill) {
    alerts.push({
      alertType: 'missing_will',
      severity: 'critical',
      title: 'No Will on File',
      description: `No will has been established. Without a will, the estate of ${formatCurrency(input.grossEstateValue)} would be distributed according to ${input.state} intestacy laws, which may not align with the client's wishes. This is especially critical with ${input.heirCount} heir${input.heirCount > 1 ? 's' : ''}.`,
      recommendedAction: 'Engage an estate planning attorney immediately to draft a will. Consider whether a revocable living trust is also appropriate.',
      estimatedImpact: input.grossEstateValue * 0.05,
      deadline: null,
    });
  }

  if (!input.hasPOA) {
    alerts.push({
      alertType: 'missing_poa',
      severity: 'high',
      title: 'No Power of Attorney on File',
      description: `No financial power of attorney (POA) has been established. Without a POA, family members would need to pursue costly and time-consuming court guardianship proceedings to manage financial affairs in the event of incapacity.`,
      recommendedAction: 'Establish a durable financial power of attorney with a trusted agent and successor agent. Consider a springing POA if immediate effectiveness is not desired.',
      estimatedImpact: 15_000, // approximate guardianship proceeding cost
      deadline: null,
    });
  }

  if (!input.hasHealthcareDirective) {
    alerts.push({
      alertType: 'missing_healthcare_directive',
      severity: 'high',
      title: 'No Healthcare Directive on File',
      description: `No healthcare directive (living will / healthcare proxy) has been established. Without these documents, medical decisions during incapacity would fall to statutory default rules, potentially conflicting with the client's wishes.`,
      recommendedAction: 'Establish a healthcare power of attorney (healthcare proxy) and a living will/advance directive. Discuss end-of-life preferences with the appointed agent.',
      estimatedImpact: 10_000, // potential conflict/court costs
      deadline: null,
    });
  }

  return alerts;
}

/** Check for age-based estate planning urgency. */
function checkAgeBased(input: EstateAlertInput): EstateAlert | null {
  // Heightened urgency for clients over 75
  if (input.clientAge < 75) return null;

  const hasAllDocuments = input.hasWill && input.hasPOA && input.hasHealthcareDirective;
  if (hasAllDocuments && yearsSince(input.documentsLastReviewed) < 2) return null;

  return {
    alertType: 'age_based_urgency',
    severity: 'high',
    title: 'Estate Plan Review Urgency — Advanced Age',
    description: `At age ${input.clientAge}, ensuring the estate plan is current and comprehensive is critically important. The estate valued at ${formatCurrency(input.grossEstateValue)} with ${input.heirCount} heir${input.heirCount > 1 ? 's' : ''} requires up-to-date documentation and clear instructions.`,
    recommendedAction: 'Conduct a comprehensive estate plan review including: document review, asset titling verification, beneficiary audit, trust funding check, and discussion of any changed wishes.',
    estimatedImpact: input.grossEstateValue * 0.03,
    deadline: null,
  };
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Generates estate planning alerts based on document status, tax law changes,
 * and client demographics.
 *
 * Alert categories:
 * - **Document staleness**: Will, trust, POA, and healthcare directives that need review
 * - **Missing documents**: Essential documents not yet created
 * - **Beneficiary review**: Designations that may be outdated
 * - **Exemption sunset**: TCJA estate tax exemption approaching expiration
 * - **Trust review**: Trust agreements needing periodic evaluation
 * - **Age-based urgency**: Heightened importance for older clients
 *
 * @param input - Estate planning status and client demographics
 * @returns Array of EstateAlert objects, sorted by severity
 *
 * @example
 * ```ts
 * const alerts = generateEstateAlerts(input);
 * const critical = alerts.filter(a => a.severity === 'critical');
 * ```
 */
export function generateEstateAlerts(input: EstateAlertInput): EstateAlert[] {
  const allAlerts: EstateAlert[] = [];

  // Run each check
  const documentStaleness = checkDocumentStaleness(input);
  if (documentStaleness) allAlerts.push(documentStaleness);

  const beneficiaryReview = checkBeneficiaryReview(input);
  if (beneficiaryReview) allAlerts.push(beneficiaryReview);

  const exemptionSunset = checkExemptionSunset(input);
  if (exemptionSunset) allAlerts.push(exemptionSunset);

  const trustReview = checkTrustReview(input);
  if (trustReview) allAlerts.push(trustReview);

  const missingDocs = checkMissingDocuments(input);
  allAlerts.push(...missingDocs);

  const ageBased = checkAgeBased(input);
  if (ageBased) allAlerts.push(ageBased);

  // Sort by severity
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  allAlerts.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    if (sevDiff !== 0) return sevDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });

  return allAlerts;
}
