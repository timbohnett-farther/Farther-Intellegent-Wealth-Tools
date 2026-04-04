/**
 * Fidelity Advisor Services API Integration
 *
 * Direct custodian integration for pulling account data, holdings, and
 * statements from Fidelity. Converts Fidelity-specific formats to standard
 * proposal engine types.
 */

import type { Holding, StatementScanResult, AssetClass, AccountType, MoneyCents } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface FidelityAccount {
  accountId: string;
  accountType: string;
  accountName: string;
  clientName: string;
  totalValue: number;
  lastUpdated: string;
}

interface FidelityHolding {
  symbol: string;
  description: string;
  quantity: number;
  price: number;
  marketValue: number;
  assetType: string;
  costBasis?: number;
}

interface FidelityAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ============================================================================
// Configuration
// ============================================================================

const FIDELITY_CLIENT_ID = process.env.FIDELITY_CLIENT_ID;
const FIDELITY_CLIENT_SECRET = process.env.FIDELITY_CLIENT_SECRET;
const FIDELITY_BASE_URL = process.env.FIDELITY_BASE_URL || 'https://api.fidelity.com/advisor/v1';

const TIMEOUT_MS = 30000;

// In-memory token cache (production should use Redis)
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Get all Fidelity accounts for an advisor
 */
export async function getFidelityAccounts(advisorId: string): Promise<FidelityAccount[]> {
  if (!FIDELITY_CLIENT_ID || !FIDELITY_CLIENT_SECRET) {
    console.warn('[fidelity] Missing credentials — returning mock accounts');
    return [
      {
        accountId: 'FID-123456',
        accountType: 'Individual',
        accountName: 'John Doe Brokerage',
        clientName: 'John Doe',
        totalValue: 500000,
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  try {
    const token = await getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${FIDELITY_BASE_URL}/accounts?advisorId=${advisorId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fidelity accounts fetch failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.accounts as FidelityAccount[];
  } catch (err) {
    console.error('[fidelity] Failed to fetch accounts:', err);
    throw err;
  }
}

/**
 * Get holdings for a specific Fidelity account
 */
export async function getFidelityHoldings(accountId: string): Promise<Holding[]> {
  if (!FIDELITY_CLIENT_ID || !FIDELITY_CLIENT_SECRET) {
    console.warn('[fidelity] Missing credentials — returning mock holdings');
    return [
      {
        ticker: 'VTI',
        cusip: null,
        description: 'Vanguard Total Stock Market ETF',
        assetClass: 'EQUITY_US_LARGE' as AssetClass,
        quantity: 1000,
        price: 25000 as MoneyCents, // $250.00
        marketValue: 25000000 as MoneyCents, // $250,000.00
        costBasis: 22000000 as MoneyCents, // $220,000.00
        unrealizedGain: 3000000 as MoneyCents, // $30,000.00
        gainPct: 13.64,
        expenseRatio: null,
        dividendYield: null,
        holdingPeriod: null,
        accountType: 'TAXABLE' as AccountType,
        accountName: 'Fidelity Brokerage Account',
      },
    ];
  }

  try {
    const token = await getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${FIDELITY_BASE_URL}/accounts/${accountId}/holdings`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fidelity holdings fetch failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return (data.holdings as FidelityHolding[]).map(mapFidelityHoldingToStandard);
  } catch (err) {
    console.error('[fidelity] Failed to fetch holdings:', err);
    throw err;
  }
}

/**
 * Pull Fidelity statement and convert to standard scan result
 */
export async function pullFidelityStatement(accountId: string): Promise<StatementScanResult> {
  try {
    const account = await getFidelityAccountDetails(accountId);
    const holdings = await getFidelityHoldings(accountId);

    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const cashAndEquivalents = holdings
      .filter(h => h.assetClass === 'CASH' || h.assetClass === 'CASH_EQUIVALENT')
      .reduce((sum, h) => sum + h.marketValue, 0);

    return {
      scanId: crypto.randomUUID(),
      accountHolder: account.clientName,
      institution: 'Fidelity',
      accountType: mapFidelityAccountType(account.accountType),
      accountNumber: `****${accountId.slice(-4)}`,
      statementDate: account.lastUpdated,
      totalValue: totalValue as MoneyCents,
      holdings,
      cashAndEquivalents: cashAndEquivalents as MoneyCents,
      confidence: 1.0, // API data is highly reliable
      flaggedForReview: [],
      captureMethod: 'CUSTODIAN_PULL',
      processedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[fidelity] Failed to pull statement:', err);
    throw err;
  }
}

// ============================================================================
// OAuth 2.0 Token Management
// ============================================================================

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const credentials = Buffer.from(
      `${FIDELITY_CLIENT_ID}:${FIDELITY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(`${FIDELITY_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fidelity OAuth failed: ${response.status} ${errorText}`);
    }

    const data: FidelityAccessTokenResponse = await response.json();

    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 min early

    return cachedAccessToken;
  } catch (err) {
    console.error('[fidelity] OAuth token fetch failed:', err);
    throw err;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function getFidelityAccountDetails(accountId: string): Promise<FidelityAccount> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const response = await fetch(`${FIDELITY_BASE_URL}/accounts/${accountId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fidelity account details fetch failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function mapFidelityHoldingToStandard(fh: FidelityHolding): Holding {
  const marketValue = dollarsToCents(fh.marketValue) as MoneyCents;
  const costBasis = fh.costBasis ? (dollarsToCents(fh.costBasis) as MoneyCents) : null;
  const unrealizedGain = costBasis ? ((marketValue - costBasis) as MoneyCents) : null;
  const gainPct = costBasis && costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;

  return {
    ticker: fh.symbol || null,
    cusip: null,
    description: fh.description,
    assetClass: mapFidelityAssetType(fh.assetType),
    quantity: fh.quantity,
    price: dollarsToCents(fh.price) as MoneyCents,
    marketValue,
    costBasis,
    unrealizedGain,
    gainPct,
    expenseRatio: null,
    dividendYield: null,
    holdingPeriod: null,
    accountType: 'TAXABLE', // Default to TAXABLE - should be passed from account context
    accountName: 'Fidelity Account',
  };
}

function mapFidelityAssetType(fidelityType: string): AssetClass {
  const typeMap: Record<string, AssetClass> = {
    EQUITY: 'EQUITY_US_LARGE',
    EQUITY_LARGE_CAP: 'EQUITY_US_LARGE',
    EQUITY_MID_CAP: 'EQUITY_US_MID',
    EQUITY_SMALL_CAP: 'EQUITY_US_SMALL',
    EQUITY_INTERNATIONAL: 'EQUITY_INTL_DEVELOPED',
    EQUITY_EMERGING: 'EQUITY_INTL_EMERGING',
    BOND: 'FIXED_INCOME_CORP',
    BOND_GOVT: 'FIXED_INCOME_GOVT',
    BOND_CORP: 'FIXED_INCOME_CORP',
    BOND_MUNI: 'FIXED_INCOME_MUNI',
    MONEY_MARKET: 'CASH_EQUIVALENT',
    CASH: 'CASH',
    REAL_ESTATE: 'REAL_ESTATE',
    COMMODITY: 'COMMODITIES',
    ALTERNATIVE: 'ALTERNATIVE_HEDGE',
  };

  return typeMap[fidelityType.toUpperCase()] || 'EQUITY_US_LARGE';
}

function mapFidelityAccountType(fidelityType: string): AccountType {
  const typeMap: Record<string, AccountType> = {
    INDIVIDUAL: 'TAXABLE',
    JOINT: 'JOINT',
    IRA: 'IRA',
    ROTH_IRA: 'ROTH_IRA',
    '401K': '401K',
    TRUST: 'TRUST',
    ENTITY: 'OTHER',
  };

  return typeMap[fidelityType.toUpperCase()] || 'TAXABLE';
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// ============================================================================
// Exports
// ============================================================================

export { mapFidelityAssetType, mapFidelityAccountType, dollarsToCents };
