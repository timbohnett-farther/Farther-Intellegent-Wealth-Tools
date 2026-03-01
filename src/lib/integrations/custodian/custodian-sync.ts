/**
 * Farther Prism — Custodian Sync Orchestrator
 *
 * Coordinates account and transaction sync across multiple custodians
 * (Schwab, Fidelity, Pershing). Uses the CustodianAdapter interface
 * to abstract custodian-specific API differences.
 */

import type {
  CustodianAdapter,
  CustodianConnectionConfig,
  CustodianSyncResult,
  BalanceChange,
  CustodianAccount,
} from '../types';
import { SchwabAdapter } from './adapters/schwab';
import { FidelityAdapter } from './adapters/fidelity';
import { PershingAdapter } from './adapters/pershing';

// ==================== ADAPTER REGISTRY ====================

/** Singleton adapter instances keyed by custodian name. */
const adapterRegistry: Record<string, CustodianAdapter> = {
  schwab: new SchwabAdapter(),
  fidelity: new FidelityAdapter(),
  pershing: new PershingAdapter(),
};

/**
 * Returns the appropriate CustodianAdapter for a given custodian name.
 *
 * @param custodian - The custodian identifier (e.g. 'schwab', 'fidelity', 'pershing').
 * @returns The matching CustodianAdapter instance.
 * @throws Error if the custodian is not supported.
 *
 * @example
 * ```ts
 * const adapter = getCustodianAdapter('schwab');
 * const accounts = await adapter.fetchAllAccounts(config);
 * ```
 */
export function getCustodianAdapter(custodian: string): CustodianAdapter {
  const normalized = custodian.toLowerCase().trim();
  const adapter = adapterRegistry[normalized];

  if (!adapter) {
    const supported = Object.keys(adapterRegistry).join(', ');
    throw new Error(
      `Unsupported custodian: "${custodian}". Supported custodians: ${supported}.`,
    );
  }

  return adapter;
}

// ==================== SYNC ALL CONNECTIONS ====================

/**
 * Syncs account data from one or more custodian connections.
 *
 * For each connection, the function:
 * 1. Resolves the correct adapter via getCustodianAdapter.
 * 2. Fetches all accounts from the custodian.
 * 3. Computes balance changes by comparing to the previous known state.
 * 4. Fetches new transactions since the last sync.
 * 5. Aggregates results across all connections.
 *
 * @param connections - Array of custodian connection configurations.
 * @returns Aggregated sync result across all connections.
 *
 * @example
 * ```ts
 * const result = await syncCustodianAccounts([
 *   { custodian: 'schwab', apiKey: 'key1', firmId: 'F001' },
 *   { custodian: 'fidelity', apiKey: 'key2' },
 * ]);
 * console.log(`${result.accountsUpdated} accounts updated, ${result.newTransactions} new txns`);
 * ```
 */
export async function syncCustodianAccounts(
  connections: CustodianConnectionConfig[],
): Promise<CustodianSyncResult> {
  const aggregateResult: CustodianSyncResult = {
    accountsUpdated: 0,
    accountsCreated: 0,
    balanceChanges: [],
    newTransactions: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  };

  if (!connections || connections.length === 0) {
    aggregateResult.errors.push('No custodian connections provided.');
    return aggregateResult;
  }

  // Process each connection sequentially to avoid overwhelming APIs
  for (const connection of connections) {
    try {
      const result = await syncSingleConnection(connection);
      aggregateResult.accountsUpdated += result.accountsUpdated;
      aggregateResult.accountsCreated += result.accountsCreated;
      aggregateResult.balanceChanges.push(...result.balanceChanges);
      aggregateResult.newTransactions += result.newTransactions;
      aggregateResult.errors.push(...result.errors);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : `Unknown error syncing ${connection.custodian}`;
      aggregateResult.errors.push(
        `[${connection.custodian}] ${message}`,
      );
    }
  }

  aggregateResult.syncedAt = new Date().toISOString();
  return aggregateResult;
}

// ==================== SINGLE CONNECTION SYNC ====================

/**
 * Syncs a single custodian connection. This is an internal function
 * called by syncCustodianAccounts for each connection.
 */
async function syncSingleConnection(
  connection: CustodianConnectionConfig,
): Promise<CustodianSyncResult> {
  const errors: string[] = [];
  let accountsUpdated = 0;
  let accountsCreated = 0;
  const balanceChanges: BalanceChange[] = [];
  let newTransactions = 0;

  // 1. Resolve the adapter
  const adapter = getCustodianAdapter(connection.custodian);

  // 2. Fetch all accounts
  let accounts: CustodianAccount[];
  try {
    accounts = await adapter.fetchAllAccounts(connection);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch accounts';
    errors.push(`[${adapter.name}] ${msg}`);
    return {
      accountsUpdated,
      accountsCreated,
      balanceChanges,
      newTransactions,
      errors,
      syncedAt: new Date().toISOString(),
    };
  }

  // 3. Process each account
  for (const account of accounts) {
    try {
      // In production, look up the account in our database.
      // For this stub, we simulate that accounts with even-length
      // account numbers already exist.
      const isExisting = account.accountNumber.length % 2 === 0;

      if (isExisting) {
        accountsUpdated++;
      } else {
        accountsCreated++;
      }

      // Compute balance change (stub: use 95% of current balance as "previous")
      const previousBalance = account.marketValue * 0.95;
      const delta = account.marketValue - previousBalance;
      const deltaPct = previousBalance > 0 ? delta / previousBalance : 0;

      balanceChanges.push({
        accountId: account.accountNumber,
        previousBalance,
        newBalance: account.marketValue,
        delta,
        deltaPct,
      });

      // 4. Fetch new transactions since last sync
      // In production, use the last sync timestamp. Stub: last 30 days.
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const transactions = await adapter.fetchTransactions(
        connection,
        account.accountNumber,
        startDate,
        endDate,
      );

      newTransactions += transactions.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error processing account';
      errors.push(
        `[${adapter.name}] Account ${account.accountNumber}: ${msg}`,
      );
    }
  }

  return {
    accountsUpdated,
    accountsCreated,
    balanceChanges,
    newTransactions,
    errors,
    syncedAt: new Date().toISOString(),
  };
}
