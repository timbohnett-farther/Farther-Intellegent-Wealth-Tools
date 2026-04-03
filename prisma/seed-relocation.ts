/**
 * Seed script for Interstate Tax Migration Calculator
 * Populates tax rules for Phase 1 jurisdictions:
 * - 9 leaving states (high-tax)
 * - 8 key destination jurisdictions
 *
 * Data sources:
 * - Tax Foundation State Tax Tables 2026
 * - NCSL State Tax Actions (March 2026)
 * - ACTEC State Death Tax Chart
 * - Puerto Rico Act 60 Official Documentation
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Create Prisma adapter with libsql config
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
} as any);

async function main() {
  console.log('🌎 Seeding relocation calculator tax rules...');

  // Tax year for all rules
  const TAX_YEAR = 2026;
  const EFFECTIVE_DATE = '2026-01-01';
  const LAST_REVIEWED = '2026-03-20';

  // ==================== LEAVING STATES (9 HIGH-TAX JURISDICTIONS) ====================

  // California - Graduated income tax, estate tax
  const california = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-ca',
      code: 'CA',
      name: 'California',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: true,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'California has the highest top marginal income tax rate in the nation at 13.3% for income over $1 million (single filers).',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'ca-income-single',
      jurisdiction_id: california.id,
      filing_status: 'single',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 10412, rate: 0.01 },
        { minIncome: 10412, maxIncome: 24684, rate: 0.02 },
        { minIncome: 24684, maxIncome: 38959, rate: 0.04 },
        { minIncome: 38959, maxIncome: 54081, rate: 0.06 },
        { minIncome: 54081, maxIncome: 68350, rate: 0.08 },
        { minIncome: 68350, maxIncome: 349137, rate: 0.093 },
        { minIncome: 349137, maxIncome: 418961, rate: 0.103 },
        { minIncome: 418961, maxIncome: 698271, rate: 0.113 },
        { minIncome: 698271, maxIncome: null, rate: 0.133 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'ca-income-married',
      jurisdiction_id: california.id,
      filing_status: 'married_joint',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 20824, rate: 0.01 },
        { minIncome: 20824, maxIncome: 49368, rate: 0.02 },
        { minIncome: 49368, maxIncome: 77918, rate: 0.04 },
        { minIncome: 77918, maxIncome: 108162, rate: 0.06 },
        { minIncome: 108162, maxIncome: 136700, rate: 0.08 },
        { minIncome: 136700, maxIncome: 698274, rate: 0.093 },
        { minIncome: 698274, maxIncome: 837922, rate: 0.103 },
        { minIncome: 837922, maxIncome: 1000000, rate: 0.113 },
        { minIncome: 1000000, maxIncome: null, rate: 0.133 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // California has no state estate tax (repealed in 1982)
  await prisma.relocation_estate_rules.create({
    data: {
      id: 'ca-estate',
      jurisdiction_id: california.id,
      estate_tax_mode: 'none',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // New York - Graduated income tax, estate tax
  const newYork = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-ny',
      code: 'NY',
      name: 'New York',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: true,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'New York has both state income tax (top rate 10.9%) and estate tax (exemption $6.94 million).',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'ny-income-single',
      jurisdiction_id: newYork.id,
      filing_status: 'single',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 8500, rate: 0.04 },
        { minIncome: 8500, maxIncome: 11700, rate: 0.045 },
        { minIncome: 11700, maxIncome: 13900, rate: 0.0525 },
        { minIncome: 13900, maxIncome: 80650, rate: 0.055 },
        { minIncome: 80650, maxIncome: 215400, rate: 0.06 },
        { minIncome: 215400, maxIncome: 1077550, rate: 0.0685 },
        { minIncome: 1077550, maxIncome: 5000000, rate: 0.0965 },
        { minIncome: 5000000, maxIncome: 25000000, rate: 0.103 },
        { minIncome: 25000000, maxIncome: null, rate: 0.109 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'ny-income-married',
      jurisdiction_id: newYork.id,
      filing_status: 'married_joint',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 17150, rate: 0.04 },
        { minIncome: 17150, maxIncome: 23600, rate: 0.045 },
        { minIncome: 23600, maxIncome: 27900, rate: 0.0525 },
        { minIncome: 27900, maxIncome: 161550, rate: 0.055 },
        { minIncome: 161550, maxIncome: 323200, rate: 0.06 },
        { minIncome: 323200, maxIncome: 2155350, rate: 0.0685 },
        { minIncome: 2155350, maxIncome: 5000000, rate: 0.0965 },
        { minIncome: 5000000, maxIncome: 25000000, rate: 0.103 },
        { minIncome: 25000000, maxIncome: null, rate: 0.109 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'ny-estate',
      jurisdiction_id: newYork.id,
      estate_tax_mode: 'state_estate_tax',
      estate_exemption: 6940000,
      estate_rate_schedule_key: 'ny_2026_progressive',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // New Jersey - Graduated income tax, NO estate tax (repealed 2018)
  const newJersey = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-nj',
      code: 'NJ',
      name: 'New Jersey',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: true,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'New Jersey has high income tax rates (top rate 10.75% over $1 million) but repealed estate tax in 2018.',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'nj-income-single',
      jurisdiction_id: newJersey.id,
      filing_status: 'single',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 20000, rate: 0.014 },
        { minIncome: 20000, maxIncome: 35000, rate: 0.0175 },
        { minIncome: 35000, maxIncome: 40000, rate: 0.035 },
        { minIncome: 40000, maxIncome: 75000, rate: 0.05525 },
        { minIncome: 75000, maxIncome: 500000, rate: 0.0637 },
        { minIncome: 500000, maxIncome: 1000000, rate: 0.0897 },
        { minIncome: 1000000, maxIncome: null, rate: 0.1075 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'nj-income-married',
      jurisdiction_id: newJersey.id,
      filing_status: 'married_joint',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 20000, rate: 0.014 },
        { minIncome: 20000, maxIncome: 50000, rate: 0.0175 },
        { minIncome: 50000, maxIncome: 70000, rate: 0.0245 },
        { minIncome: 70000, maxIncome: 80000, rate: 0.035 },
        { minIncome: 80000, maxIncome: 150000, rate: 0.05525 },
        { minIncome: 150000, maxIncome: 500000, rate: 0.0637 },
        { minIncome: 500000, maxIncome: 1000000, rate: 0.0897 },
        { minIncome: 1000000, maxIncome: null, rate: 0.1075 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'nj-estate',
      jurisdiction_id: newJersey.id,
      estate_tax_mode: 'none',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Connecticut - Graduated income tax, estate tax
  const connecticut = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-ct',
      code: 'CT',
      name: 'Connecticut',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: true,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'Connecticut has graduated income tax (top rate 6.99%) and estate tax (exemption $13.61 million).',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'ct-income-single',
      jurisdiction_id: connecticut.id,
      filing_status: 'single',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 10000, rate: 0.03 },
        { minIncome: 10000, maxIncome: 50000, rate: 0.05 },
        { minIncome: 50000, maxIncome: 100000, rate: 0.055 },
        { minIncome: 100000, maxIncome: 200000, rate: 0.06 },
        { minIncome: 200000, maxIncome: 250000, rate: 0.065 },
        { minIncome: 250000, maxIncome: 500000, rate: 0.069 },
        { minIncome: 500000, maxIncome: null, rate: 0.0699 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'ct-income-married',
      jurisdiction_id: connecticut.id,
      filing_status: 'married_joint',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 20000, rate: 0.03 },
        { minIncome: 20000, maxIncome: 100000, rate: 0.05 },
        { minIncome: 100000, maxIncome: 200000, rate: 0.055 },
        { minIncome: 200000, maxIncome: 400000, rate: 0.06 },
        { minIncome: 400000, maxIncome: 500000, rate: 0.065 },
        { minIncome: 500000, maxIncome: 1000000, rate: 0.069 },
        { minIncome: 1000000, maxIncome: null, rate: 0.0699 },
      ]),
      capital_gains_mode: 'as_ordinary',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'ct-estate',
      jurisdiction_id: connecticut.id,
      estate_tax_mode: 'state_estate_tax',
      estate_exemption: 13610000,
      estate_rate_schedule_key: 'ct_2026_progressive',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Hawaii, Minnesota, Oregon, Massachusetts, Washington (abbreviated)
  const remainingLeavingStates = [
    { code: 'HI', name: 'Hawaii', topRate: 0.11, exemption: null },
    { code: 'MN', name: 'Minnesota', topRate: 0.0985, exemption: 3000000 },
    { code: 'OR', name: 'Oregon', topRate: 0.099, exemption: null },
    { code: 'MA', name: 'Massachusetts', topRate: 0.05, exemption: 2000000 },
    { code: 'WA', name: 'Washington', topRate: 0.07, exemption: 2193000 },
  ];

  for (const state of remainingLeavingStates) {
    const jurisdiction = await prisma.relocation_jurisdictions.create({
      data: {
        id: `jurisdiction-${state.code.toLowerCase()}`,
        code: state.code,
        name: state.name,
        type: 'state',
        is_destination_enabled: true,
        is_leaving_state_enabled: true,
        tax_year: TAX_YEAR,
        effective_date: EFFECTIVE_DATE,
        last_reviewed_at: LAST_REVIEWED,
        status: 'published',
        notes_public: `${state.name} top marginal rate: ${state.topRate * 100}%${state.exemption ? `, estate tax exemption: $${(state.exemption / 1000000).toFixed(1)}M` : ''}`,
      },
    });

    // Simplified graduated brackets (Phase 1)
    await prisma.relocation_income_tax_rules.create({
      data: {
        id: `${state.code.toLowerCase()}-income-single`,
        jurisdiction_id: jurisdiction.id,
        filing_status: 'single',
        system_type: 'graduated',
        ordinary_income_taxed: true,
        ordinary_income_brackets: JSON.stringify([
          { minIncome: 0, maxIncome: 50000, rate: state.topRate * 0.5 },
          { minIncome: 50000, maxIncome: null, rate: state.topRate },
        ]),
        capital_gains_mode: 'as_ordinary',
        active_from: EFFECTIVE_DATE,
        version: 1,
      },
    });

    await prisma.relocation_income_tax_rules.create({
      data: {
        id: `${state.code.toLowerCase()}-income-married`,
        jurisdiction_id: jurisdiction.id,
        filing_status: 'married_joint',
        system_type: 'graduated',
        ordinary_income_taxed: true,
        ordinary_income_brackets: JSON.stringify([
          { minIncome: 0, maxIncome: 100000, rate: state.topRate * 0.5 },
          { minIncome: 100000, maxIncome: null, rate: state.topRate },
        ]),
        capital_gains_mode: 'as_ordinary',
        active_from: EFFECTIVE_DATE,
        version: 1,
      },
    });

    await prisma.relocation_estate_rules.create({
      data: {
        id: `${state.code.toLowerCase()}-estate`,
        jurisdiction_id: jurisdiction.id,
        estate_tax_mode: state.exemption ? 'state_estate_tax' : 'none',
        estate_exemption: state.exemption,
        inheritance_tax_mode: 'none',
        active_from: EFFECTIVE_DATE,
        version: 1,
      },
    });
  }

  // ==================== DESTINATION JURISDICTIONS ====================

  // Florida - No income tax, no estate tax
  const florida = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-fl',
      code: 'FL',
      name: 'Florida',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: false,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'Florida has no state income tax and no estate or inheritance tax. Constitutional prohibition on income tax.',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'fl-income',
      jurisdiction_id: florida.id,
      filing_status: 'single',
      system_type: 'none',
      ordinary_income_taxed: false,
      capital_gains_mode: 'exempt',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'fl-estate',
      jurisdiction_id: florida.id,
      estate_tax_mode: 'none',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Texas - No income tax, no estate tax
  const texas = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-tx',
      code: 'TX',
      name: 'Texas',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: false,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'Texas has no state income tax and no estate or inheritance tax. Constitutional prohibition on income tax.',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'tx-income',
      jurisdiction_id: texas.id,
      filing_status: 'single',
      system_type: 'none',
      ordinary_income_taxed: false,
      capital_gains_mode: 'exempt',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'tx-estate',
      jurisdiction_id: texas.id,
      estate_tax_mode: 'none',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Nevada - No income tax, no estate tax
  const nevada = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-nv',
      code: 'NV',
      name: 'Nevada',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: false,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'Nevada has no state income tax and no estate or inheritance tax.',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'nv-income',
      jurisdiction_id: nevada.id,
      filing_status: 'single',
      system_type: 'none',
      ordinary_income_taxed: false,
      capital_gains_mode: 'exempt',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'nv-estate',
      jurisdiction_id: nevada.id,
      estate_tax_mode: 'none',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Tennessee - No income tax (repealed 2021), no estate tax
  const tennessee = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-tn',
      code: 'TN',
      name: 'Tennessee',
      type: 'state',
      is_destination_enabled: true,
      is_leaving_state_enabled: false,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'Tennessee repealed state income tax on investment income in 2021. No wage income tax, no estate tax.',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'tn-income',
      jurisdiction_id: tennessee.id,
      filing_status: 'single',
      system_type: 'none',
      ordinary_income_taxed: false,
      capital_gains_mode: 'exempt',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'tn-estate',
      jurisdiction_id: tennessee.id,
      estate_tax_mode: 'none',
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Wyoming, South Dakota, New Hampshire - All no income tax
  const noIncomeTaxStates = [
    { code: 'WY', name: 'Wyoming' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'NH', name: 'New Hampshire' },
  ];

  for (const state of noIncomeTaxStates) {
    const jurisdiction = await prisma.relocation_jurisdictions.create({
      data: {
        id: `jurisdiction-${state.code.toLowerCase()}`,
        code: state.code,
        name: state.name,
        type: 'state',
        is_destination_enabled: true,
        is_leaving_state_enabled: false,
        tax_year: TAX_YEAR,
        effective_date: EFFECTIVE_DATE,
        last_reviewed_at: LAST_REVIEWED,
        status: 'published',
        notes_public: `${state.name} has no state income tax and no estate or inheritance tax.`,
      },
    });

    await prisma.relocation_income_tax_rules.create({
      data: {
        id: `${state.code.toLowerCase()}-income`,
        jurisdiction_id: jurisdiction.id,
        filing_status: 'single',
        system_type: 'none',
        ordinary_income_taxed: false,
        capital_gains_mode: 'exempt',
        active_from: EFFECTIVE_DATE,
        version: 1,
      },
    });

    await prisma.relocation_estate_rules.create({
      data: {
        id: `${state.code.toLowerCase()}-estate`,
        jurisdiction_id: jurisdiction.id,
        estate_tax_mode: 'none',
        inheritance_tax_mode: 'none',
        active_from: EFFECTIVE_DATE,
        version: 1,
      },
    });
  }

  // Puerto Rico - Special Act 60 handling
  const puertoRico = await prisma.relocation_jurisdictions.create({
    data: {
      id: 'jurisdiction-pr',
      code: 'PR',
      name: 'Puerto Rico',
      type: 'territory',
      is_destination_enabled: true,
      is_leaving_state_enabled: false,
      tax_year: TAX_YEAR,
      effective_date: EFFECTIVE_DATE,
      last_reviewed_at: LAST_REVIEWED,
      status: 'published',
      notes_public: 'Puerto Rico offers Act 60 tax incentives for bona fide residents. Standard rates apply without Act 60 decree.',
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'pr-income-single',
      jurisdiction_id: puertoRico.id,
      filing_status: 'single',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 9000, rate: 0.0 },
        { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
        { minIncome: 25000, maxIncome: 41500, rate: 0.14 },
        { minIncome: 41500, maxIncome: 61500, rate: 0.25 },
        { minIncome: 61500, maxIncome: null, rate: 0.33 },
      ]),
      capital_gains_mode: 'special',
      capital_gains_rate: 0.10,
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_income_tax_rules.create({
    data: {
      id: 'pr-income-married',
      jurisdiction_id: puertoRico.id,
      filing_status: 'married_joint',
      system_type: 'graduated',
      ordinary_income_taxed: true,
      ordinary_income_brackets: JSON.stringify([
        { minIncome: 0, maxIncome: 9000, rate: 0.0 },
        { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
        { minIncome: 25000, maxIncome: 41500, rate: 0.14 },
        { minIncome: 41500, maxIncome: 61500, rate: 0.25 },
        { minIncome: 61500, maxIncome: null, rate: 0.33 },
      ]),
      capital_gains_mode: 'special',
      capital_gains_rate: 0.10,
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_estate_rules.create({
    data: {
      id: 'pr-estate',
      jurisdiction_id: puertoRico.id,
      estate_tax_mode: 'state_estate_tax',
      estate_exemption: 5000000,
      inheritance_tax_mode: 'none',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  await prisma.relocation_puerto_rico_rules.create({
    data: {
      id: 'pr-act60',
      jurisdiction_id: puertoRico.id,
      bona_fide_residency_required: true,
      act60_enabled: true,
      decree_timing_options: JSON.stringify(['pre_2026', 'post_2026', 'not_applicable']),
      post_2026_preferential_rate: 0.04,
      pre_residency_gains_rate: 0.05,
      primary_residence_required: true,
      act_38_2026_changes: 'Act 38-2026 amended Act 60 to impose 4% rate on capital gains for decrees issued after March 2026. Pre-2026 decree holders retain 0% or 5% treatment under grandfathering provisions.',
      active_from: EFFECTIVE_DATE,
      version: 1,
    },
  });

  // Seed scraper sources
  await prisma.relocation_scraper_sources.createMany({
    data: [
      {
        id: 'scraper-tax-foundation',
        source_name: 'Tax Foundation State Tax Tables',
        source_type: 'tax_foundation',
        base_url: 'https://taxfoundation.org',
        scraping_frequency: 'monthly',
        is_active: true,
        scraper_config: JSON.stringify({ targetPages: ['state-tax-rates', 'publications'] }),
      },
      {
        id: 'scraper-ncsl',
        source_name: 'NCSL State Tax Actions',
        source_type: 'ncsl_state_tax_actions',
        base_url: 'https://www.ncsl.org/research/fiscal-policy/state-tax-actions.aspx',
        scraping_frequency: 'weekly',
        is_active: true,
        scraper_config: JSON.stringify({ category: 'income-tax' }),
      },
      {
        id: 'scraper-actec',
        source_name: 'ACTEC State Death Tax Chart',
        source_type: 'actec_death_tax_chart',
        base_url: 'https://www.actec.org',
        scraping_frequency: 'monthly',
        is_active: true,
        scraper_config: JSON.stringify({ documentType: 'death-tax-chart' }),
      },
      {
        id: 'scraper-pr-official',
        source_name: 'Puerto Rico Act 60 Official',
        source_type: 'puerto_rico_official',
        base_url: 'https://www.ddec.pr.gov',
        scraping_frequency: 'weekly',
        is_active: true,
        scraper_config: JSON.stringify({ section: 'incentives-act-60' }),
      },
    ],
  });

  console.log('✅ Seeding complete!');
  console.log(`  - 9 leaving states seeded`);
  console.log(`  - 8 key destination jurisdictions seeded`);
  console.log(`  - Income tax rules, estate rules, and Puerto Rico special rules created`);
  console.log(`  - 4 scraper sources configured`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
