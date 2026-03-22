/**
 * Farther Prism — Charles Schwab Custodian Adapter
 *
 * Implements the CustodianAdapter interface for Charles Schwab.
 * This is a stub implementation that returns realistic demo data.
 * In production, this would call the Schwab Advisor Services API.
 */

import type {
  CustodianAdapter,
  CustodianConnectionConfig,
  CustodianAccount,
  CustodianTransaction,
  CustodianHolding,
} from '../../types';

/**
 * Schwab custodian adapter.
 *
 * Implements account, balance, and transaction retrieval for
 * Charles Schwab institutional / advisor accounts.
 *
 * @example
 * ```ts
 * const schwab = new SchwabAdapter();
 * const accounts = await schwab.fetchAllAccounts(config);
 * ```
 */
export class SchwabAdapter implements CustodianAdapter {
  readonly name = 'Charles Schwab';

  /**
   * Fetches all accounts associated with the Schwab connection.
   *
   * In production, calls the Schwab Advisor Services REST API:
   *   GET /accounts?firmId={firmId}
   *
   * @param connectionConfig - Connection credentials and configuration.
   * @returns Array of CustodianAccount objects.
   */
  async fetchAllAccounts(
    _connectionConfig: CustodianConnectionConfig,
  ): Promise<CustodianAccount[]> {
    // Stub: return realistic demo accounts
    return [
      buildDemoAccount(
        'SCHW-8842-1001',
        'brokerage_individual',
        1_250_000,
        875_000,
        buildDemoBrokerageHoldings(),
      ),
      buildDemoAccount(
        'SCHW-8842-1002',
        'ira_traditional',
        485_000,
        210_000,
        buildDemoRetirementHoldings(),
      ),
      buildDemoAccount(
        'SCHW-8842-1003',
        'roth_ira',
        325_000,
        180_000,
        buildDemoRothHoldings(),
      ),
    ];
  }

  /**
   * Fetches the current market value for a single Schwab account.
   *
   * @param connectionConfig - Connection credentials.
   * @param accountNumber - Schwab account number.
   * @returns The current market value.
   */
  async fetchAccountBalance(
    _connectionConfig: CustodianConnectionConfig,
    accountNumber: string,
  ): Promise<number> {
    // Stub: return balances based on account number suffix
    const balanceMap: Record<string, number> = {
      'SCHW-8842-1001': 1_250_000,
      'SCHW-8842-1002': 485_000,
      'SCHW-8842-1003': 325_000,
    };
    return balanceMap[accountNumber] ?? 100_000;
  }

  /**
   * Fetches transactions for a single Schwab account within a date range.
   *
   * In production, calls:
   *   GET /accounts/{accountNumber}/transactions?startDate={start}&endDate={end}
   *
   * @param connectionConfig - Connection credentials.
   * @param accountNumber - Schwab account number.
   * @param startDate - ISO-8601 start date.
   * @param endDate - ISO-8601 end date.
   * @returns Array of CustodianTransaction objects.
   */
  async fetchTransactions(
    _connectionConfig: CustodianConnectionConfig,
    accountNumber: string,
    _startDate: string,
    _endDate: string,
  ): Promise<CustodianTransaction[]> {
    // Stub: return realistic demo transactions
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return [
      {
        transactionId: `SCHW-TXN-${Date.now()}-001`,
        accountNumber,
        date: today,
        type: 'dividend',
        symbol: 'VTI',
        description: 'Vanguard Total Stock Market ETF - Dividend',
        quantity: 0,
        price: 0,
        amount: 342.18,
        netAmount: 342.18,
      },
      {
        transactionId: `SCHW-TXN-${Date.now()}-002`,
        accountNumber,
        date: weekAgo,
        type: 'buy',
        symbol: 'SCHD',
        description: 'Schwab U.S. Dividend Equity ETF - Buy',
        quantity: 15,
        price: 78.45,
        amount: -1_176.75,
        netAmount: -1_176.75,
      },
      {
        transactionId: `SCHW-TXN-${Date.now()}-003`,
        accountNumber,
        date: weekAgo,
        type: 'fee',
        symbol: '',
        description: 'Advisory Fee - Q1 2026',
        quantity: 0,
        price: 0,
        amount: -625.00,
        netAmount: -625.00,
      },
    ];
  }
}

// ==================== DEMO DATA BUILDERS ====================

function buildDemoAccount(
  accountNumber: string,
  accountType: string,
  marketValue: number,
  costBasis: number,
  holdings: CustodianHolding[],
): CustodianAccount {
  const totalMV = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const equityMV = holdings
    .filter((h) => h.assetClass === 'equity')
    .reduce((sum, h) => sum + h.marketValue, 0);
  const fixedIncomeMV = holdings
    .filter((h) => h.assetClass === 'fixed_income')
    .reduce((sum, h) => sum + h.marketValue, 0);
  const cashMV = holdings
    .filter((h) => h.assetClass === 'cash')
    .reduce((sum, h) => sum + h.marketValue, 0);
  const altMV = holdings
    .filter((h) => h.assetClass === 'alternative')
    .reduce((sum, h) => sum + h.marketValue, 0);
  const otherMV = holdings
    .filter((h) => h.assetClass === 'other')
    .reduce((sum, h) => sum + h.marketValue, 0);

  return {
    accountNumber,
    accountType,
    marketValue,
    costBasis,
    assetAllocation: {
      equity: totalMV > 0 ? equityMV / totalMV : 0,
      fixedIncome: totalMV > 0 ? fixedIncomeMV / totalMV : 0,
      cash: totalMV > 0 ? cashMV / totalMV : 0,
      alternative: totalMV > 0 ? altMV / totalMV : 0,
      other: totalMV > 0 ? otherMV / totalMV : 0,
    },
    holdings,
  };
}

function buildDemoBrokerageHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      quantity: 1_200,
      price: 275.40,
      marketValue: 330_480,
      costBasis: 228_000,
      assetClass: 'equity',
    },
    {
      symbol: 'VXUS',
      name: 'Vanguard Total International Stock ETF',
      quantity: 2_500,
      price: 62.35,
      marketValue: 155_875,
      costBasis: 125_000,
      assetClass: 'equity',
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 800,
      price: 245.60,
      marketValue: 196_480,
      costBasis: 120_000,
      assetClass: 'equity',
    },
    {
      symbol: 'BND',
      name: 'Vanguard Total Bond Market ETF',
      quantity: 3_000,
      price: 72.80,
      marketValue: 218_400,
      costBasis: 225_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'VTIP',
      name: 'Vanguard Short-Term Inflation-Protected Securities ETF',
      quantity: 1_500,
      price: 48.50,
      marketValue: 72_750,
      costBasis: 75_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'SWVXX',
      name: 'Schwab Value Advantage Money Fund',
      quantity: 276_015,
      price: 1.00,
      marketValue: 276_015,
      costBasis: 276_015,
      assetClass: 'cash',
    },
  ];
}

function buildDemoRetirementHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'SWTSX',
      name: 'Schwab Total Stock Market Index Fund',
      quantity: 2_800,
      price: 82.15,
      marketValue: 230_020,
      costBasis: 112_000,
      assetClass: 'equity',
    },
    {
      symbol: 'SWISX',
      name: 'Schwab International Index Fund',
      quantity: 1_800,
      price: 44.50,
      marketValue: 80_100,
      costBasis: 54_000,
      assetClass: 'equity',
    },
    {
      symbol: 'SWAGX',
      name: 'Schwab U.S. Aggregate Bond Index Fund',
      quantity: 5_200,
      price: 9.80,
      marketValue: 50_960,
      costBasis: 52_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'SNAXX',
      name: 'Schwab Government Money Fund',
      quantity: 123_920,
      price: 1.00,
      marketValue: 123_920,
      costBasis: 123_920,
      assetClass: 'cash',
    },
  ];
}

function buildDemoRothHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      quantity: 450,
      price: 530.20,
      marketValue: 238_590,
      costBasis: 135_000,
      assetClass: 'equity',
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      quantity: 100,
      price: 495.80,
      marketValue: 49_580,
      costBasis: 30_000,
      assetClass: 'equity',
    },
    {
      symbol: 'SWVXX',
      name: 'Schwab Value Advantage Money Fund',
      quantity: 36_830,
      price: 1.00,
      marketValue: 36_830,
      costBasis: 36_830,
      assetClass: 'cash',
    },
  ];
}
