/**
 * Interstate Tax Migration Calculator — Core Calculation Engine
 *
 * Implements tax calculation formulas per Phase 1 technical spec:
 * - State income tax (graduated brackets and flat tax)
 * - Capital gains treatment (as ordinary, separate rate, exempt, special)
 * - Puerto Rico Act 60 logic with 2026 regime changes
 * - Estate and inheritance tax estimation
 *
 * Formula references from Dr. Vargas (Math) section of technical spec.
 */

import type {
  JurisdictionTaxRules,
  PuertoRicoExtension,
  UserInputFacts,
  TaxComparisonResult,
  JurisdictionTaxResult,
  FilingStatus,
  TaxBracket,
} from '../types';

// ==================== INCOME TAX CALCULATION ====================

/**
 * Calculate state income tax for a jurisdiction
 *
 * T_inc(J, F, OI, CG) = T_ord(J, F, OI) + T_cg(J, F, CG)
 */
export function calculateStateTax(
  jurisdiction: JurisdictionTaxRules,
  filingStatus: FilingStatus,
  ordinaryIncome: number,
  capitalGains: number,
  puertoRicoExt?: PuertoRicoExtension
): JurisdictionTaxResult {
  // Calculate ordinary income tax component
  const ordinaryTax = calculateOrdinaryIncomeTax(
    jurisdiction,
    filingStatus,
    ordinaryIncome
  );

  // Calculate capital gains tax component
  const capitalGainsTax = calculateCapitalGainsTax(
    jurisdiction,
    filingStatus,
    capitalGains,
    ordinaryIncome,
    puertoRicoExt
  );

  const totalIncomeTax = ordinaryTax + capitalGainsTax;

  // Calculate effective and marginal rates
  const totalIncome = ordinaryIncome + capitalGains;
  const effectiveTaxRate = totalIncome > 0 ? totalIncomeTax / totalIncome : 0;
  const marginalTaxRate = calculateMarginalRate(
    jurisdiction,
    filingStatus,
    ordinaryIncome
  );

  return {
    jurisdictionCode: jurisdiction.jurisdictionCode,
    jurisdictionName: jurisdiction.jurisdictionName,
    ordinaryIncomeTax: ordinaryTax,
    capitalGainsTax: capitalGainsTax,
    totalIncomeTax: totalIncomeTax,
    estateOrInheritanceTaxApplies: jurisdiction.hasEstateTax || jurisdiction.hasInheritanceTax,
    effectiveTaxRate,
    marginalTaxRate,
  };
}

/**
 * Calculate ordinary income tax component
 *
 * For graduated brackets: T_ord(J,F,OI) = Σ max(0, min(OI, U_b) - L_b) × r_b
 * For flat tax: T_ord(J,F,OI) = max(0, OI - SD_J(F)) × r_J
 */
function calculateOrdinaryIncomeTax(
  jurisdiction: JurisdictionTaxRules,
  filingStatus: FilingStatus,
  ordinaryIncome: number
): number {
  if (jurisdiction.incomeTaxSystemType === 'none') {
    return 0;
  }

  if (jurisdiction.incomeTaxSystemType === 'flat' && jurisdiction.flatRate) {
    // Flat tax: Simple rate × taxable income
    return Math.max(0, ordinaryIncome) * jurisdiction.flatRate;
  }

  if (jurisdiction.incomeTaxSystemType === 'graduated' && jurisdiction.brackets) {
    // Get brackets for filing status
    const brackets = getBracketsForFilingStatus(jurisdiction, filingStatus);
    if (!brackets || brackets.length === 0) {
      return 0;
    }

    // Apply graduated bracket formula
    return calculateGraduatedTax(brackets, ordinaryIncome);
  }

  // Special cases (e.g., Washington, Puerto Rico) handled separately
  return 0;
}

/**
 * Calculate capital gains tax component
 *
 * T_cg(J,F,CG) depends on jurisdiction treatment:
 * - as_ordinary: included in ordinary income calculation
 * - separate_rate: CG × r_cg,J
 * - exempt: 0
 * - special: Puerto Rico Act 60 logic
 */
function calculateCapitalGainsTax(
  jurisdiction: JurisdictionTaxRules,
  filingStatus: FilingStatus,
  capitalGains: number,
  ordinaryIncome: number,
  puertoRicoExt?: PuertoRicoExtension
): number {
  if (capitalGains <= 0) {
    return 0;
  }

  switch (jurisdiction.capitalGainsTreatment) {
    case 'exempt':
      return 0;

    case 'as_ordinary':
      // Capital gains are taxed as ordinary income
      // Calculate tax on (OI + CG) - tax on OI
      const totalIncome = ordinaryIncome + capitalGains;
      const taxWithGains = calculateOrdinaryIncomeTax(jurisdiction, filingStatus, totalIncome);
      const taxWithoutGains = calculateOrdinaryIncomeTax(jurisdiction, filingStatus, ordinaryIncome);
      return taxWithGains - taxWithoutGains;

    case 'separate_rate':
      // Use jurisdiction's separate capital gains rate
      if (jurisdiction.capitalGainsRate) {
        return capitalGains * jurisdiction.capitalGainsRate;
      }
      return 0;

    case 'special':
      // Puerto Rico Act 60 logic
      if (jurisdiction.jurisdictionCode === 'PR' && puertoRicoExt) {
        return calculatePuertoRicoCapitalGainsTax(capitalGains, puertoRicoExt);
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Calculate graduated tax using bracket formula
 *
 * Σ max(0, min(OI, U_b) - L_b) × r_b
 */
function calculateGraduatedTax(brackets: TaxBracket[], income: number): number {
  let totalTax = 0;

  for (const bracket of brackets) {
    const lowerBound = bracket.minIncome;
    const upperBound = bracket.maxIncome ?? Infinity;
    const rate = bracket.rate;

    // Calculate taxable amount in this bracket
    const taxableInBracket = Math.max(0, Math.min(income, upperBound) - lowerBound);

    totalTax += taxableInBracket * rate;

    // Stop if we've reached the income level
    if (income <= upperBound) {
      break;
    }
  }

  return totalTax;
}

/**
 * Calculate marginal tax rate (rate on next dollar earned)
 */
function calculateMarginalRate(
  jurisdiction: JurisdictionTaxRules,
  filingStatus: FilingStatus,
  income: number
): number {
  if (jurisdiction.incomeTaxSystemType === 'none') {
    return 0;
  }

  if (jurisdiction.incomeTaxSystemType === 'flat' && jurisdiction.flatRate) {
    return jurisdiction.flatRate;
  }

  if (jurisdiction.incomeTaxSystemType === 'graduated' && jurisdiction.brackets) {
    const brackets = getBracketsForFilingStatus(jurisdiction, filingStatus);
    if (!brackets || brackets.length === 0) {
      return 0;
    }

    // Find the bracket that contains this income level
    for (const bracket of brackets) {
      const lowerBound = bracket.minIncome;
      const upperBound = bracket.maxIncome ?? Infinity;

      if (income >= lowerBound && income < upperBound) {
        return bracket.rate;
      }
    }

    // If income exceeds all brackets, return top bracket rate
    return brackets[brackets.length - 1].rate;
  }

  return 0;
}

/**
 * Get brackets for specific filing status
 */
function getBracketsForFilingStatus(
  jurisdiction: JurisdictionTaxRules,
  filingStatus: FilingStatus
): TaxBracket[] | undefined {
  if (!jurisdiction.brackets) {
    return undefined;
  }

  switch (filingStatus) {
    case 'single':
      return jurisdiction.brackets.single;
    case 'married_joint':
      return jurisdiction.brackets.marriedJoint;
    case 'married_separate':
      return jurisdiction.brackets.marriedSeparate;
    case 'head_of_household':
      return jurisdiction.brackets.headOfHousehold;
    default:
      return jurisdiction.brackets.single;
  }
}

// ==================== PUERTO RICO ACT 60 LOGIC ====================

/**
 * Calculate Puerto Rico capital gains tax with Act 60 logic
 *
 * Act 38-2026 changes:
 * - Pre-2027 decree holders: retain favorable treatment
 * - Post-2026 decree applicants: 4% regime
 * - Bona fide residency required for all scenarios
 */
function calculatePuertoRicoCapitalGainsTax(
  capitalGains: number,
  puertoRicoExt: PuertoRicoExtension
): number {
  // Bona fide residency is required
  if (!puertoRicoExt.assumeBonaFideResidency) {
    // Standard Puerto Rico resident rates (not Act 60)
    // Use standard capital gains treatment
    return capitalGains * 0.10; // 10% standard PR capital gains rate
  }

  // Act 60 scenario
  if (puertoRicoExt.act60Enabled) {
    // Determine rate based on decree timing cohort
    switch (puertoRicoExt.act60Cohort) {
      case 'pre_2026':
        // Decree obtained before 2026 changes - use favorable 0% or 5% treatment
        return capitalGains * (puertoRicoExt.act60CapitalGainsRate ?? 0.0);

      case 'post_2026':
        // Decree obtained after Act 38-2026 - 4% regime
        return capitalGains * 0.04;

      case 'not_applicable':
      default:
        // Unknown cohort - use standard resident rate
        return capitalGains * 0.10;
    }
  }

  // Standard Puerto Rico resident (not Act 60)
  return capitalGains * 0.10;
}

// ==================== ESTATE TAX CALCULATION ====================

/**
 * Estimate estate or inheritance tax exposure
 *
 * T_est(J, F, EV) = f_J(EV - Exempt_J(F))
 */
export function estimateEstateTax(
  jurisdiction: JurisdictionTaxRules,
  estateValue: number
): { taxableAmount: number; estimatedTax: number; notes: string } | undefined {
  if (!jurisdiction.hasEstateTax && !jurisdiction.hasInheritanceTax) {
    return undefined;
  }

  // Estate tax calculation
  if (jurisdiction.hasEstateTax && jurisdiction.estateExemption !== undefined) {
    const exemption = jurisdiction.estateExemption;
    const taxableAmount = Math.max(0, estateValue - exemption);

    if (taxableAmount > 0) {
      // Rough estimate using top rate (Phase 1 simplified approach)
      const topRate = jurisdiction.estateTopRate ?? 0.16; // Default to 16% if not specified
      const estimatedTax = taxableAmount * topRate;

      return {
        taxableAmount,
        estimatedTax,
        notes: `Estate tax exposure estimated using ${jurisdiction.jurisdictionName} exemption of $${exemption.toLocaleString()} and approximate top rate.`,
      };
    }
  }

  // Inheritance tax (more complex, Phase 1 returns flag only)
  if (jurisdiction.hasInheritanceTax) {
    return {
      taxableAmount: 0,
      estimatedTax: 0,
      notes: `${jurisdiction.jurisdictionName} imposes inheritance tax. Actual exposure depends on beneficiary relationships and state-specific exemptions. Consult qualified estate planning counsel.`,
    };
  }

  return undefined;
}

// ==================== MAIN COMPARISON FUNCTION ====================

/**
 * Calculate full tax comparison between origin and destination
 *
 * S_annual = T_inc(L, F, OI, CG) - T_inc(D, F, OI, CG)
 * S_10 = S_annual × 10
 */
export function calculateTaxComparison(
  userFacts: UserInputFacts,
  originRules: JurisdictionTaxRules,
  destinationRules: JurisdictionTaxRules
): TaxComparisonResult {
  const {
    filingStatus,
    annualOrdinaryIncome,
    annualCapitalGains,
    netWorth,
    puertoRico,
  } = userFacts;

  // Calculate origin state taxes
  const originState = calculateStateTax(
    originRules,
    filingStatus,
    annualOrdinaryIncome,
    annualCapitalGains
  );

  // Calculate destination state taxes (with Puerto Rico extension if applicable)
  const destinationState = calculateStateTax(
    destinationRules,
    filingStatus,
    annualOrdinaryIncome,
    annualCapitalGains,
    puertoRico
  );

  // Calculate estate tax exposure for both jurisdictions
  if (netWorth && netWorth > 0) {
    const originEstate = estimateEstateTax(originRules, netWorth);
    const destEstate = estimateEstateTax(destinationRules, netWorth);

    if (originEstate) {
      originState.estateOrInheritanceTaxExposure = originEstate;
    }

    if (destEstate) {
      destinationState.estateOrInheritanceTaxExposure = destEstate;
    }
  }

  // Calculate savings (negative = destination has higher tax)
  const annualTaxDifference = destinationState.totalIncomeTax - originState.totalIncomeTax;
  const tenYearIllustration = annualTaxDifference * 10;

  // Build assumptions
  const assumptions = buildAssumptions(userFacts, originRules, destinationRules);

  // Build caveats
  const caveats = buildCaveats(userFacts, originRules, destinationRules);

  // Jurisdiction-specific notes
  const jurisdictionSpecificNotes = buildJurisdictionNotes(
    userFacts,
    originRules,
    destinationRules
  );

  return {
    userFacts,
    originState,
    destinationState,
    annualTaxDifference,
    tenYearIllustration,
    assumptions,
    caveats,
    jurisdictionSpecificNotes,
    calculationDate: new Date().toISOString(),
    rulesVersionUsed: {
      origin: originRules.rulesVersion,
      destination: destinationRules.rulesVersion,
    },
  };
}

// ==================== HELPER FUNCTIONS ====================

function buildAssumptions(
  userFacts: UserInputFacts,
  originRules: JurisdictionTaxRules,
  destinationRules: JurisdictionTaxRules
): string[] {
  const assumptions: string[] = [
    `Tax year ${originRules.taxYear} rules as of ${originRules.effectiveDate}`,
    'Full-year residency in destination state (no partial-year proration)',
    'Income and gains sourced to state of residence',
    'No state-specific deductions or credits beyond standard rules',
    'No local city income tax overlay',
  ];

  // Add capital gains assumptions if applicable
  if (userFacts.annualCapitalGains > 0) {
    if (destinationRules.capitalGainsTreatment === 'as_ordinary') {
      assumptions.push(`${destinationRules.jurisdictionName} taxes capital gains as ordinary income`);
    } else if (destinationRules.capitalGainsTreatment === 'separate_rate') {
      assumptions.push(`${destinationRules.jurisdictionName} uses separate capital gains rate of ${(destinationRules.capitalGainsRate ?? 0) * 100}%`);
    } else if (destinationRules.capitalGainsTreatment === 'exempt') {
      assumptions.push(`${destinationRules.jurisdictionName} does not impose state-level capital gains tax`);
    }
  }

  // Add Puerto Rico assumptions
  if (userFacts.puertoRico && destinationRules.jurisdictionCode === 'PR') {
    if (userFacts.puertoRico.assumeBonaFideResidency) {
      assumptions.push('Assumes bona fide Puerto Rico residency (physical presence test, closer connection, no tax home elsewhere)');
    }

    if (userFacts.puertoRico.act60Enabled) {
      assumptions.push('Act 60 scenario requires decree application, approval, and ongoing compliance');
      if (userFacts.puertoRico.act60Cohort === 'post_2026') {
        assumptions.push('Post-2026 decree applicants subject to 4% regime per Act 38-2026');
      }
    }
  }

  return assumptions;
}

function buildCaveats(
  userFacts: UserInputFacts,
  originRules: JurisdictionTaxRules,
  destinationRules: JurisdictionTaxRules
): string[] {
  const caveats: string[] = [
    'Results are estimates for educational purposes only and do not constitute tax, legal, or investment advice',
    'Actual tax consequences depend on residency determination, income sourcing, deductions, timing, elections, and other facts not captured here',
    'State tax law changes frequently; results reflect rules as of the effective date shown',
    'Estate and inheritance tax estimates are directional only and may require detailed planning analysis',
  ];

  if (destinationRules.jurisdictionCode === 'PR') {
    caveats.push('Puerto Rico scenarios require bona fide residency analysis and may require separate legal and tax review');
    caveats.push('Act 60 benefits are highly fact-specific and require decree application with Puerto Rico authorities');
  }

  if (destinationRules.jurisdictionCode === 'WA') {
    caveats.push('Washington capital gains tax rules have changed; review current-law treatment for high-income earners');
  }

  return caveats;
}

function buildJurisdictionNotes(
  userFacts: UserInputFacts,
  originRules: JurisdictionTaxRules,
  destinationRules: JurisdictionTaxRules
): string[] {
  const notes: string[] = [];

  // Add origin-specific notes
  if (originRules.planningNotes) {
    notes.push(`${originRules.jurisdictionName}: ${originRules.planningNotes}`);
  }

  // Add destination-specific notes
  if (destinationRules.planningNotes) {
    notes.push(`${destinationRules.jurisdictionName}: ${destinationRules.planningNotes}`);
  }

  // Add residency notes
  if (destinationRules.residencyNotes) {
    notes.push(`Residency: ${destinationRules.residencyNotes}`);
  }

  return notes;
}
