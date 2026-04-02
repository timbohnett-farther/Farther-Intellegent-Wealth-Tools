// =============================================================================
// Rollover Engine — Regulatory Citations
// =============================================================================

import type { RegulatoryCitation } from '../types';

export const REGULATORY_CITATIONS: RegulatoryCitation[] = [
  {
    citation_id: 'cite-regbi-1',
    regulation: 'REG_BI',
    section: '17 CFR § 240.15l-1',
    title: 'Regulation Best Interest',
    relevance: 'Requires broker-dealers to act in the best interest of retail customers when making a recommendation, including rollover recommendations.',
    url: 'https://www.sec.gov/rules/final/2019/34-86031.pdf',
  },
  {
    citation_id: 'cite-regbi-2',
    regulation: 'REG_BI',
    section: 'SEC Staff Bulletin: Standards of Conduct (Account Recommendations)',
    title: 'SEC Account Recommendation Guidance',
    relevance: 'Clarifies that rollover recommendations trigger Reg BI obligations, requiring cost comparison and consideration of alternatives.',
  },
  {
    citation_id: 'cite-erisa-1',
    regulation: 'ERISA_404A',
    section: '29 U.S.C. § 1104(a)',
    title: 'ERISA Fiduciary Duty of Prudence',
    relevance: 'Requires fiduciaries to act prudently and solely in the interest of plan participants when managing plan assets.',
  },
  {
    citation_id: 'cite-irc-1',
    regulation: 'IRC_402C',
    section: '26 U.S.C. § 402(c)',
    title: 'IRC Rollover Rules',
    relevance: 'Defines eligible rollover distributions and the 60-day rollover window. Direct trustee-to-trustee transfers avoid mandatory 20% withholding.',
  },
  {
    citation_id: 'cite-dol-1',
    regulation: 'DOL_2020_02',
    section: 'DOL Prohibited Transaction Exemption 2020-02',
    title: 'DOL PTE 2020-02',
    relevance: 'Establishes conditions under which investment advice fiduciaries may receive compensation in connection with rollover recommendations.',
  },
  {
    citation_id: 'cite-sec-1',
    regulation: 'SEC_IA_5566',
    section: 'SEC IA Release No. 5566',
    title: 'SEC Investment Adviser Marketing Rule',
    relevance: 'Governs how investment advisers may communicate rollover analysis results and performance data to clients.',
  },
];

/**
 * Returns all regulatory citations relevant to a rollover analysis.
 */
export function getRegulatoryCitations(): RegulatoryCitation[] {
  return [...REGULATORY_CITATIONS];
}

/**
 * Returns citations for a specific regulation.
 */
export function getCitationsByRegulation(
  regulation: RegulatoryCitation['regulation'],
): RegulatoryCitation[] {
  return REGULATORY_CITATIONS.filter((c) => c.regulation === regulation);
}

/**
 * Standard disclaimers for rollover reports.
 */
export const STANDARD_DISCLAIMERS: string[] = [
  'This analysis is provided for informational purposes and does not constitute a recommendation to roll over retirement assets.',
  'Past performance does not guarantee future results. Fee comparisons are based on current fee schedules and may change.',
  'Net Unrealized Appreciation (NUA) analysis is a general estimate. Consult a tax professional for specific tax advice.',
  'Creditor protection comparisons are based on current federal and state laws, which are subject to change.',
  'This report was generated using automated analysis tools. All recommendations should be reviewed by a qualified financial advisor.',
  'Farther Financial Advisors, LLC is a registered investment advisor with the SEC. Registration does not imply a certain level of skill or training.',
];
