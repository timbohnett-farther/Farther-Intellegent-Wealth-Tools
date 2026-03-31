/**
 * Scenario Templates
 *
 * Pre-built scenario templates for common tax planning strategies.
 * Templates provide seed values and guidance for creating scenarios.
 */

import type {
  ScenarioTemplateDefinition,
  ScenarioOverride,
  ScenarioAssumption,
} from '@/types/scenario-planning';

// ==================== TEMPLATE REGISTRY ====================

/**
 * Registry of all available scenario templates
 */
export const SCENARIO_TEMPLATES: ScenarioTemplateDefinition[] = [
  // ==================== ROTH CONVERSION ====================
  {
    templateName: 'roth_fill_to_bracket',
    scenarioType: 'roth_conversion',
    name: 'Roth Conversion - Fill to Target Bracket',
    description: 'Model a Roth conversion that fills to the top of a target tax bracket',
    requiredFields: ['conversionAmount'],
    defaultTitle: 'Roth Conversion: Fill to 24% Bracket',
    warningPrompts: [
      'Review IRMAA threshold proximity',
      'Confirm IRA basis if applicable',
      'Verify pro-rata rule considerations',
    ],
    linkedOpportunityTypes: ['roth_conversion'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'iraDistributionsTaxable',
        operator: 'add',
        value: inputs.conversionAmount,
        reason: `Roth conversion of $${inputs.conversionAmount.toLocaleString()}`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'Target Bracket',
        description: 'Tax bracket to fill to with conversion',
        value: inputs.targetBracket || '24%',
        confidence: 'high',
      },
      {
        label: 'Conversion Timing',
        description: 'When conversion will be executed',
        value: inputs.conversionTiming || 'End of year',
        confidence: 'medium',
      },
    ],
  },

  // ==================== CHARITABLE PLANNING ====================
  {
    templateName: 'charitable_bunching',
    scenarioType: 'charitable',
    name: 'Charitable Bunching',
    description: 'Model bunching 2+ years of charitable gifts into one year to exceed standard deduction',
    requiredFields: ['charitableAmount'],
    defaultTitle: 'Charitable Bunching Strategy',
    warningPrompts: [
      'Verify donor intent for multi-year bunching',
      'Confirm donor-advised fund availability if applicable',
      'Review state tax impact',
    ],
    linkedOpportunityTypes: ['bunching', 'charitable'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'charitableContributions',
        operator: 'replace',
        value: inputs.charitableAmount,
        reason: `Bunched charitable contributions of $${inputs.charitableAmount.toLocaleString()}`,
        sourceType: 'template',
      },
      {
        field: 'deductionMethod',
        operator: 'replace',
        value: 'itemized',
        reason: 'Itemize to capture bunched deductions',
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'Bunching Period',
        description: 'Number of years of gifts bunched into current year',
        value: inputs.bunchingYears || 2,
        units: 'years',
        confidence: 'high',
      },
      {
        label: 'DAF Strategy',
        description: 'Whether using donor-advised fund for flexibility',
        value: inputs.useDaf || false,
        confidence: 'high',
      },
    ],
  },

  // ==================== CAPITAL GAINS ====================
  {
    templateName: 'gain_harvesting_threshold',
    scenarioType: 'capital_gains',
    name: 'Capital Gains Harvesting to 0% Threshold',
    description: 'Realize additional capital gains up to the 0% rate threshold',
    requiredFields: ['harvestAmount'],
    defaultTitle: 'Harvest Gains in 0% Bracket',
    warningPrompts: [
      'Confirm cost basis availability',
      'Review holding period (short vs long-term)',
      'Check wash sale implications',
    ],
    linkedOpportunityTypes: ['cap_gains_mgmt', 'gain_harvesting'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'longTermCapitalGains',
        operator: 'add',
        value: inputs.harvestAmount,
        reason: `Harvest $${inputs.harvestAmount.toLocaleString()} in long-term gains`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: '0% Rate Headroom',
        description: 'Remaining capacity in 0% capital gains bracket',
        value: inputs.headroom || 0,
        units: 'dollars',
        confidence: 'high',
      },
      {
        label: 'Cost Basis Confidence',
        description: 'Confidence level in cost basis data',
        value: inputs.basisConfidence || 'medium',
        confidence: 'medium',
      },
    ],
  },

  // ==================== PAYMENTS & WITHHOLDING ====================
  {
    templateName: 'withholding_adjustment',
    scenarioType: 'payments',
    name: 'Withholding Adjustment',
    description: 'Adjust federal withholding to optimize cash flow and avoid penalties',
    requiredFields: ['newWithholding'],
    defaultTitle: 'Withholding Adjustment',
    warningPrompts: [
      'Verify safe harbor requirements (110% prior year or 90% current year)',
      'Consider state withholding alignment',
      'Review quarterly payment needs',
    ],
    linkedOpportunityTypes: ['withholding'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'federalWithholding',
        operator: 'replace',
        value: inputs.newWithholding,
        reason: `Adjust withholding to $${inputs.newWithholding.toLocaleString()}`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'Safe Harbor Target',
        description: 'Which safe harbor rule to meet',
        value: inputs.safeHarborTarget || '110% of prior year',
        confidence: 'high',
      },
    ],
  },

  // ==================== ESTIMATED PAYMENTS ====================
  {
    templateName: 'estimated_payment_plan',
    scenarioType: 'payments',
    name: 'Estimated Payment Plan',
    description: 'Add or adjust quarterly estimated payments',
    requiredFields: ['estimatedPaymentTotal'],
    defaultTitle: 'Quarterly Estimated Payments',
    warningPrompts: [
      'Verify payment deadlines (4/15, 6/15, 9/15, 1/15)',
      'Confirm state estimated payment alignment',
      'Review underpayment penalty risk',
    ],
    linkedOpportunityTypes: ['withholding', 'payments'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'estimatedPayments',
        operator: 'replace',
        value: inputs.estimatedPaymentTotal,
        reason: `Quarterly estimated payments totaling $${inputs.estimatedPaymentTotal.toLocaleString()}`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'Payment Schedule',
        description: 'How payments are distributed across quarters',
        value: inputs.paymentSchedule || 'Equal quarters',
        confidence: 'high',
      },
    ],
  },

  // ==================== RETIREMENT INCOME ====================
  {
    templateName: 'ira_distribution_adjustment',
    scenarioType: 'retirement_income',
    name: 'IRA Distribution Adjustment',
    description: 'Model changing IRA distribution amount (including RMDs)',
    requiredFields: ['distributionAmount'],
    defaultTitle: 'IRA Distribution Scenario',
    warningPrompts: [
      'Verify RMD requirement if applicable',
      'Review QCD eligibility (age 70½+)',
      'Confirm IRA balance sufficiency',
    ],
    linkedOpportunityTypes: ['rmd_sequencing', 'qcd'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'iraDistributionsTaxable',
        operator: 'replace',
        value: inputs.distributionAmount,
        reason: `IRA distribution of $${inputs.distributionAmount.toLocaleString()}`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'RMD Amount',
        description: 'Required minimum distribution if applicable',
        value: inputs.rmdAmount || 0,
        units: 'dollars',
        confidence: 'high',
      },
      {
        label: 'QCD Portion',
        description: 'Portion going to qualified charitable distribution',
        value: inputs.qcdPortion || 0,
        units: 'dollars',
        confidence: inputs.qcdPortion ? 'high' : 'low',
      },
    ],
  },

  // ==================== QCD PLANNING ====================
  {
    templateName: 'qcd_strategy',
    scenarioType: 'retirement_income',
    name: 'Qualified Charitable Distribution (QCD)',
    description: 'Model using QCD to satisfy RMD while reducing AGI',
    requiredFields: ['qcdAmount'],
    defaultTitle: 'QCD Strategy',
    warningPrompts: [
      'Confirm age 70½ or older',
      'Verify qualified charity status',
      'Ensure direct transfer from IRA to charity',
    ],
    linkedOpportunityTypes: ['qcd', 'rmd_sequencing', 'charitable'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'iraDistributionsTaxable',
        operator: 'subtract',
        value: inputs.qcdAmount,
        reason: `QCD of $${inputs.qcdAmount.toLocaleString()} (excluded from taxable income)`,
        sourceType: 'template',
      },
      {
        field: 'charitableContributions',
        operator: 'subtract',
        value: inputs.qcdAmount,
        reason: 'QCD not eligible for charitable deduction',
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'RMD Satisfied',
        description: 'Amount of RMD satisfied by QCD',
        value: inputs.rmdSatisfied || inputs.qcdAmount,
        units: 'dollars',
        confidence: 'high',
      },
    ],
  },

  // ==================== TRANSITION EVENTS ====================
  {
    templateName: 'retirement_year_income_drop',
    scenarioType: 'transition',
    name: 'Retirement Year Income Drop',
    description: 'Model reduction in wages upon retirement',
    requiredFields: ['newWages'],
    defaultTitle: 'Retirement Year Transition',
    warningPrompts: [
      'Verify retirement date and partial-year wages',
      'Review pension/Social Security start date',
      'Check health insurance transition (COBRA/ACA)',
    ],
    linkedOpportunityTypes: ['transition', 'retirement'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'wages',
        operator: 'replace',
        value: inputs.newWages,
        reason: `Reduced wages upon retirement: $${inputs.newWages.toLocaleString()}`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'Retirement Date',
        description: 'Expected retirement date',
        value: inputs.retirementDate || 'End of year',
        confidence: 'medium',
      },
      {
        label: 'Pension Start',
        description: 'When pension income begins if applicable',
        value: inputs.pensionStart || 'Not applicable',
        confidence: inputs.pensionStart ? 'medium' : 'low',
      },
    ],
  },

  // ==================== BONUS INCOME ====================
  {
    templateName: 'bonus_income_scenario',
    scenarioType: 'transition',
    name: 'Bonus or Windfall Income',
    description: 'Model one-time bonus, equity compensation, or windfall income',
    requiredFields: ['bonusAmount'],
    defaultTitle: 'Bonus Income Scenario',
    warningPrompts: [
      'Confirm withholding on bonus',
      'Review impact on IRMAA and other thresholds',
      'Consider estimated payment needs',
    ],
    linkedOpportunityTypes: ['transition', 'bonus'],
    seedOverridesBuilder: (inputs) => [
      {
        field: 'wages',
        operator: 'add',
        value: inputs.bonusAmount,
        reason: `Bonus income: $${inputs.bonusAmount.toLocaleString()}`,
        sourceType: 'template',
      },
    ],
    seedAssumptionsBuilder: (inputs) => [
      {
        label: 'Bonus Type',
        description: 'Type of bonus or windfall',
        value: inputs.bonusType || 'Cash bonus',
        confidence: 'high',
      },
      {
        label: 'Withholding Rate',
        description: 'Withholding percentage on bonus',
        value: inputs.withholdingRate || 0.22,
        units: 'percentage',
        confidence: 'medium',
      },
    ],
  },
];

// ==================== TEMPLATE HELPERS ====================

/**
 * Get template by name
 */
export function getTemplateByName(templateName: string): ScenarioTemplateDefinition | undefined {
  return SCENARIO_TEMPLATES.find(t => t.templateName === templateName);
}

/**
 * Get templates by scenario type
 */
export function getTemplatesByType(scenarioType: string): ScenarioTemplateDefinition[] {
  return SCENARIO_TEMPLATES.filter(t => t.scenarioType === scenarioType);
}

/**
 * Get templates linked to opportunity type
 */
export function getTemplatesByOpportunityType(opportunityType: string): ScenarioTemplateDefinition[] {
  return SCENARIO_TEMPLATES.filter(t => t.linkedOpportunityTypes.includes(opportunityType));
}

/**
 * Seed database with templates
 */
export async function seedTemplates(prisma: any, createdBy: string) {
  for (const template of SCENARIO_TEMPLATES) {
    await prisma.scenarioTemplate.upsert({
      where: { templateName: template.templateName },
      update: {
        name: template.name,
        description: template.description,
        scenarioType: template.scenarioType,
        requiredFields: JSON.stringify(template.requiredFields),
        seedOverrides: JSON.stringify(template.seedOverridesBuilder({})),
        seedAssumptions: JSON.stringify(template.seedAssumptionsBuilder({})),
        linkedOpportunityTypes: JSON.stringify(template.linkedOpportunityTypes),
        isActive: true,
        displayOrder: SCENARIO_TEMPLATES.indexOf(template),
        updatedAt: new Date(),
      },
      create: {
        templateName: template.templateName,
        name: template.name,
        description: template.description,
        scenarioType: template.scenarioType,
        requiredFields: JSON.stringify(template.requiredFields),
        seedOverrides: JSON.stringify(template.seedOverridesBuilder({})),
        seedAssumptions: JSON.stringify(template.seedAssumptionsBuilder({})),
        linkedOpportunityTypes: JSON.stringify(template.linkedOpportunityTypes),
        isActive: true,
        displayOrder: SCENARIO_TEMPLATES.indexOf(template),
        createdBy,
      },
    });
  }

  console.log(`✓ Seeded ${SCENARIO_TEMPLATES.length} scenario templates`);
}
