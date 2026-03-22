/**
 * Farther Prism — Fidelity Custodian Adapter
 *
 * Implements the CustodianAdapter interface for Fidelity Institutional.
 * This is a stub implementation that returns realistic demo data.
 * In production, this would call the Fidelity Wealthscape API.
 */

import type {
  CustodianAdapter,
  CustodianConnectionConfig,
  CustodianAccount,
  CustodianTransaction,
  CustodianHolding,
} from '../../types';

/**
 * Fidelity custodian adapter.
 *
 * Implements account, balance, and transaction retrieval for
 * Fidelity Institutional / Wealthscape accounts.
 *
 * @example
 * ```ts
 * const fidelity = new FidelityAdapter();
 * const accounts = await fidelity.fetchAllAccounts(config);
 * ```
 */
export class FidelityAdapter implements CustodianAdapter {
  readonly name = 'Fidelity Institutional';

  /**
   * Fetches all accounts associated with the Fidelity connection.
   *
   * In production, calls the Fidelity Wealthscape API:
   *   GET /advisor/accounts
   *
   * @param connectionConfig - Connection credentials and configuration.
   * @returns Array of CustodianAccount objects.
   */
  async fetchAllAccounts(
    _connectionConfig: CustodianConnectionConfig,
  ): Promise<CustodianAccount[]> {
    return [
      buildDemoAccount(
        'FID-Z55-447201',
        'brokerage_joint',
        2_150_000,
        1_420_000,
        buildDemoJointBrokerageHoldings(),
      ),
      buildDemoAccount(
        'FID-Z55-447202',
        '401k_traditional',
        780_000,
        390_000,
        buildDemo401kHoldings(),
      ),
      buildDemoAccount(
        'FID-Z55-44720',
        'ira_traditional',
        290_000,
        145_000,
        buildDemoIRAHoldings(),
      ),
    ];
  }

  /**
   * Fetches the current market value for a single Fidelity account.
   *
   * @param connectionConfig - Connection credentials.
   * @param accountNumber - Fidelity account number.
   * @returns The current market value.
   */
  async fetchAccountBalance(
    _connectionConfig: CustodianConnectionConfig,
    accountNumber: string,
  ): Promise<number> {
    const balanceMap: Record<string, number> = {
      'FID-Z55-447201': 2_150_000,
      'FID-Z55-447202': 780_000,
      'FID-Z55-44720': 290_000,
    };
    return balanceMap[accountNumber] ?? 100_000;
  }

  /**
   * Fetches transactions for a single Fidelity account within a date range.
   *
   * In production, calls:
   *   GET /advisor/accounts/{accountNumber}/activity?from={start}&to={end}
   *
   * @param connectionConfig - Connection credentials.
   * @param accountNumber - Fidelity account number.
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
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return [
      {
        transactionId: `FID-TXN-${Date.now()}-001`,
        accountNumber,
        date: today,
        type: 'dividend',
        symbol: 'FXAIX',
        description: 'Fidelity 500 Index Fund - Dividend Reinvestment',
        quantity: 3.45,
        price: 195.20,
        amount: 673.44,
        netAmount: 673.44,
      },
      {
        transactionId: `FID-TXN-${Date.now()}-002`,
        accountNumber,
        date: fiveDaysAgo,
        type: 'buy',
        symbol: 'FBALX',
        description: 'Fidelity Balanced Fund - Purchase',
        quantity: 200,
        price: 28.90,
        amount: -5_780.00,
        netAmount: -5_780.00,
      },
      {
        transactionId: `FID-TXN-${Date.now()}-003`,
        accountNumber,
        date: tenDaysAgo,
        type: 'sell',
        symbol: 'MSFT',
        description: 'Microsoft Corporation - Sell',
        quantity: 50,
        price: 430.15,
        amount: 21_507.50,
        netAmount: 21_500.00,
      },
      {
        transactionId: `FID-TXN-${Date.now()}-004`,
        accountNumber,
        date: tenDaysAgo,
        type: 'transfer_in',
        symbol: '',
        description: 'Wire Transfer - Incoming',
        quantity: 0,
        price: 0,
        amount: 50_000.00,
        netAmount: 50_000.00,
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

function buildDemoJointBrokerageHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'FXAIX',
      name: 'Fidelity 500 Index Fund',
      quantity: 3_200,
      price: 195.20,
      marketValue: 624_640,
      costBasis: 400_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FSPSX',
      name: 'Fidelity International Index Fund',
      quantity: 5_500,
      price: 52.80,
      marketValue: 290_400,
      costBasis: 220_000,
      assetClass: 'equity',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 600,
      price: 430.15,
      marketValue: 258_090,
      costBasis: 150_000,
      assetClass: 'equity',
    },
    {
      symbol: 'JNJ',
      name: 'Johnson & Johnson',
      quantity: 1_000,
      price: 162.40,
      marketValue: 162_400,
      costBasis: 130_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FXNAX',
      name: 'Fidelity U.S. Bond Index Fund',
      quantity: 20_000,
      price: 10.45,
      marketValue: 209_000,
      costBasis: 220_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'FBNDX',
      name: 'Fidelity Investment Grade Bond Fund',
      quantity: 15_000,
      price: 10.85,
      marketValue: 162_750,
      costBasis: 170_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'FDRXX',
      name: 'Fidelity Government Cash Reserves',
      quantity: 442_720,
      price: 1.00,
      marketValue: 442_720,
      costBasis: 442_720,
      assetClass: 'cash',
    },
  ];
}

function buildDemo401kHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'FXAIX',
      name: 'Fidelity 500 Index Fund',
      quantity: 1_500,
      price: 195.20,
      marketValue: 292_800,
      costBasis: 150_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FSMEX',
      name: 'Fidelity Select Medical Delivery Portfolio',
      quantity: 800,
      price: 85.30,
      marketValue: 68_240,
      costBasis: 48_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FBALX',
      name: 'Fidelity Balanced Fund',
      quantity: 5_000,
      price: 28.90,
      marketValue: 144_500,
      costBasis: 100_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FTBFX',
      name: 'Fidelity Total Bond Fund',
      quantity: 15_000,
      price: 9.50,
      marketValue: 142_500,
      costBasis: 150_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'FDRXX',
      name: 'Fidelity Government Cash Reserves',
      quantity: 131_960,
      price: 1.00,
      marketValue: 131_960,
      costBasis: 131_960,
      assetClass: 'cash',
    },
  ];
}

function buildDemoIRAHoldings(): CustodianHolding[] {
  return [
    {
      symbol: 'FXAIX',
      name: 'Fidelity 500 Index Fund',
      quantity: 600,
      price: 195.20,
      marketValue: 117_120,
      costBasis: 60_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FSPSX',
      name: 'Fidelity International Index Fund',
      quantity: 1_200,
      price: 52.80,
      marketValue: 63_360,
      costBasis: 42_000,
      assetClass: 'equity',
    },
    {
      symbol: 'FXNAX',
      name: 'Fidelity U.S. Bond Index Fund',
      quantity: 6_000,
      price: 10.45,
      marketValue: 62_700,
      costBasis: 65_000,
      assetClass: 'fixed_income',
    },
    {
      symbol: 'FDRXX',
      name: 'Fidelity Government Cash Reserves',
      quantity: 46_820,
      price: 1.00,
      marketValue: 46_820,
      costBasis: 46_820,
      assetClass: 'cash',
    },
  ];
}
