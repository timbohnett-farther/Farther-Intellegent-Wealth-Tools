// ==================== REPORT WRITER ====================
// Template-based report section generation for financial planning reports.
// Produces formatted text sections that can be assembled into full reports.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function pct(value: number | undefined, decimals: number = 1): string {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}

function safeGet<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  const val = data[key];
  if (val === undefined || val === null) return fallback;
  return val as T;
}

function safeNum(data: Record<string, unknown>, key: string): number {
  return safeGet(data, key, 0);
}

function safeStr(data: Record<string, unknown>, key: string): string {
  return safeGet(data, key, '');
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateExecutiveSummary(data: Record<string, unknown>): string {
  const clientName = safeStr(data, 'clientName');
  const successRate = safeNum(data, 'successRate');
  const portfolioValue = safeNum(data, 'totalPortfolioValue');
  const netWorth = safeNum(data, 'netWorth');
  const alertCount = safeNum(data, 'alertCount');
  const topOpportunityValue = safeNum(data, 'topOpportunityValue');

  const lines: string[] = [
    'EXECUTIVE SUMMARY',
    '═'.repeat(60),
    '',
    `This financial plan analysis for ${clientName || 'the client'} provides a comprehensive review of the current financial position, retirement readiness, and actionable planning opportunities.`,
    '',
    `Plan Confidence: ${pct(successRate)} probability of success (Monte Carlo simulation)`,
    `Total Portfolio: ${formatCurrency(portfolioValue)}`,
    `Net Worth: ${formatCurrency(netWorth)}`,
    '',
  ];

  if (alertCount > 0) {
    lines.push(`${alertCount} action item${alertCount > 1 ? 's' : ''} identified for review.`);
  }
  if (topOpportunityValue > 0) {
    lines.push(`Top opportunity value: ${formatCurrency(topOpportunityValue)}.`);
  }

  return lines.join('\n');
}

function generateRetirementSection(data: Record<string, unknown>): string {
  const successRate = safeNum(data, 'successRate');
  const retirementYear = safeNum(data, 'retirementYear');
  const currentYear = safeNum(data, 'currentYear');
  const retirementIncome = safeNum(data, 'projectedRetirementIncome');
  const retirementExpenses = safeNum(data, 'projectedRetirementExpenses');
  const ssIncome = safeNum(data, 'projectedSSIncome');
  const portfolioIncome = safeNum(data, 'projectedPortfolioIncome');

  const yearsToRetirement = retirementYear - currentYear;

  const lines: string[] = [
    'RETIREMENT ANALYSIS',
    '═'.repeat(60),
    '',
    `Retirement Timeline: ${yearsToRetirement > 0 ? `${yearsToRetirement} years to planned retirement (${retirementYear})` : 'Currently in retirement'}`,
    `Plan Success Probability: ${pct(successRate)}`,
    '',
    'Projected Retirement Income Sources:',
    `  Social Security:      ${formatCurrency(ssIncome)}/year`,
    `  Portfolio Income:     ${formatCurrency(portfolioIncome)}/year`,
    `  Total Income:         ${formatCurrency(retirementIncome)}/year`,
    '',
    `  Projected Expenses:   ${formatCurrency(retirementExpenses)}/year`,
    `  Surplus/(Deficit):    ${formatCurrency(retirementIncome - retirementExpenses)}/year`,
    '',
  ];

  if (successRate >= 0.90) {
    lines.push('Assessment: The retirement plan is well-funded and highly likely to sustain the planned lifestyle.');
  } else if (successRate >= 0.80) {
    lines.push('Assessment: The retirement plan is on track. Continue monitoring and consider opportunities to strengthen the position.');
  } else if (successRate >= 0.70) {
    lines.push('Assessment: The plan has acceptable probability but could benefit from adjustments to improve confidence.');
  } else {
    lines.push('Assessment: The plan success rate is below the recommended threshold. Adjustments to savings, spending, or timing should be discussed.');
  }

  return lines.join('\n');
}

function generateTaxSection(data: Record<string, unknown>): string {
  const effectiveRate = safeNum(data, 'effectiveRate');
  const marginalRate = safeNum(data, 'marginalRate');
  const totalTax = safeNum(data, 'totalTax');
  const federalTax = safeNum(data, 'federalTax');
  const stateTax = safeNum(data, 'stateTax');
  const rothConversionOpportunity = safeNum(data, 'rothConversionHeadroom');
  const taxLossHarvestable = safeNum(data, 'taxLossHarvestable');

  const lines: string[] = [
    'TAX ANALYSIS',
    '═'.repeat(60),
    '',
    'Current Year Tax Summary:',
    `  Federal Income Tax:   ${formatCurrency(federalTax)}`,
    `  State Income Tax:     ${formatCurrency(stateTax)}`,
    `  Total Tax:            ${formatCurrency(totalTax)}`,
    `  Effective Rate:       ${pct(effectiveRate)}`,
    `  Marginal Rate:        ${pct(marginalRate)}`,
    '',
    'Tax Planning Opportunities:',
  ];

  if (rothConversionOpportunity > 0) {
    lines.push(`  Roth Conversion Headroom: ${formatCurrency(rothConversionOpportunity)} available before next bracket`);
  }
  if (taxLossHarvestable > 0) {
    lines.push(`  Tax-Loss Harvesting: ${formatCurrency(taxLossHarvestable)} in unrealized losses available`);
  }
  if (rothConversionOpportunity <= 0 && taxLossHarvestable <= 0) {
    lines.push('  No immediate tax planning opportunities identified.');
  }

  return lines.join('\n');
}

function generatePortfolioSection(data: Record<string, unknown>): string {
  const totalValue = safeNum(data, 'totalPortfolioValue');
  const equityPct = safeNum(data, 'equityPct');
  const bondPct = safeNum(data, 'bondPct');
  const cashPct = safeNum(data, 'cashPct');
  const altPct = safeNum(data, 'alternativePct');
  const targetEquity = safeNum(data, 'targetEquityPct');
  const targetBond = safeNum(data, 'targetBondPct');
  const targetCash = safeNum(data, 'targetCashPct');
  const targetAlt = safeNum(data, 'targetAlternativePct');
  const needsRebalancing = safeGet(data, 'needsRebalancing', false);

  const lines: string[] = [
    'PORTFOLIO ANALYSIS',
    '═'.repeat(60),
    '',
    `Total Portfolio Value: ${formatCurrency(totalValue)}`,
    '',
    '  Asset Class      Current   Target    Drift',
    '  ─────────────    ───────   ──────    ─────',
    `  Equity           ${pct(equityPct)}    ${pct(targetEquity)}    ${(equityPct * 100 - targetEquity * 100).toFixed(1)}pp`,
    `  Fixed Income     ${pct(bondPct)}    ${pct(targetBond)}    ${(bondPct * 100 - targetBond * 100).toFixed(1)}pp`,
    `  Cash             ${pct(cashPct)}    ${pct(targetCash)}    ${(cashPct * 100 - targetCash * 100).toFixed(1)}pp`,
    `  Alternative      ${pct(altPct)}    ${pct(targetAlt)}    ${(altPct * 100 - targetAlt * 100).toFixed(1)}pp`,
    '',
  ];

  if (needsRebalancing) {
    lines.push('Recommendation: The portfolio has drifted beyond tolerance thresholds. Tax-efficient rebalancing is recommended.');
  } else {
    lines.push('Assessment: The portfolio is within acceptable allocation tolerances. No rebalancing is needed at this time.');
  }

  return lines.join('\n');
}

function generateEstateSection(data: Record<string, unknown>): string {
  const grossEstate = safeNum(data, 'grossEstateValue');
  const exemption = safeNum(data, 'estateExemption');
  const taxableEstate = Math.max(0, grossEstate - exemption);
  const estimatedTax = taxableEstate * 0.40;
  const documentsReviewed = safeStr(data, 'documentsLastReviewed');
  const beneficiaryReviewed = safeStr(data, 'beneficiaryLastReviewed');

  const lines: string[] = [
    'ESTATE PLANNING',
    '═'.repeat(60),
    '',
    `Gross Estate Value:       ${formatCurrency(grossEstate)}`,
    `Federal Exemption:        ${formatCurrency(exemption)}`,
    `Estimated Taxable Estate: ${formatCurrency(taxableEstate)}`,
    `Estimated Estate Tax:     ${formatCurrency(estimatedTax)}`,
    '',
    `Estate Documents Last Reviewed: ${documentsReviewed || 'No record'}`,
    `Beneficiary Designations Last Reviewed: ${beneficiaryReviewed || 'No record'}`,
    '',
  ];

  if (taxableEstate > 0) {
    lines.push(`Note: The estate exceeds the current exemption by ${formatCurrency(taxableEstate)}. Estate tax reduction strategies (gifting, trusts, charitable planning) should be evaluated.`);
  } else {
    const headroom = exemption - grossEstate;
    lines.push(`The estate is ${formatCurrency(headroom)} below the current exemption. Monitor for exemption sunset changes.`);
  }

  return lines.join('\n');
}

function generateInsuranceSection(data: Record<string, unknown>): string {
  const lifeGap = safeNum(data, 'lifeInsuranceGap');
  const disabilityGap = safeNum(data, 'disabilityGap');
  const ltcGap = safeNum(data, 'ltcGap');
  const riskScore = safeNum(data, 'overallRiskScore');

  const lines: string[] = [
    'INSURANCE ANALYSIS',
    '═'.repeat(60),
    '',
    `Overall Insurance Risk Score: ${riskScore}/100`,
    '',
    'Coverage Gaps:',
    `  Life Insurance:     ${lifeGap > 0 ? formatCurrency(lifeGap) + ' shortfall' : 'Adequate'}`,
    `  Disability:         ${disabilityGap > 0 ? formatCurrency(disabilityGap) + '/month shortfall' : 'Adequate'}`,
    `  Long-Term Care:     ${ltcGap > 0 ? formatCurrency(ltcGap) + '/day shortfall' : 'Adequate'}`,
    '',
  ];

  if (riskScore > 60) {
    lines.push('Recommendation: Significant coverage gaps exist. Immediate review and corrective action recommended.');
  } else if (riskScore > 30) {
    lines.push('Recommendation: Moderate coverage gaps identified. Review during next planning meeting.');
  } else {
    lines.push('Assessment: Insurance coverage appears adequate across all categories.');
  }

  return lines.join('\n');
}

function generateGoalsSection(data: Record<string, unknown>): string {
  const goals = safeGet<Array<Record<string, unknown>>>(data, 'goals', []);

  const lines: string[] = [
    'GOAL FUNDING ANALYSIS',
    '═'.repeat(60),
    '',
  ];

  if (goals.length === 0) {
    lines.push('No financial goals are currently being tracked.');
    return lines.join('\n');
  }

  lines.push('  Goal                Status        Funded   Target Year');
  lines.push('  ────────────────    ──────────    ──────   ───────────');

  for (const goal of goals) {
    const name = String(goal['name'] ?? 'Unknown').padEnd(20).slice(0, 20);
    const status = String(goal['status'] ?? 'unknown').padEnd(12).slice(0, 12);
    const fundedRatio = pct(goal['fundedRatio'] as number | undefined).padEnd(8);
    const targetYear = String(goal['targetYear'] ?? '').padEnd(4);
    lines.push(`  ${name}${status}${fundedRatio} ${targetYear}`);
  }

  return lines.join('\n');
}

function generateDefaultSection(sectionType: string, data: Record<string, unknown>): string {
  const lines: string[] = [
    sectionType.toUpperCase().replace(/_/g, ' '),
    '═'.repeat(60),
    '',
  ];

  // Generate a generic section from the data keys
  for (const [key, value] of Object.entries(data)) {
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());

    if (typeof value === 'number') {
      lines.push(`${label}: ${value > 100 ? formatCurrency(value) : value.toFixed(2)}`);
    } else if (typeof value === 'string') {
      lines.push(`${label}: ${value}`);
    } else if (typeof value === 'boolean') {
      lines.push(`${label}: ${value ? 'Yes' : 'No'}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Section type registry
// ---------------------------------------------------------------------------

const SECTION_GENERATORS: Record<string, (data: Record<string, unknown>) => string> = {
  executive_summary: generateExecutiveSummary,
  retirement: generateRetirementSection,
  tax: generateTaxSection,
  portfolio: generatePortfolioSection,
  estate: generateEstateSection,
  insurance: generateInsuranceSection,
  goals: generateGoalsSection,
};

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Generates a formatted report section based on section type and data.
 *
 * Supported section types:
 * - `executive_summary` — Overall plan summary
 * - `retirement` — Retirement readiness analysis
 * - `tax` — Tax analysis and opportunities
 * - `portfolio` — Asset allocation and drift analysis
 * - `estate` — Estate planning overview
 * - `insurance` — Insurance gap analysis
 * - `goals` — Goal funding status
 *
 * For unrecognized section types, a generic section is generated from the
 * provided data keys and values.
 *
 * @param sectionType - The type of report section to generate
 * @param data - Key-value data to populate the section template
 * @returns Formatted text content for the report section
 *
 * @example
 * ```ts
 * const section = generateReportSection('retirement', {
 *   successRate: 0.87,
 *   retirementYear: 2035,
 *   currentYear: 2026,
 * });
 * ```
 */
export function generateReportSection(
  sectionType: string,
  data: Record<string, unknown>,
): string {
  const generator = SECTION_GENERATORS[sectionType];

  if (generator) {
    try {
      return generator(data);
    } catch {
      return generateDefaultSection(sectionType, data);
    }
  }

  return generateDefaultSection(sectionType, data);
}
