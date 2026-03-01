/**
 * Farther Prism — Pershing (BNY Mellon) Custodian Adapter
 *
 * Implements the CustodianAdapter interface for Pershing / BNY Mellon.
 * This is a stub implementation that returns realistic demo data.
 * In production, this would call the Pershing NetX360 API.
 */

import type {
  CustodianAdapter,
  CustodianConnectionConfig,
  CustodianAccount,
  CustodianTransaction,
  CustodianHolding,
} from '../../types';

/**
 * Pershing (BNY Mellon) custodian adapter.
 *
 * Implements account, balance, and transaction retrieval for
 * Pershing-cleared accounts via the NetX360 platform.
 *
 * @example
 * ```ts
 * const pershing = new PershingAdapter();
 * const accounts = await pershing.fetchAllAccounts(config);
 * ```
 */
export class PershingAdapter implements CustodianAdapter {
  readonly name = 'Pershing (BNY Mellon)';

  /**
   * Fetches all accounts associated with the Pershing connection.
   *
   * In production, calls the Pershing NetX360 API:
   *   GET /api/v1/accounts?repCode={repCode}
   *
   * @param connectionConfig - Connection credentials and configuration.
   * @returns Array of CustodianAccount objects.
   */
  async fetchAllAccounts(
    _connectionConfig: CustodianConnectionConfig,
  ): Promise<CustodianAccount[]> {
    return [
      buildDemoAccount(
        'PER-6K9-220100',
        'brokerage_individual',
        3_450_000,
        2_100_000,
        buildDemoHNWBrokerageHoldings(),
      ),
      buildDemoAccount(
        'PER-6K9-220101',
        'brokerage_joint',
        1_875_000,
        1_250_000,
        buildDemoJointHoldings(),
      ),
      buildDemoAccount(
        'PER-6K9-22010',
        'ira_rollover',
        920_000,
        410_000,
        buildDemoRolloverIRAHoldings(),
      ),
      buildDemoAccount(
        'PER-6K9-220103',
        'roth_ira',
        415_000,
        240_000,
        buildDemoRothHoldings(),
      ),
    ];
  }

  /**
   * Fetches the current market value for a single Pershing account.
   *
   * @param connectionConfig - Connection credentials.
   * @param accountNumber - Pershing account number.
   * @returns The current market value.
   */
  async fetchAccountBalance(
    _connectionConfig: CustodianConnectionConfig,
    accountNumber: string,
  ): Promise<number> {
    const balanceMap: Record<string, number> = {
      'PER-6K9-220100': 3_450_000,
      'PER-6K9-220101': 1_875_000,
      'PER-6K9-22010': 920_000,
      'PER-6K9-220103': 415_000,
    };
    return balanceMap[accountNumber] ?? 100_000;
  }

  /**
   * Fetches transactions for a single Pershing account within a date range.
   *
   * In production, calls:
   *   GET /api/v1/accounts/{accountNumber}/transactions?fromDate={start}&toDate={end}
   *
   * @param connectionConfig - Connection credentials.
   * @param accountNumber - Pershing account number.
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
    const today = new Date().toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return [
      {
        transactionId: `PER-TXN-${Date.now()}-001`,
        accountNumber,
        date: today,
        type: 'interest',
        symbol: 'PSHXX',
        description: 'Pershing Government Money Market - Interest',
        quantity: 0,
        price: 0,
        amount: 1_245.80,
        netAmount: 1_245.80,
      },
      {
        transactionId: `PER-TXN-${Date.now()}-002`,
        accountNumber,
        date: threeDaysAgo,
        type: 'buy',
        symbol: 'AMZN',
        description: 'Amazon.com Inc. - Buy',
        quantity: 25,
        price: 218.75,
        amount: -5_468.75,
        netAmount: -5_468.75,
      },
      {
        transactionId: `PER-TXN-${Date.now()}-003`,
        accountNumber,
        date: threeDaysAgo,
        type: 'dividend',
        symbol: 'SPY',
        description: 'SPDR S&P 500 ETF Trust - Dividend',
        quantity: 0,
        price: 0,
        amount: 892.50,
        netAmount: 892.50,
      },
      {
        transactionId: `PER-TXN-${Date.now()}-004`,
        accountNumber,
        date: twoWeeksAgo,
        type: 'sell',
        symbol: 'GE',
        description: 'General Electric Co. - Sell (Tax Loss Harvest)',
        quantity: 200,
        price: 178.90,
        amount: 35_780.00,
        netAmount: 35_773.50,
      },
      {
        transactionId: `PER-TXN-${Date.now()}-005`,
        accountNumber,
        date: twoWeeksAgo,
        type: 'buy',
        symbol: 'HON',
        description: 'Honeywell International Inc. - Buy (Replacement)',
        quantity: 165,
        price: 215.40,
        amount: -35_541.00,
        netAmount: -35_541.00,
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

function buildDemoHNWBrokerageHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF Trust',
      quantity: 2_000,
      price: 540.25,
      marketValue: 1_080_500,
      costBasis: 680_000,
      assetClass: 'equity',
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      quantity: 500,
      price: 218.75,
      marketValue: 109_375,
      costBasis: 75_000,
      assetClass: 'equity',
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      quantity: 300,
      price: 875.50,
      marketValue: 262_650,
      costBasis: 90_000,
      assetClass: 'equity',
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway Inc. Class B',
      quantity: 400,
      price: 465.80,
      marketValue: 186_320,
      costBasis: 120_000,
      assetClass: 'equity',
    },
    {
      symbol: 'AGG',
      name: 'iShares Core U.S. Aggregate Bond ETF',
      quantity: 5_000,
      price: 98.50,
      marketValue: 492_500,
      costBasis: 510_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'TIP',
      name: 'iShares TIPS Bond ETF',
      quantity: 2_000,
      price: 108.25,
      marketValue: 216_500,
      costBasis: 220_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'GLD',
      name: 'SPDR Gold Trust',
      quantity: 800,
      price: 245.60,
      marketValue: 196_480,
      costBasis: 160_000,
      assetClass: 'alternative',
    },
    {
      symbol: 'PSHXX',
      name: 'Pershing Government Money Market',
      quantity: 905_675,
      price: 1.00,
      marketValue: 905_675,
      costBasis: 905_675,
      assetClass: 'cash',
    },
  ];
}

function buildDemoJointHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      quantity: 1_800,
      price: 275.40,
      marketValue: 495_720,
      costBasis: 324_000,
      assetClass: 'equity',
    },
    {
      symbol: 'VXUS',
      name: 'Vanguard Total International Stock ETF',
      quantity: 3_000,
      price: 62.35,
      marketValue: 187_050,
      costBasis: 150_000,
      assetClass: 'equity',
    },
    {
      symbol: 'LQD',
      name: 'iShares Investment Grade Corporate Bond ETF',
      quantity: 3_500,
      price: 108.80,
      marketValue: 380_800,
      costBasis: 395_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'MUB',
      name: 'iShares National Muni Bond ETF',
      quantity: 2_500,
      price: 107.50,
      marketValue: 268_750,
      costBasis: 275_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'PSHXX',
      name: 'Pershing Government Money Market',
      quantity: 542_680,
      price: 1.00,
      marketValue: 542_680,
      costBasis: 542_680,
      assetClass: 'cash',
    },
  ];
}

function buildDemoRolloverIRAHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'IVV',
      name: 'iShares Core S&P 500 ETF',
      quantity: 700,
      price: 542.10,
      marketValue: 379_470,
      costBasis: 175_000,
      assetClass: 'equity',
    },
    {
      symbol: 'IEFA',
      name: 'iShares Core MSCI EAFE ETF',
      quantity: 1_500,
      price: 78.90,
      marketValue: 118_350,
      costBasis: 90_000,
      assetClass: 'equity',
    },
    {
      symbol: 'IEMG',
      name: 'iShares Core MSCI Emerging Markets ETF',
      quantity: 1_200,
      price: 55.40,
      marketValue: 66_480,
      costBasis: 60_000,
      assetClass: 'equity',
    },
    {
      symbol: 'AGG',
      name: 'iShares Core U.S. Aggregate Bond ETF',
      quantity: 2_000,
      price: 98.50,
      marketValue: 197_000,
      costBasis: 200_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'PSHXX',
      name: 'Pershing Government Money Market',
      quantity: 158_700,
      price: 1.00,
      marketValue: 158_700,
      costBasis: 158_700,
      assetClass: 'cash',
    },
  ];
}

function buildDemoRothHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      quantity: 350,
      price: 495.80,
      marketValue: 173_530,
      costBasis: 105_000,
      assetClass: 'equity',
    },
    {
      symbol: 'ARKK',
      name: 'ARK Innovation ETF',
      quantity: 1_000,
      price: 58.20,
      marketValue: 58_200,
      costBasis: 45_000,
      assetClass: 'equity',
    },
    {
      symbol: 'VGT',
      name: 'Vanguard Information Technology ETF',
      quantity: 200,
      price: 580.40,
      marketValue: 116_080,
      costBasis: 70_000,
      assetClass: 'equity',
    },
    {
      symbol: 'PSHXX',
      name: 'Pershing Government Money Market',
      quantity: 67_190,
      price: 1.00,
      marketValue: 67_190,
      costBasis: 67_190,
      assetClass: 'cash',
    },
  ];
}
