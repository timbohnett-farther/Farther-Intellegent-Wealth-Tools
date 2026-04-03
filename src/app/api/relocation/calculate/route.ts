/**
 * POST /api/relocation/calculate
 *
 * Calculate tax comparison between origin and destination jurisdictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateTaxComparison,
  type UserInputFacts,
  type JurisdictionTaxRules,
  type TaxBracket,
  type FilingStatus,
} from '@/lib/relocation-calculator';

export const dynamic = 'force-dynamic';

interface CalculateRequestBody {
  leavingStateCode: string;
  destinationStateCode: string;
  filingStatus: FilingStatus;
  annualOrdinaryIncome: number;
  annualCapitalGains: number;
  netWorth?: number;
  puertoRico?: {
    assumeBonaFideResidency: boolean;
    act60Enabled: boolean;
    act60Cohort?: 'pre_2026' | 'post_2026' | 'not_applicable';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CalculateRequestBody = await request.json();

    // Validate required fields
    if (!body.leavingStateCode || !body.destinationStateCode) {
      return NextResponse.json(
        { error: 'Missing required fields: leavingStateCode and destinationStateCode are required' },
        { status: 400 }
      );
    }

    if (body.annualOrdinaryIncome < 0 || body.annualCapitalGains < 0) {
      return NextResponse.json(
        { error: 'Income and capital gains must be non-negative' },
        { status: 400 }
      );
    }

    // Fetch origin jurisdiction rules
    const originJurisdiction = await prisma.relocation_jurisdictions.findUnique({
      where: { code: body.leavingStateCode },
      include: {
        income_tax_rules: true,
        estate_rules: true,
        puerto_rico_rules: true,
      },
    });

    if (!originJurisdiction) {
      return NextResponse.json(
        { error: `Origin jurisdiction ${body.leavingStateCode} not found` },
        { status: 404 }
      );
    }

    // Fetch destination jurisdiction rules
    const destinationJurisdiction = await prisma.relocation_jurisdictions.findUnique({
      where: { code: body.destinationStateCode },
      include: {
        income_tax_rules: true,
        estate_rules: true,
        puerto_rico_rules: true,
      },
    });

    if (!destinationJurisdiction) {
      return NextResponse.json(
        { error: `Destination jurisdiction ${body.destinationStateCode} not found` },
        { status: 404 }
      );
    }

    // Convert database records to JurisdictionTaxRules format
    const originRules = convertToJurisdictionRules(originJurisdiction);
    const destinationRules = convertToJurisdictionRules(destinationJurisdiction);

    // Build user input facts
    const userFacts: UserInputFacts = {
      leavingStateCode: body.leavingStateCode,
      destinationStateCode: body.destinationStateCode,
      filingStatus: body.filingStatus,
      annualOrdinaryIncome: body.annualOrdinaryIncome,
      annualCapitalGains: body.annualCapitalGains,
      netWorth: body.netWorth,
      puertoRico: body.puertoRico,
    };

    // Calculate tax comparison
    const result = calculateTaxComparison(userFacts, originRules, destinationRules);

    // Log calculation run (async, don't await)
    logCalculationRun(body, result, request).catch(console.error);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/relocation/calculate:', error);
    return NextResponse.json(
      { error: 'Internal server error during tax calculation' },
      { status: 500 }
    );
  }
}

/**
 * Convert database jurisdiction record to JurisdictionTaxRules format
 */
function convertToJurisdictionRules(jurisdiction: any): JurisdictionTaxRules {
  // Get income tax rule for the requested filing status (default to single if not found)
  const incomeTaxRule = jurisdiction.income_tax_rules?.find((r: any) => r.filing_status === 'single') || jurisdiction.income_tax_rules?.[0];

  // Parse brackets if graduated system
  let brackets: any = undefined;
  if (incomeTaxRule?.system_type === 'graduated' && incomeTaxRule?.ordinary_income_brackets) {
    try {
      const parsed = JSON.parse(incomeTaxRule.ordinary_income_brackets);
      brackets = {
        single: parsed,
        marriedJoint: parsed,
        marriedSeparate: parsed,
        headOfHousehold: parsed,
      };

      // Try to find specific brackets for other filing statuses
      const marriedRule = jurisdiction.income_tax_rules?.find((r: any) => r.filing_status === 'married_joint');
      if (marriedRule?.ordinary_income_brackets) {
        brackets.marriedJoint = JSON.parse(marriedRule.ordinary_income_brackets);
      }
    } catch (e) {
      console.error('Error parsing brackets:', e);
    }
  }

  // Estate rules
  const estateRule = jurisdiction.estate_rules?.[0];

  return {
    jurisdictionCode: jurisdiction.code,
    jurisdictionName: jurisdiction.name,
    jurisdictionType: jurisdiction.type,
    effectiveDate: jurisdiction.effective_date,
    taxYear: jurisdiction.tax_year,
    rulesVersion: '1.0.0',
    lastReviewed: jurisdiction.last_reviewed_at,
    sourceUrls: [],
    incomeTaxSystemType: incomeTaxRule?.system_type || 'none',
    flatRate: incomeTaxRule?.flat_rate || undefined,
    brackets,
    capitalGainsTreatment: incomeTaxRule?.capital_gains_mode || 'exempt',
    capitalGainsRate: incomeTaxRule?.capital_gains_rate || undefined,
    hasEstateTax: estateRule?.estate_tax_mode !== 'none',
    estateExemption: estateRule?.estate_exemption || undefined,
    estateTopRate: 0.16, // Simplified for Phase 1
    hasInheritanceTax: estateRule?.inheritance_tax_mode !== 'none',
    residencyNotes: jurisdiction.notes_public || undefined,
    planningNotes: jurisdiction.notes_internal || undefined,
  };
}

/**
 * Log calculation run to database (async, non-blocking)
 */
async function logCalculationRun(body: CalculateRequestBody, result: any, request: NextRequest) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    await prisma.relocation_calculation_runs.create({
      data: {
        id: `calc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        leaving_state: body.leavingStateCode,
        destination_state: body.destinationStateCode,
        filing_status: body.filingStatus,
        ordinary_income: body.annualOrdinaryIncome,
        capital_gains: body.annualCapitalGains,
        estate_value: body.netWorth || null,
        puerto_rico_mode: body.puertoRico?.act60Enabled ? body.puertoRico.act60Cohort : null,
        result_annual_savings: result.annualTaxDifference,
        result_10yr_savings: result.tenYearIllustration,
        result_estate_exposure_flag: result.destinationState.estateOrInheritanceTaxApplies ? 'yes' : 'no',
        rules_version_hash: `${result.rulesVersionUsed.origin}-${result.rulesVersionUsed.destination}`,
        ip_address: ipAddress,
      },
    });
  } catch (error) {
    console.error('Error logging calculation run:', error);
  }
}
