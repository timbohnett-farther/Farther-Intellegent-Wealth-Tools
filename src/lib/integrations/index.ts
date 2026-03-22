/**
 * Farther Prism — Integrations Library
 *
 * Barrel file exporting all integration modules for custodian data sync,
 * HubSpot CRM sync, and market data providers.
 *
 * Usage:
 * ```ts
 * import {
 *   // Types
 *   type CustodianSyncResult,
 *   type HubSpotSyncResult,
 *   type MarketDataSnapshot,
 *
 *   // HubSpot
 *   buildHubSpotProperties,
 *   syncPlanToHubSpot,
 *   syncInsightsAsHubSpotTasks,
 *   createHubSpotProperties,
 *   handleHubSpotWebhook,
 *
 *   // Custodian
 *   syncCustodianAccounts,
 *   getCustodianAdapter,
 *   SchwabAdapter,
 *   FidelityAdapter,
 *   PershingAdapter,
 *
 *   // Market Data
 *   fetchLatestMarketData,
 *   updateEquityPrices,
 *   fetchHistoricalRates,
 *   FREDClient,
 *   FMPClient,
 * } from '@/lib/integrations';
 * ```
 */

// ==================== TYPES ====================

export type {
  // Integration status
  IntegrationConnectionState,
  IntegrationStatus,

  // Custodian types
  BalanceChange,
  CustodianHolding,
  CustodianAccount,
  CustodianTransaction,
  CustodianAdapter,
  CustodianConnectionConfig,
  CustodianSyncResult,

  // HubSpot types
  HubSpotConfig,
  HubSpotSyncResult,
  HubSpotContactProperties,
  PlanSyncData,
  InsightForSync,
  HubSpotWebhookPayload,
  HubSpotWebhookEvent,
  WebhookAction,
  HubSpotPropertyDefinition,

  // Market data types
  MarketDataSnapshot,
  MarketDataProvider,
  EquityHolding,
  PriceUpdate,
  TreasuryRateData,
  CPIData,
  FedFundsData,
  FMPQuote,
  FMPHistoricalPrice,
  FREDConfig,
  FMPConfig,
} from './types';

// ==================== HUBSPOT ====================

export {
  buildHubSpotProperties,
  syncPlanToHubSpot,
  syncInsightsAsHubSpotTasks,
  HUBSPOT_CUSTOM_PROPERTIES as HUBSPOT_SYNC_PROPERTIES,
} from './hubspot/hubspot-sync';

export {
  HUBSPOT_CUSTOM_PROPERTIES,
  HUBSPOT_PROPERTY_GROUP,
  HUBSPOT_PROPERTY_GROUP_LABEL,
  createHubSpotProperties,
} from './hubspot/hubspot-properties';

export {
  handleHubSpotWebhook,
} from './hubspot/hubspot-webhook';

// ==================== CUSTODIAN ====================

export {
  syncCustodianAccounts,
  getCustodianAdapter,
} from './custodian/custodian-sync';

export { SchwabAdapter } from './custodian/adapters/schwab';
export { FidelityAdapter } from './custodian/adapters/fidelity';
export { PershingAdapter } from './custodian/adapters/pershing';

// ==================== MARKET DATA ====================

export {
  fetchLatestMarketData,
  updateEquityPrices,
  fetchHistoricalRates,
} from './market-data/market-data-service';

export { FREDClient } from './market-data/fred-client';
export { FMPClient } from './market-data/fmp-client';
