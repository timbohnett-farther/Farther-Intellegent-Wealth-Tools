// =============================================================================
// Rollover Engine — HubSpot Custom Property Definitions
// =============================================================================

export const ROLLOVER_DEAL_PROPERTIES = {
  rollover_analysis_id: {
    name: 'rollover_analysis_id',
    label: 'Rollover Analysis ID',
    type: 'string',
    groupName: 'rollover_analysis',
  },
  rollover_plan_name: {
    name: 'rollover_plan_name',
    label: 'Source Plan Name',
    type: 'string',
    groupName: 'rollover_analysis',
  },
  rollover_plan_ein: {
    name: 'rollover_plan_ein',
    label: 'Source Plan EIN',
    type: 'string',
    groupName: 'rollover_analysis',
  },
  rollover_balance: {
    name: 'rollover_balance',
    label: 'Rollover Balance',
    type: 'number',
    groupName: 'rollover_analysis',
  },
  rollover_rrs_score: {
    name: 'rollover_rrs_score',
    label: 'RRS Score',
    type: 'number',
    groupName: 'rollover_analysis',
  },
  rollover_recommendation: {
    name: 'rollover_recommendation',
    label: 'Recommendation',
    type: 'enumeration',
    groupName: 'rollover_analysis',
    options: [
      { label: 'Strong Rollover', value: 'STRONG_ROLLOVER' },
      { label: 'Moderate Rollover', value: 'MODERATE_ROLLOVER' },
      { label: 'Neutral', value: 'NEUTRAL' },
      { label: 'Moderate Stay', value: 'MODERATE_STAY' },
      { label: 'Strong Stay', value: 'STRONG_STAY' },
    ],
  },
  rollover_fee_savings_bps: {
    name: 'rollover_fee_savings_bps',
    label: 'Fee Savings (bps)',
    type: 'number',
    groupName: 'rollover_analysis',
  },
  rollover_report_generated: {
    name: 'rollover_report_generated',
    label: 'Report Generated',
    type: 'bool',
    groupName: 'rollover_analysis',
  },
} as const;
