/**
 * GET /api/relocation/rules/[jurisdictionCode]
 *
 * Returns detailed tax rules for a specific jurisdiction
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jurisdictionCode: string }> }
) {
  try {
    const { jurisdictionCode } = await params;

    if (!jurisdictionCode) {
      return NextResponse.json(
        { error: 'Missing jurisdiction code' },
        { status: 400 }
      );
    }

    // Fetch jurisdiction with all related rules
    const jurisdiction = await prisma.relocation_jurisdictions.findUnique({
      where: { code: jurisdictionCode },
      include: {
        income_tax_rules: {
          orderBy: { filing_status: 'asc' },
        },
        estate_rules: true,
        puerto_rico_rules: true,
        source_documents: {
          where: { is_authoritative: true },
          orderBy: { retrieved_at: 'desc' },
        },
      },
    });

    if (!jurisdiction) {
      return NextResponse.json(
        { error: `Jurisdiction ${jurisdictionCode} not found` },
        { status: 404 }
      );
    }

    // Transform to client-friendly format
    const result = {
      jurisdiction: {
        id: jurisdiction.id,
        code: jurisdiction.code,
        name: jurisdiction.name,
        type: jurisdiction.type,
        taxYear: jurisdiction.tax_year,
        effectiveDate: jurisdiction.effective_date,
        lastReviewed: jurisdiction.last_reviewed_at,
        status: jurisdiction.status,
        notesPublic: jurisdiction.notes_public,
      },
      incomeTaxRules: jurisdiction.income_tax_rules.map((rule) => ({
        id: rule.id,
        filingStatus: rule.filing_status,
        systemType: rule.system_type,
        ordinaryIncomeTaxed: rule.ordinary_income_taxed,
        brackets: rule.ordinary_income_brackets ? JSON.parse(rule.ordinary_income_brackets) : null,
        flatRate: rule.flat_rate,
        standardDeduction: rule.standard_deduction,
        capitalGainsMode: rule.capital_gains_mode,
        capitalGainsRate: rule.capital_gains_rate,
        capitalGainsExemption: rule.capital_gains_exemption,
        activeFrom: rule.active_from,
        activeTo: rule.active_to,
        version: rule.version,
      })),
      estateRules: jurisdiction.estate_rules.length > 0 ? {
        id: jurisdiction.estate_rules[0].id,
        estateTaxMode: jurisdiction.estate_rules[0].estate_tax_mode,
        estateExemption: jurisdiction.estate_rules[0].estate_exemption,
        estateRateScheduleKey: jurisdiction.estate_rules[0].estate_rate_schedule_key,
        inheritanceTaxMode: jurisdiction.estate_rules[0].inheritance_tax_mode,
        inheritanceRuleKey: jurisdiction.estate_rules[0].inheritance_rule_key,
        activeFrom: jurisdiction.estate_rules[0].active_from,
        activeTo: jurisdiction.estate_rules[0].active_to,
        version: jurisdiction.estate_rules[0].version,
      } : null,
      puertoRicoRules: jurisdiction.puerto_rico_rules ? {
        id: jurisdiction.puerto_rico_rules.id,
        bonaFideResidencyRequired: jurisdiction.puerto_rico_rules.bona_fide_residency_required,
        act60Enabled: jurisdiction.puerto_rico_rules.act60_enabled,
        decreeTimingOptions: JSON.parse(jurisdiction.puerto_rico_rules.decree_timing_options),
        post2026PreferentialRate: jurisdiction.puerto_rico_rules.post_2026_preferential_rate,
        preResidencyGainsRate: jurisdiction.puerto_rico_rules.pre_residency_gains_rate,
        primaryResidenceRequired: jurisdiction.puerto_rico_rules.primary_residence_required,
        act382026Changes: jurisdiction.puerto_rico_rules.act_38_2026_changes,
        activeFrom: jurisdiction.puerto_rico_rules.active_from,
        activeTo: jurisdiction.puerto_rico_rules.active_to,
        version: jurisdiction.puerto_rico_rules.version,
      } : null,
      sources: jurisdiction.source_documents.map((doc) => ({
        id: doc.id,
        sourceType: doc.source_type,
        title: doc.title,
        url: doc.url,
        publisher: doc.publisher,
        publishedDate: doc.published_date,
        retrievedAt: doc.retrieved_at,
        isAuthoritative: doc.is_authoritative,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/relocation/rules:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching jurisdiction rules' },
      { status: 500 }
    );
  }
}
