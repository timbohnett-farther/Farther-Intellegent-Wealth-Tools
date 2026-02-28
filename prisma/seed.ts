import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import path from 'path';

function cuid(): string {
  return 'c' + randomBytes(12).toString('hex').slice(0, 23);
}

const dbPath = path.resolve(process.cwd(), 'dev.db');
const db = new Database(dbPath);

// Enable WAL for better concurrency
db.pragma('journal_mode = WAL');

const now = new Date().toISOString();

console.log('Seeding database...');

// ==================== FIRMS ====================
const firm1Id = cuid();
const firm2Id = cuid();

db.prepare(`INSERT INTO firms (id, name, crd_number, address_line1, city, state, zip, country, phone, website, plan, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  firm1Id, 'Farther Finance', '123456', '100 Park Avenue', 'New York', 'NY', '10017', 'US', '(212) 555-1000', 'https://farther.com', 'enterprise', now, now
);
db.prepare(`INSERT INTO firms (id, name, crd_number, address_line1, city, state, zip, country, phone, plan, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  firm2Id, 'Summit Wealth Advisors', '654321', '500 Market Street', 'San Francisco', 'CA', '94105', 'US', '(415) 555-2000', 'professional', now, now
);

// ==================== ADVISORS ====================
const adv1Id = cuid();
const adv2Id = cuid();
const adv3Id = cuid();
const adv4Id = cuid();

const insertAdvisor = db.prepare(`INSERT INTO advisors (id, firm_id, auth_user_id, first_name, last_name, email, phone, title, role, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

insertAdvisor.run(adv1Id, firm1Id, 'auth0|advisor1', 'John', 'Doe', 'john.doe@farther.com', '(212) 555-1001', 'Senior Financial Advisor, CFP', 'admin', 1, now, now);
insertAdvisor.run(adv2Id, firm1Id, 'auth0|advisor2', 'Jane', 'Smith', 'jane.smith@farther.com', '(212) 555-1002', 'Financial Advisor, CFA', 'advisor', 1, now, now);
insertAdvisor.run(adv3Id, firm2Id, 'auth0|advisor3', 'Michael', 'Johnson', 'michael@summitwealthadvisors.com', '(415) 555-2001', 'Managing Partner', 'admin', 1, now, now);
insertAdvisor.run(adv4Id, firm2Id, 'auth0|advisor4', 'Emily', 'Davis', 'emily@summitwealthadvisors.com', null, 'Associate Advisor', 'associate', 1, now, now);

// ==================== HOUSEHOLDS & CLIENTS ====================
const insertHousehold = db.prepare(`INSERT INTO households (id, firm_id, advisor_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
const insertClient = db.prepare(`INSERT INTO clients (id, household_id, firm_id, advisor_id, role, first_name, last_name, email, phone_mobile, date_of_birth, gender, marital_status, filing_status, employment_status, employer_name, occupation, wealth_tier, state, domicile_state, planning_horizon, country, citizenship, dependents_count, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

interface ClientData {
  household: string;
  advisorId: string;
  firmId: string;
  primary: { firstName: string; lastName: string; dob: string; gender: string; email: string; phone: string | null; marital: string; filing: string; employment: string; employer: string | null; occupation: string; tier: string; state: string; horizon: number; };
  coClient?: { firstName: string; lastName: string; dob: string; gender: string; email: string; marital: string; filing: string; employment: string; employer?: string | null; occupation: string; tier: string; state: string; horizon: number; };
}

const clientsData: ClientData[] = [
  { household: 'Chen Family', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'Sarah', lastName: 'Chen', dob: '1974-03-15T00:00:00.000Z', gender: 'female', email: 'sarah.chen@email.com', phone: '(555) 234-5678', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Goldman Sachs', occupation: 'Managing Director', tier: 'uhnw', state: 'NY', horizon: 95 }, coClient: { firstName: 'Michael', lastName: 'Chen', dob: '1972-08-22T00:00:00.000Z', gender: 'male', email: 'michael.chen@email.com', marital: 'married', filing: 'mfj', employment: 'self_employed', occupation: 'Venture Capitalist', tier: 'uhnw', state: 'NY', horizon: 95 } },
  { household: 'Wilson Household', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'James', lastName: 'Wilson', dob: '1968-11-02T00:00:00.000Z', gender: 'male', email: 'james.wilson@email.com', phone: '(555) 345-6789', marital: 'divorced', filing: 'single', employment: 'employed', employer: 'Microsoft', occupation: 'VP Engineering', tier: 'hnw', state: 'WA', horizon: 90 } },
  { household: 'Thompson Family', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'Emily', lastName: 'Thompson', dob: '1975-06-18T00:00:00.000Z', gender: 'female', email: 'emily.thompson@email.com', phone: '(555) 456-7890', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Deloitte', occupation: 'Partner', tier: 'hnw', state: 'IL', horizon: 92 }, coClient: { firstName: 'David', lastName: 'Thompson', dob: '1973-01-30T00:00:00.000Z', gender: 'male', email: 'david.thompson@email.com', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Northwestern University', occupation: 'Professor', tier: 'hnw', state: 'IL', horizon: 92 } },
  { household: 'Martinez Household', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'Robert', lastName: 'Martinez', dob: '1960-09-12T00:00:00.000Z', gender: 'male', email: 'robert.martinez@email.com', phone: '(555) 567-8901', marital: 'widowed', filing: 'single', employment: 'retired', employer: null, occupation: 'Retired CEO', tier: 'mass_affluent', state: 'FL', horizon: 90 } },
  { household: 'Anderson Family', advisorId: adv2Id, firmId: firm1Id, primary: { firstName: 'Lisa', lastName: 'Anderson', dob: '1980-04-25T00:00:00.000Z', gender: 'female', email: 'lisa.anderson@email.com', phone: '(555) 678-9012', marital: 'married', filing: 'mfj', employment: 'self_employed', employer: null, occupation: 'Attorney', tier: 'hnw', state: 'TX', horizon: 92 } },
  { household: 'Liu Family', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'Grace', lastName: 'Liu', dob: '1965-12-08T00:00:00.000Z', gender: 'female', email: 'grace.liu@email.com', phone: '(555) 789-0123', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Blackstone', occupation: 'Senior Managing Director', tier: 'uhnw', state: 'NY', horizon: 95 } },
  { household: 'Foster Family', advisorId: adv2Id, firmId: firm1Id, primary: { firstName: 'William', lastName: 'Foster', dob: '1985-07-14T00:00:00.000Z', gender: 'male', email: 'william.foster@email.com', phone: '(555) 890-1234', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Google', occupation: 'Software Engineer', tier: 'mass_affluent', state: 'CA', horizon: 90 }, coClient: { firstName: 'Sarah', lastName: 'Foster', dob: '1987-02-19T00:00:00.000Z', gender: 'female', email: 'sarah.foster@email.com', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Stanford Health', occupation: 'Physician', tier: 'mass_affluent', state: 'CA', horizon: 90 } },
  { household: 'Adams Household', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'Jennifer', lastName: 'Adams', dob: '1970-10-05T00:00:00.000Z', gender: 'female', email: 'jennifer.adams@email.com', phone: '(555) 901-2345', marital: 'single', filing: 'single', employment: 'employed', employer: 'JPMorgan Chase', occupation: 'Managing Director', tier: 'hnw', state: 'CT', horizon: 92 } },
  { household: 'Kim Family', advisorId: adv1Id, firmId: firm1Id, primary: { firstName: 'Patricia', lastName: 'Kim', dob: '1971-05-20T00:00:00.000Z', gender: 'female', email: 'patricia.kim@email.com', phone: '(555) 012-3456', marital: 'married', filing: 'mfj', employment: 'self_employed', employer: null, occupation: 'Entrepreneur', tier: 'uhnw', state: 'WA', horizon: 95 }, coClient: { firstName: 'Thomas', lastName: 'Kim', dob: '1969-11-11T00:00:00.000Z', gender: 'male', email: 'thomas.kim@email.com', marital: 'married', filing: 'mfj', employment: 'employed', employer: 'Amazon', occupation: 'VP Product', tier: 'uhnw', state: 'WA', horizon: 95 } },
  { household: 'Brown Household', advisorId: adv2Id, firmId: firm1Id, primary: { firstName: 'David', lastName: 'Brown', dob: '1990-08-30T00:00:00.000Z', gender: 'male', email: 'david.brown@email.com', phone: '(555) 123-4567', marital: 'single', filing: 'single', employment: 'employed', employer: 'Stripe', occupation: 'Product Manager', tier: 'emerging', state: 'CA', horizon: 90 } },
];

const planStatuses = ['active', 'active', 'needs_review', 'needs_review', 'active', 'draft', 'active', 'needs_review', 'active', 'draft'];
const completionScores = [88, 82, 75, 60, 90, 22, 84, 60, 94, 35];

const insertPlan = db.prepare(`INSERT INTO plans (id, household_id, firm_id, advisor_id, primary_client_id, name, status, plan_type, wealth_tier, start_year, end_year, base_year, completion_score, sections_complete, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertAssumptions = db.prepare(`INSERT INTO plan_assumptions (id, plan_id, equity_return, bond_return, cash_return, real_estate_return, pe_return, inflation_rate, healthcare_inflation, college_inflation, monte_carlo_runs, mc_equity_std_dev, mc_bond_std_dev, success_threshold, ss_cola_rate, ss_haircut, tax_law_scenario, tcja_permanent, life_expectancy_source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const transaction = db.transaction(() => {
  for (let i = 0; i < clientsData.length; i++) {
    const cd = clientsData[i];
    const householdId = cuid();
    const primaryClientId = cuid();

    insertHousehold.run(householdId, cd.firmId, cd.advisorId, cd.household, now, now);

    const p = cd.primary;
    insertClient.run(primaryClientId, householdId, cd.firmId, cd.advisorId, 'primary', p.firstName, p.lastName, p.email, p.phone, p.dob, p.gender, p.marital, p.filing, p.employment, p.employer, p.occupation, p.tier, p.state, p.state, p.horizon, 'US', 'US', 0, 1, now, now);

    if (cd.coClient) {
      const c = cd.coClient;
      const coClientId = cuid();
      insertClient.run(coClientId, householdId, cd.firmId, cd.advisorId, 'co_client', c.firstName, c.lastName, c.email, null, c.dob, c.gender, c.marital, c.filing, c.employment, c.employer || null, c.occupation, c.tier, c.state, c.state, c.horizon, 'US', 'US', 0, 1, now, now);
    }

    // Create a plan for each
    const planId = cuid();
    const currentAge = Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const endYear = 2026 + (p.horizon - currentAge);
    const sections = JSON.stringify({
      profile: true,
      income: i < 6,
      expenses: i < 5,
      netWorth: i < 6,
      goals: i < 4,
      insurance: i < 3,
      assumptions: i < 7,
    });

    insertPlan.run(planId, householdId, cd.firmId, cd.advisorId, primaryClientId, 'Comprehensive Financial Plan', planStatuses[i], 'comprehensive', p.tier, 2026, endYear, 2026, completionScores[i], sections, 1, now, now);

    // Default assumptions
    insertAssumptions.run(cuid(), planId, 0.07, 0.04, 0.045, 0.05, 0.10, 0.028, 0.05, 0.05, 1000, 0.17, 0.06, 0.85, 0.025, 0.0, 'current', 1, 'ssa_tables', now, now);
  }
});

transaction();
console.log('  Clients and plans seeded.');

// ==================== 2026 TAX TABLES ====================
console.log('Seeding 2026 tax tables...');

const insertTaxTable = db.prepare(`INSERT INTO tax_tables (id, tax_year, table_type, filing_status, data, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

const taxTransaction = db.transaction(() => {
  // Federal ordinary income brackets
  const ordinaryBrackets: Record<string, Array<{min: number; max: number | null; rate: number}>> = {
    single: [
      { min: 0, max: 11925, rate: 0.10 }, { min: 11925, max: 48475, rate: 0.12 }, { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 }, { min: 197300, max: 250525, rate: 0.32 }, { min: 250525, max: 626350, rate: 0.35 },
      { min: 626350, max: null, rate: 0.37 },
    ],
    mfj: [
      { min: 0, max: 23850, rate: 0.10 }, { min: 23850, max: 96950, rate: 0.12 }, { min: 96950, max: 206700, rate: 0.22 },
      { min: 206700, max: 394600, rate: 0.24 }, { min: 394600, max: 501050, rate: 0.32 }, { min: 501050, max: 751600, rate: 0.35 },
      { min: 751600, max: null, rate: 0.37 },
    ],
    mfs: [
      { min: 0, max: 11925, rate: 0.10 }, { min: 11925, max: 48475, rate: 0.12 }, { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 }, { min: 197300, max: 250525, rate: 0.32 }, { min: 250525, max: 375800, rate: 0.35 },
      { min: 375800, max: null, rate: 0.37 },
    ],
    hoh: [
      { min: 0, max: 17000, rate: 0.10 }, { min: 17000, max: 64850, rate: 0.12 }, { min: 64850, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 }, { min: 197300, max: 250500, rate: 0.32 }, { min: 250500, max: 626350, rate: 0.35 },
      { min: 626350, max: null, rate: 0.37 },
    ],
  };

  for (const [status, brackets] of Object.entries(ordinaryBrackets)) {
    insertTaxTable.run(cuid(), 2026, 'ordinary_income', status, JSON.stringify(brackets), '2026 federal ordinary income brackets (TCJA permanent per OBBBA)', now, now);
  }

  // Capital gains
  const cgBrackets: Record<string, Array<{min: number; max: number | null; rate: number}>> = {
    single: [{ min: 0, max: 48350, rate: 0 }, { min: 48350, max: 533400, rate: 0.15 }, { min: 533400, max: null, rate: 0.20 }],
    mfj: [{ min: 0, max: 96700, rate: 0 }, { min: 96700, max: 600050, rate: 0.15 }, { min: 600050, max: null, rate: 0.20 }],
  };
  for (const [status, brackets] of Object.entries(cgBrackets)) {
    insertTaxTable.run(cuid(), 2026, 'capital_gains', status, JSON.stringify(brackets), '2026 long-term capital gains brackets', now, now);
  }

  // SS wage base
  insertTaxTable.run(cuid(), 2026, 'ss_wage_base', null, JSON.stringify({
    wageBase: 176100, employeeRate: 0.062, employerRate: 0.062, selfEmployedRate: 0.124,
    medicareTaxRate: 0.0145, additionalMedicareThreshold: { single: 200000, mfj: 250000, mfs: 125000 },
    additionalMedicareRate: 0.009, niitThreshold: { single: 200000, mfj: 250000, mfs: 125000 }, niitRate: 0.038,
  }), '2026 Social Security and Medicare tax parameters', now, now);

  // Contribution limits
  insertTaxTable.run(cuid(), 2026, 'contribution_limits', null, JSON.stringify({
    ira_limit: 7000, ira_catchup_50: 1000, '401k_limit': 23500, '401k_catchup_50': 7500, '401k_catchup_60_63': 11250,
    '401k_total_limit': 70000, '403b_limit': 23500, '457b_limit': 23500,
    hsa_individual: 4300, hsa_family: 8550, hsa_catchup_55: 1000,
    '529_annual_gift': 19000, annual_gift_exclusion: 19000, lifetime_gift_estate_exemption: 13990000,
    standard_deduction_single: 15700, standard_deduction_mfj: 31400, standard_deduction_hoh: 23500, salt_cap: 40000,
  }), '2026 contribution limits and deduction amounts (post-OBBBA)', now, now);

  // IRMAA Part B
  insertTaxTable.run(cuid(), 2026, 'irmaa_part_b', 'single', JSON.stringify([
    { magiMin: 0, magiMax: 106000, monthlyPremium: 185 }, { magiMin: 106000, magiMax: 133000, monthlyPremium: 259 },
    { magiMin: 133000, magiMax: 167000, monthlyPremium: 370.10 }, { magiMin: 167000, magiMax: 200000, monthlyPremium: 481.20 },
    { magiMin: 200000, magiMax: 500000, monthlyPremium: 592.30 }, { magiMin: 500000, magiMax: null, monthlyPremium: 628.90 },
  ]), '2026 Medicare Part B IRMAA brackets (single)', now, now);

  insertTaxTable.run(cuid(), 2026, 'irmaa_part_b', 'mfj', JSON.stringify([
    { magiMin: 0, magiMax: 212000, monthlyPremium: 185 }, { magiMin: 212000, magiMax: 266000, monthlyPremium: 259 },
    { magiMin: 266000, magiMax: 334000, monthlyPremium: 370.10 }, { magiMin: 334000, magiMax: 400000, monthlyPremium: 481.20 },
    { magiMin: 400000, magiMax: 750000, monthlyPremium: 592.30 }, { magiMin: 750000, magiMax: null, monthlyPremium: 628.90 },
  ]), '2026 Medicare Part B IRMAA brackets (MFJ)', now, now);

  // RMD Uniform Lifetime Table
  const rmdTable: Record<number, number> = {};
  [[72,27.4],[73,26.5],[74,25.5],[75,24.6],[76,23.7],[77,22.9],[78,22.0],[79,21.1],[80,20.2],[81,19.4],
   [82,18.5],[83,17.7],[84,16.8],[85,16.0],[86,15.2],[87,14.4],[88,13.7],[89,12.9],[90,12.2],[91,11.5],
   [92,10.8],[93,10.1],[94,9.5],[95,8.9],[96,8.4],[97,7.8],[98,7.3],[99,6.8],[100,6.4],[101,6.0],
   [102,5.6],[103,5.2],[104,4.9],[105,4.6],[106,4.3],[107,4.1],[108,3.9],[109,3.7],[110,3.5]].forEach(([age, factor]) => {
    rmdTable[age] = factor;
  });
  insertTaxTable.run(cuid(), 2026, 'rmd_uniform', null, JSON.stringify(rmdTable), 'RMD Uniform Lifetime Table (2022+). Key=age, Value=distribution period.', now, now);

  // Estate tax
  insertTaxTable.run(cuid(), 2026, 'estate', null, JSON.stringify({
    exemption: 13990000, exemption_married: 27980000, portability: true, topRate: 0.40,
    brackets: [
      { min: 0, max: 10000, rate: 0.18 }, { min: 10000, max: 20000, rate: 0.20 }, { min: 20000, max: 40000, rate: 0.22 },
      { min: 40000, max: 60000, rate: 0.24 }, { min: 60000, max: 80000, rate: 0.26 }, { min: 80000, max: 100000, rate: 0.28 },
      { min: 100000, max: 150000, rate: 0.30 }, { min: 150000, max: 250000, rate: 0.32 }, { min: 250000, max: 500000, rate: 0.34 },
      { min: 500000, max: 750000, rate: 0.37 }, { min: 750000, max: 1000000, rate: 0.39 }, { min: 1000000, max: null, rate: 0.40 },
    ],
  }), '2026 federal estate and gift tax (TCJA permanent per OBBBA)', now, now);
});

taxTransaction();

console.log('Seed complete!');
console.log('  - 2 firms');
console.log('  - 4 advisors');
console.log('  - 10 households with 14 clients');
console.log('  - 10 plans with default assumptions');
console.log('  - 2026 tax tables (ordinary income, CG, SS, contributions, IRMAA, RMD, estate)');

db.close();
