-- CreateTable
CREATE TABLE "firms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "crd_number" TEXT,
    "sec_number" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "phone" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'professional',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "advisors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firm_id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "crd_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'advisor',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "advisors_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firm_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "external_crm_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "households_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "households_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'primary',
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "preferred_name" TEXT,
    "suffix" TEXT,
    "email" TEXT,
    "phone_mobile" TEXT,
    "phone_home" TEXT,
    "date_of_birth" DATETIME NOT NULL,
    "gender" TEXT,
    "ssn_last_four" TEXT,
    "citizenship" TEXT NOT NULL DEFAULT 'US',
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "domicile_state" TEXT,
    "marital_status" TEXT,
    "filing_status" TEXT,
    "dependents_count" INTEGER NOT NULL DEFAULT 0,
    "employment_status" TEXT,
    "employer_name" TEXT,
    "occupation" TEXT,
    "industry" TEXT,
    "wealth_tier" TEXT NOT NULL DEFAULT 'mass_affluent',
    "planning_horizon" INTEGER,
    "life_expectancy" INTEGER,
    "risk_profile_id" TEXT,
    "current_plan_id" TEXT,
    "external_crm_id" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "clients_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clients_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clients_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dependents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "relationship" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "is_special_needs" BOOLEAN NOT NULL DEFAULT false,
    "education_goal_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "dependents_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "primary_client_id" TEXT NOT NULL,
    "co_client_id" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Financial Plan',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "plan_type" TEXT NOT NULL DEFAULT 'comprehensive',
    "wealth_tier" TEXT NOT NULL,
    "start_year" INTEGER NOT NULL,
    "end_year" INTEGER NOT NULL,
    "base_year" INTEGER NOT NULL,
    "completion_score" REAL NOT NULL DEFAULT 0,
    "sections_complete" TEXT,
    "plan_notes" TEXT,
    "last_reviewed_at" DATETIME,
    "next_review_at" DATETIME,
    "client_portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "client_portal_token" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_plan_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plans_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plans_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plans_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plans_primary_client_id_fkey" FOREIGN KEY ("primary_client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plans_co_client_id_fkey" FOREIGN KEY ("co_client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_assumptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "equity_return" REAL NOT NULL DEFAULT 0.0700,
    "bond_return" REAL NOT NULL DEFAULT 0.0400,
    "cash_return" REAL NOT NULL DEFAULT 0.0450,
    "real_estate_return" REAL NOT NULL DEFAULT 0.0500,
    "pe_return" REAL NOT NULL DEFAULT 0.1000,
    "inflation_rate" REAL NOT NULL DEFAULT 0.0280,
    "healthcare_inflation" REAL NOT NULL DEFAULT 0.0500,
    "college_inflation" REAL NOT NULL DEFAULT 0.0500,
    "monte_carlo_runs" INTEGER NOT NULL DEFAULT 1000,
    "mc_equity_std_dev" REAL NOT NULL DEFAULT 0.1700,
    "mc_bond_std_dev" REAL NOT NULL DEFAULT 0.0600,
    "success_threshold" REAL NOT NULL DEFAULT 0.8500,
    "ss_cola_rate" REAL NOT NULL DEFAULT 0.0250,
    "ss_haircut" REAL NOT NULL DEFAULT 0.0000,
    "ss_full_retirement_age" INTEGER,
    "tax_law_scenario" TEXT NOT NULL DEFAULT 'current',
    "tcja_permanent" BOOLEAN NOT NULL DEFAULT true,
    "life_expectancy_source" TEXT NOT NULL DEFAULT 'ssa_tables',
    "custom_life_exp_client" INTEGER,
    "custom_life_exp_co" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan_assumptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "income_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "annual_amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'annual',
    "start_year" INTEGER,
    "end_year" INTEGER,
    "start_age" INTEGER,
    "end_age" INTEGER,
    "growth_rate" REAL NOT NULL DEFAULT 0,
    "is_inflation_adjusted" BOOLEAN NOT NULL DEFAULT false,
    "employer_name" TEXT,
    "is_w2" BOOLEAN NOT NULL DEFAULT false,
    "is_self_employment" BOOLEAN NOT NULL DEFAULT false,
    "se_expense_ratio" REAL,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "tax_character" TEXT NOT NULL DEFAULT 'ordinary',
    "state_taxable" BOOLEAN NOT NULL DEFAULT true,
    "ss_pia" REAL,
    "ss_claim_age" INTEGER,
    "ss_strategy" TEXT,
    "ss_wep_applicable" BOOLEAN NOT NULL DEFAULT false,
    "ss_gpo_applicable" BOOLEAN NOT NULL DEFAULT false,
    "pension_type" TEXT,
    "pension_cola" REAL,
    "survivor_benefit_pct" REAL,
    "rental_gross" REAL,
    "rental_expenses" REAL,
    "rental_depreciation" REAL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "income_sources_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "income_sources_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_essential" BOOLEAN NOT NULL DEFAULT true,
    "annual_amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'annual',
    "start_year" INTEGER,
    "end_year" INTEGER,
    "start_age" INTEGER,
    "end_age" INTEGER,
    "growth_rate" REAL NOT NULL DEFAULT 0,
    "is_inflation_adjusted" BOOLEAN NOT NULL DEFAULT true,
    "inflation_override" REAL,
    "retirement_factor" REAL,
    "is_pre_retirement_only" BOOLEAN NOT NULL DEFAULT false,
    "is_post_retirement_only" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_client" TEXT NOT NULL DEFAULT 'both',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "expenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "co_owner_id" TEXT,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "account_number_last4" TEXT,
    "account_type" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "tax_bucket" TEXT NOT NULL,
    "current_balance" REAL NOT NULL,
    "balance_as_of" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cost_basis" REAL,
    "unrealized_gain" REAL,
    "equity_pct" REAL,
    "bond_pct" REAL,
    "cash_pct" REAL,
    "alternative_pct" REAL,
    "expected_return" REAL,
    "employer_match_pct" REAL,
    "employer_match_limit_pct" REAL,
    "vesting_schedule" TEXT,
    "vesting_years_complete" INTEGER,
    "property_address" TEXT,
    "property_type" TEXT,
    "estimated_value" REAL,
    "mortgage_account_id" TEXT,
    "annual_rent_income" REAL,
    "annual_property_tax" REAL,
    "annual_insurance" REAL,
    "annual_hoa" REAL,
    "annual_maintenance" REAL,
    "depreciation_basis" REAL,
    "policy_type" TEXT,
    "death_benefit" REAL,
    "cash_surrender_value" REAL,
    "annual_premium" REAL,
    "policy_loan_balance" REAL,
    "insured_client_id" TEXT,
    "beneficiary_primary" TEXT,
    "beneficiary_contingent" TEXT,
    "maturity_date" DATETIME,
    "annuity_type" TEXT,
    "surrender_charge_pct" REAL,
    "surrender_period_end" DATETIME,
    "annuity_start_date" DATETIME,
    "guaranteed_income" REAL,
    "fund_name" TEXT,
    "vintage_year" INTEGER,
    "committed_capital" REAL,
    "called_capital" REAL,
    "distributed_capital" REAL,
    "nav" REAL,
    "irr" REAL,
    "expected_exit_year" INTEGER,
    "business_name" TEXT,
    "business_type" TEXT,
    "ownership_pct" REAL,
    "ebitda" REAL,
    "valuation_multiple" REAL,
    "expected_sale_year" INTEGER,
    "token_symbol" TEXT,
    "units_held" REAL,
    "cost_basis_per_unit" REAL,
    "wallet_type" TEXT,
    "collectible_type" TEXT,
    "appraised_value" REAL,
    "last_appraisal_date" DATETIME,
    "is_liability" BOOLEAN NOT NULL DEFAULT false,
    "original_balance" REAL,
    "interest_rate" REAL,
    "loan_type" TEXT,
    "monthly_payment" REAL,
    "remaining_term_months" INTEGER,
    "origination_date" DATETIME,
    "debt_maturity_date" DATETIME,
    "is_tax_deductible" BOOLEAN NOT NULL DEFAULT false,
    "beneficiary_id" TEXT,
    "plan_529_state" TEXT,
    "hsa_investable_balance" REAL,
    "data_source" TEXT NOT NULL DEFAULT 'manual',
    "last_sync_at" DATETIME,
    "external_account_id" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "accounts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounts_co_owner_id_fkey" FOREIGN KEY ("co_owner_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'needs',
    "priority_order" INTEGER,
    "target_amount" REAL,
    "target_year" INTEGER,
    "target_age" INTEGER,
    "recurring_amount" REAL,
    "funding_source" TEXT NOT NULL DEFAULT 'portfolio',
    "funded_accounts" TEXT,
    "current_savings" REAL NOT NULL DEFAULT 0,
    "monthly_contribution" REAL NOT NULL DEFAULT 0,
    "education_beneficiary_id" TEXT,
    "education_school_type" TEXT,
    "education_duration_years" INTEGER,
    "education_annual_cost" REAL,
    "education_pct_funded" REAL,
    "retirement_age_client" INTEGER,
    "retirement_age_co" INTEGER,
    "retirement_income_need" REAL,
    "retirement_income_pct" REAL,
    "retirement_portfolio_needed" REAL,
    "legacy_amount" REAL,
    "legacy_beneficiaries" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "is_inflation_adjusted" BOOLEAN NOT NULL DEFAULT true,
    "growth_rate" REAL,
    "probability_of_success" REAL,
    "funded_ratio" REAL,
    "on_track" BOOLEAN,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "goals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "insured_client_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "death_benefit" REAL,
    "monthly_benefit" REAL,
    "benefit_period" TEXT,
    "elimination_period_days" INTEGER,
    "annual_premium" REAL,
    "premium_waived" BOOLEAN NOT NULL DEFAULT false,
    "policy_number" TEXT,
    "carrier" TEXT,
    "issue_date" DATETIME,
    "expiry_date" DATETIME,
    "is_employer_paid" BOOLEAN NOT NULL DEFAULT false,
    "own_occ" BOOLEAN,
    "any_occ" BOOLEAN,
    "monthly_benefit_max" REAL,
    "ltc_daily_benefit" REAL,
    "ltc_inflation_protection" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "insurance_policies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "insurance_policies_insured_client_id_fkey" FOREIGN KEY ("insured_client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "estate_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_updated" DATETIME,
    "attorney_name" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "estate_documents_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "estate_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "beneficiary_designations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "beneficiary_name" TEXT NOT NULL,
    "beneficiary_type" TEXT NOT NULL,
    "relationship" TEXT,
    "designation_type" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "beneficiary_designations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "beneficiary_designations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_base_case" BOOLEAN NOT NULL DEFAULT false,
    "overrides" TEXT,
    "probability_of_success" REAL,
    "net_worth_at_end" REAL,
    "estate_value" REAL,
    "total_taxes_lifetime" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scenarios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "scenario_id" TEXT,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calc_engine_version" TEXT NOT NULL,
    "probability_of_success" REAL NOT NULL,
    "probability_of_success_adj" REAL,
    "mc_runs" INTEGER NOT NULL,
    "mc_median_terminal_value" REAL NOT NULL,
    "mc_p10_terminal_value" REAL NOT NULL,
    "mc_p25_terminal_value" REAL NOT NULL,
    "mc_p75_terminal_value" REAL NOT NULL,
    "mc_p90_terminal_value" REAL NOT NULL,
    "annual_income" TEXT,
    "annual_expenses" TEXT,
    "annual_taxes" TEXT,
    "annual_savings" TEXT,
    "annual_portfolio" TEXT,
    "annual_net_worth" TEXT,
    "annual_rmd" TEXT,
    "annual_ss_benefit" TEXT,
    "annual_cash_flow" TEXT,
    "goal_results" TEXT,
    "total_taxes_lifetime" REAL,
    "avg_effective_tax_rate" REAL,
    "peak_tax_year" INTEGER,
    "peak_tax_amount" REAL,
    "projected_estate_value" REAL,
    "projected_estate_tax_due" REAL,
    "result_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_results_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_results_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trusts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trust_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_drafting',
    "date_executed" DATETIME,
    "jurisdiction" TEXT,
    "grantor_client_id" TEXT,
    "trustee_name" TEXT,
    "successor_trustee_name" TEXT,
    "beneficiaries" TEXT,
    "linked_account_ids" TEXT,
    "trust_value" REAL,
    "is_grantor_trust" BOOLEAN NOT NULL DEFAULT false,
    "included_in_estate" BOOLEAN NOT NULL DEFAULT false,
    "grat_term" INTEGER,
    "grat_initial_transfer" REAL,
    "grat_7520_rate" REAL,
    "grat_annuity_payment" REAL,
    "grat_remainder_interest" REAL,
    "grat_expected_growth" REAL,
    "charitable_beneficiary" TEXT,
    "payout_rate" REAL,
    "term_type" TEXT,
    "term_years" INTEGER,
    "current_deduction" REAL,
    "annual_distribution" REAL,
    "remainder_beneficiary" TEXT,
    "lead_beneficiary" TEXT,
    "lead_period" INTEGER,
    "annuity_pct" REAL,
    "projected_remainder" REAL,
    "linked_policy_ids" TEXT,
    "crummey_notices" INTEGER,
    "total_death_benefit" REAL,
    "purpose_note" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "trusts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equity_grants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "grant_type" TEXT NOT NULL,
    "ticker_symbol" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "grant_date" DATETIME NOT NULL,
    "shares_granted" INTEGER NOT NULL,
    "grant_price" REAL NOT NULL,
    "current_fmv" REAL NOT NULL,
    "vesting_schedule" TEXT,
    "shares_vested" INTEGER NOT NULL DEFAULT 0,
    "shares_exercised" INTEGER NOT NULL DEFAULT 0,
    "shares_sold" INTEGER NOT NULL DEFAULT 0,
    "shares_held" INTEGER NOT NULL DEFAULT 0,
    "exercise_price" REAL,
    "expiration_date" DATETIME,
    "spread" REAL,
    "intrinsic_value" REAL,
    "iso_amt_preference" REAL,
    "qualifying_disposition" BOOLEAN NOT NULL DEFAULT false,
    "offering_period_start" DATETIME,
    "offering_period_end" DATETIME,
    "purchase_price" REAL,
    "fmv_at_purchase" REAL,
    "current_value" REAL,
    "cost_basis" REAL,
    "unrealized_gain" REAL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "equity_grants_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "charitable_strategies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "strategy_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daf_institution" TEXT,
    "daf_balance" REAL,
    "daf_annual_grants" REAL,
    "daf_funding_method" TEXT,
    "qcd_amount" REAL,
    "qcd_from_account_id" TEXT,
    "qcd_charity_name" TEXT,
    "trust_id" TEXT,
    "annual_amount" REAL,
    "charity_name" TEXT,
    "deduction_value" REAL,
    "tax_savings" REAL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "charitable_strategies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gift_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "relationship" TEXT,
    "gift_year" INTEGER NOT NULL,
    "gift_amount" REAL NOT NULL,
    "gift_type" TEXT NOT NULL,
    "uses_gift_split" BOOLEAN NOT NULL DEFAULT false,
    "form_709_required" BOOLEAN NOT NULL DEFAULT false,
    "asset_description" TEXT,
    "asset_fmv" REAL,
    "asset_cost_basis" REAL,
    "cg_tax_avoided" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "gift_records_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "estate_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "role_type" TEXT NOT NULL,
    "person_name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "estate_roles_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vault_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_by_name" TEXT,
    "storage_path" TEXT NOT NULL,
    "encryption_key" TEXT,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "vault_documents_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vault_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_name" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vault_audit_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "vault_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_portal_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "last_accessed_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_portal_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "life_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_date" DATETIME NOT NULL,
    "description" TEXT,
    "data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "submitted_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "life_events_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_builder_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "completion_score" REAL NOT NULL DEFAULT 0,
    "sections_complete" TEXT,
    "conversation_history" TEXT,
    "extracted_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan_builder_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sections" TEXT,
    "output_format" TEXT NOT NULL DEFAULT 'pdf',
    "logo_url" TEXT,
    "primary_color" TEXT,
    "advisor_signature" TEXT,
    "include_disclosures" BOOLEAN NOT NULL DEFAULT true,
    "delivery_method" TEXT NOT NULL DEFAULT 'download',
    "delivered_to" TEXT,
    "delivered_at" DATETIME,
    "storage_path" TEXT,
    "file_size" INTEGER,
    "generated_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_reports_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "trigger_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "estimated_impact" TEXT,
    "deadline" DATETIME,
    "auto_action_available" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dismissed_at" DATETIME,
    "dismissed_by" TEXT,
    "resolved_at" DATETIME,
    "snoozed_until" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan_alerts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "estimated_impact_type" TEXT,
    "estimated_impact_amt" REAL,
    "estimated_timeframe" TEXT,
    "actions" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_model" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan_insights_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firm_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "before_state" TEXT,
    "after_state" TEXT,
    "plan_id" TEXT,
    "client_id" TEXT,
    "session_id" TEXT
);

-- CreateTable
CREATE TABLE "reg_bi_documentation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "documentation_date" DATETIME NOT NULL,
    "client_profile" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "conflicts_disclosed" BOOLEAN NOT NULL DEFAULT true,
    "conflict_details" TEXT,
    "client_acknowledged_at" DATETIME,
    "delivery_method" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lock_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reg_bi_documentation_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firm_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" TEXT NOT NULL,
    "trigger_config" TEXT,
    "steps" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "client_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trigger_data" TEXT,
    "step_results" TEXT,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "custodian_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firm_id" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "credentials" TEXT,
    "last_sync_at" DATETIME,
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "accounts_synced" INTEGER NOT NULL DEFAULT 0,
    "sync_frequency" TEXT NOT NULL DEFAULT 'nightly',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "market_data_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "data_type" TEXT NOT NULL,
    "sp500_price" REAL,
    "sp500_ytd_return" REAL,
    "ten_year_treasury" REAL,
    "thirty_year_treasury" REAL,
    "fed_funds_rate" REAL,
    "cpi_yoy" REAL,
    "afr_short_term" REAL,
    "afr_mid_term" REAL,
    "afr_long_term" REAL,
    "sec_7520_rate" REAL,
    "raw_data" TEXT,
    "source" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "email_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan_id" TEXT,
    "insight_id" TEXT,
    "to_email" TEXT NOT NULL,
    "to_name" TEXT,
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" DATETIME,
    "sent_at" DATETIME,
    "generated_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tax_tables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tax_year" INTEGER NOT NULL,
    "table_type" TEXT NOT NULL,
    "filing_status" TEXT,
    "data" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tax_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "original_filename" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "ocr_status" TEXT NOT NULL DEFAULT 'pending',
    "ocr_provider" TEXT,
    "ocr_processed_at" DATETIME,
    "ocr_confidence" REAL,
    "ocr_raw_json" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "source_pages_map" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tax_documents_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "advisors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_forms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "form_type" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "field_data" TEXT NOT NULL,
    "agi" REAL,
    "total_income" REAL,
    "adjustments" REAL,
    "deductions" REAL,
    "taxable_income" REAL,
    "total_tax" REAL,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "superseded_by" TEXT,
    "extracted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" DATETIME,
    "verified_by" TEXT,
    CONSTRAINT "tax_forms_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "tax_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_forms_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "tax_year" INTEGER NOT NULL,
    "baseline_form_id" TEXT,
    "adjustments" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "vs_baseline" TEXT,
    "calculation_engine" TEXT NOT NULL DEFAULT 'v1',
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculated_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    CONSTRAINT "tax_scenarios_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_scenarios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tax_scenarios_baseline_form_id_fkey" FOREIGN KEY ("baseline_form_id") REFERENCES "tax_forms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "scenario_id" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detected_by" TEXT NOT NULL DEFAULT 'system',
    "detection_logic" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_value" REAL,
    "confidence" TEXT NOT NULL,
    "analysis_data" TEXT NOT NULL,
    "ai_summary" TEXT,
    "ai_citations" TEXT,
    "ai_generated_at" DATETIME,
    "recommended_at" DATETIME,
    "recommended_by" TEXT,
    "implemented_at" DATETIME,
    "implemented_by" TEXT,
    "dismissed_at" DATETIME,
    "dismissed_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tax_opportunities_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_opportunities_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "tax_scenarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_deliverables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "scenario_id" TEXT,
    "opportunity_id" TEXT,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,
    "generation_inputs" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "superseded_by" TEXT,
    "file_url" TEXT,
    "file_size" INTEGER,
    "checksum" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contains_phi" BOOLEAN NOT NULL DEFAULT true,
    "retention_policy" TEXT NOT NULL DEFAULT '7_years',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "finalized_at" DATETIME,
    "sent_at" DATETIME,
    "sent_to" TEXT,
    CONSTRAINT "tax_deliverables_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_deliverables_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "tax_scenarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tax_deliverables_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "tax_opportunities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "document_id" TEXT,
    "form_id" TEXT,
    "scenario_id" TEXT,
    "opportunity_id" TEXT,
    "deliverable_id" TEXT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "changes_before" TEXT,
    "changes_after" TEXT,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    CONSTRAINT "audit_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "tax_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "tax_forms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "tax_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "tax_opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "tax_deliverables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "advisors_auth_user_id_key" ON "advisors"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "advisors_email_key" ON "advisors"("email");

-- CreateIndex
CREATE INDEX "clients_date_of_birth_idx" ON "clients"("date_of_birth");

-- CreateIndex
CREATE INDEX "plans_status_idx" ON "plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "plan_assumptions_plan_id_key" ON "plan_assumptions"("plan_id");

-- CreateIndex
CREATE INDEX "accounts_account_type_idx" ON "accounts"("account_type");

-- CreateIndex
CREATE INDEX "accounts_tax_bucket_idx" ON "accounts"("tax_bucket");

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_sessions_token_key" ON "client_portal_sessions"("token");

-- CreateIndex
CREATE INDEX "plan_alerts_plan_id_severity_idx" ON "plan_alerts"("plan_id", "severity");

-- CreateIndex
CREATE INDEX "plan_alerts_status_idx" ON "plan_alerts"("status");

-- CreateIndex
CREATE INDEX "plan_insights_plan_id_rank_idx" ON "plan_insights"("plan_id", "rank");

-- CreateIndex
CREATE INDEX "audit_entries_firm_id_timestamp_idx" ON "audit_entries"("firm_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_entries_actor_id_timestamp_idx" ON "audit_entries"("actor_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_entries_plan_id_idx" ON "audit_entries"("plan_id");

-- CreateIndex
CREATE INDEX "audit_entries_resource_type_resource_id_idx" ON "audit_entries"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "reg_bi_documentation_plan_id_idx" ON "reg_bi_documentation"("plan_id");

-- CreateIndex
CREATE INDEX "reg_bi_documentation_advisor_id_idx" ON "reg_bi_documentation"("advisor_id");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_id_status_idx" ON "workflow_executions"("workflow_id", "status");

-- CreateIndex
CREATE INDEX "custodian_connections_firm_id_idx" ON "custodian_connections"("firm_id");

-- CreateIndex
CREATE INDEX "market_data_snapshots_data_type_date_idx" ON "market_data_snapshots"("data_type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "market_data_snapshots_date_data_type_key" ON "market_data_snapshots"("date", "data_type");

-- CreateIndex
CREATE INDEX "email_drafts_status_idx" ON "email_drafts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_tables_tax_year_table_type_filing_status_key" ON "tax_tables"("tax_year", "table_type", "filing_status");

-- CreateIndex
CREATE INDEX "tax_documents_household_id_tax_year_idx" ON "tax_documents"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "tax_documents_ocr_status_idx" ON "tax_documents"("ocr_status");

-- CreateIndex
CREATE INDEX "tax_documents_review_status_idx" ON "tax_documents"("review_status");

-- CreateIndex
CREATE INDEX "tax_forms_household_id_tax_year_form_type_idx" ON "tax_forms"("household_id", "tax_year", "form_type");

-- CreateIndex
CREATE INDEX "tax_forms_document_id_idx" ON "tax_forms"("document_id");

-- CreateIndex
CREATE INDEX "tax_scenarios_household_id_tax_year_idx" ON "tax_scenarios"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "tax_scenarios_plan_id_idx" ON "tax_scenarios"("plan_id");

-- CreateIndex
CREATE INDEX "tax_scenarios_status_idx" ON "tax_scenarios"("status");

-- CreateIndex
CREATE INDEX "tax_opportunities_household_id_category_idx" ON "tax_opportunities"("household_id", "category");

-- CreateIndex
CREATE INDEX "tax_opportunities_status_idx" ON "tax_opportunities"("status");

-- CreateIndex
CREATE INDEX "tax_opportunities_priority_idx" ON "tax_opportunities"("priority");

-- CreateIndex
CREATE INDEX "tax_deliverables_household_id_type_idx" ON "tax_deliverables"("household_id", "type");

-- CreateIndex
CREATE INDEX "tax_deliverables_scenario_id_idx" ON "tax_deliverables"("scenario_id");

-- CreateIndex
CREATE INDEX "tax_deliverables_status_idx" ON "tax_deliverables"("status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_document_id_idx" ON "audit_logs"("document_id");

-- CreateIndex
CREATE INDEX "audit_logs_form_id_idx" ON "audit_logs"("form_id");

-- CreateIndex
CREATE INDEX "audit_logs_scenario_id_idx" ON "audit_logs"("scenario_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
