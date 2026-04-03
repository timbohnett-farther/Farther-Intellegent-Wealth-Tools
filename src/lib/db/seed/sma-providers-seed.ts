/**
 * SMA Provider Seed Data
 *
 * Top 50 SMA providers ranked by AUM.
 * Initial working set: J.P. Morgan, BlackRock/Aperio, Vanguard, Fidelity, State Street GA
 *
 * Data sources:
 * - Cerulli Associates SMA rankings
 * - MM&A SMA Manager Database
 * - Public SEC ADV filings
 */

import { db } from '../index';
import { smaProviders, smaProviderSeedUrls } from '../schema';
import { eq } from 'drizzle-orm';

export interface ProviderSeed {
  provider_key: string;
  provider_name: string;
  provider_rank: number;
  website_domain: string;
  allowed_domains_json: string[];
  preferred_fetch_mode: 'bright_data' | 'tavily' | 'direct';
  auth_sensitivity: 'public' | 'login_required' | 'paywalled';
  discovery_mode: 'active' | 'paused' | 'manual_only';
  provider_tier: 'tier_1' | 'tier_2' | 'tier_3';
  aum_bn: string; // Numeric string for precision
  strategy_count_estimate: number;
}

export interface SeedUrlData {
  provider_key: string;
  seed_url: string;
  url_type: 'strategy_list' | 'pdf_index' | 'sitemap' | 'search_page';
  url_label: string;
  crawl_depth: number;
  priority: number;
}

/**
 * Top 50 SMA Providers
 * Tier 1: AUM ≥ $50B (ranks 1-10)
 * Tier 2: AUM $10-50B (ranks 11-25)
 * Tier 3: AUM < $10B (ranks 26-50)
 */
export const TOP_50_PROVIDERS: ProviderSeed[] = [
  // ===== TIER 1: Top 10 Providers (AUM ≥ $50B) =====
  {
    provider_key: 'jpmorgan',
    provider_name: 'J.P. Morgan Asset Management',
    provider_rank: 1,
    website_domain: 'jpmorgan.com',
    allowed_domains_json: ['jpmorgan.com', 'jpmorganam.com', 'jpmorganassetmanagement.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '450.00',
    strategy_count_estimate: 85,
  },
  {
    provider_key: 'blackrock',
    provider_name: 'BlackRock',
    provider_rank: 2,
    website_domain: 'blackrock.com',
    allowed_domains_json: ['blackrock.com', 'ishares.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '380.00',
    strategy_count_estimate: 120,
  },
  {
    provider_key: 'aperio',
    provider_name: 'Aperio (BlackRock)',
    provider_rank: 3,
    website_domain: 'aperiogroup.com',
    allowed_domains_json: ['aperiogroup.com', 'blackrock.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '125.00',
    strategy_count_estimate: 42,
  },
  {
    provider_key: 'vanguard',
    provider_name: 'Vanguard',
    provider_rank: 4,
    website_domain: 'vanguard.com',
    allowed_domains_json: ['vanguard.com', 'institutional.vanguard.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '215.00',
    strategy_count_estimate: 35,
  },
  {
    provider_key: 'fidelity',
    provider_name: 'Fidelity Investments',
    provider_rank: 5,
    website_domain: 'fidelity.com',
    allowed_domains_json: ['fidelity.com', 'institutional.fidelity.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '185.00',
    strategy_count_estimate: 68,
  },
  {
    provider_key: 'state_street_ga',
    provider_name: 'State Street Global Advisors',
    provider_rank: 6,
    website_domain: 'ssga.com',
    allowed_domains_json: ['ssga.com', 'statestreet.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '160.00',
    strategy_count_estimate: 52,
  },
  {
    provider_key: 'morgan_stanley',
    provider_name: 'Morgan Stanley Investment Management',
    provider_rank: 7,
    website_domain: 'morganstanley.com',
    allowed_domains_json: ['morganstanley.com', 'msim.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '142.00',
    strategy_count_estimate: 63,
  },
  {
    provider_key: 'goldman_sachs',
    provider_name: 'Goldman Sachs Asset Management',
    provider_rank: 8,
    website_domain: 'gsam.com',
    allowed_domains_json: ['gsam.com', 'goldmansachs.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '128.00',
    strategy_count_estimate: 47,
  },
  {
    provider_key: 'ubs',
    provider_name: 'UBS Asset Management',
    provider_rank: 9,
    website_domain: 'ubs.com',
    allowed_domains_json: ['ubs.com', 'ubs-assetmanagement.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '115.00',
    strategy_count_estimate: 55,
  },
  {
    provider_key: 'parametric',
    provider_name: 'Parametric Portfolio Associates (Morgan Stanley)',
    provider_rank: 10,
    website_domain: 'parametricportfolio.com',
    allowed_domains_json: ['parametricportfolio.com', 'morganstanley.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_1',
    aum_bn: '98.00',
    strategy_count_estimate: 38,
  },

  // ===== TIER 2: Ranks 11-25 (AUM $10-50B) =====
  {
    provider_key: 'northern_trust',
    provider_name: 'Northern Trust Asset Management',
    provider_rank: 11,
    website_domain: 'northerntrust.com',
    allowed_domains_json: ['northerntrust.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '45.00',
    strategy_count_estimate: 42,
  },
  {
    provider_key: 'invesco',
    provider_name: 'Invesco',
    provider_rank: 12,
    website_domain: 'invesco.com',
    allowed_domains_json: ['invesco.com', 'invesco.us'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '38.00',
    strategy_count_estimate: 51,
  },
  {
    provider_key: 'prudential',
    provider_name: 'Prudential Financial (PGIM)',
    provider_rank: 13,
    website_domain: 'pgim.com',
    allowed_domains_json: ['pgim.com', 'prudential.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '35.00',
    strategy_count_estimate: 44,
  },
  {
    provider_key: 'wells_fargo',
    provider_name: 'Wells Fargo Asset Management',
    provider_rank: 14,
    website_domain: 'wellsfargo.com',
    allowed_domains_json: ['wellsfargo.com', 'allspringglobal.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '32.00',
    strategy_count_estimate: 39,
  },
  {
    provider_key: 'pimco',
    provider_name: 'PIMCO',
    provider_rank: 15,
    website_domain: 'pimco.com',
    allowed_domains_json: ['pimco.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '28.00',
    strategy_count_estimate: 25,
  },
  {
    provider_key: 'legg_mason',
    provider_name: 'Legg Mason (Franklin Templeton)',
    provider_rank: 16,
    website_domain: 'leggmason.com',
    allowed_domains_json: ['leggmason.com', 'franklintempleton.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '24.00',
    strategy_count_estimate: 31,
  },
  {
    provider_key: 'neuberger_berman',
    provider_name: 'Neuberger Berman',
    provider_rank: 17,
    website_domain: 'nb.com',
    allowed_domains_json: ['nb.com', 'neubergerberman.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '22.00',
    strategy_count_estimate: 28,
  },
  {
    provider_key: 'lazard',
    provider_name: 'Lazard Asset Management',
    provider_rank: 18,
    website_domain: 'lazardassetmanagement.com',
    allowed_domains_json: ['lazardassetmanagement.com', 'lazard.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '19.00',
    strategy_count_estimate: 24,
  },
  {
    provider_key: 'columbia_threadneedle',
    provider_name: 'Columbia Threadneedle Investments',
    provider_rank: 19,
    website_domain: 'columbiathreadneedle.com',
    allowed_domains_json: ['columbiathreadneedle.com', 'columbiathreadneedleus.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '17.50',
    strategy_count_estimate: 33,
  },
  {
    provider_key: 'eaton_vance',
    provider_name: 'Eaton Vance (Morgan Stanley)',
    provider_rank: 20,
    website_domain: 'eatonvance.com',
    allowed_domains_json: ['eatonvance.com', 'morganstanley.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '16.00',
    strategy_count_estimate: 29,
  },
  {
    provider_key: 'dimensional',
    provider_name: 'Dimensional Fund Advisors',
    provider_rank: 21,
    website_domain: 'dimensional.com',
    allowed_domains_json: ['dimensional.com', 'us.dimensional.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '14.50',
    strategy_count_estimate: 22,
  },
  {
    provider_key: 'td_asset_management',
    provider_name: 'TD Asset Management',
    provider_rank: 22,
    website_domain: 'tdassetmanagement.com',
    allowed_domains_json: ['tdassetmanagement.com', 'td.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '13.00',
    strategy_count_estimate: 26,
  },
  {
    provider_key: 'lpl_financial',
    provider_name: 'LPL Financial',
    provider_rank: 23,
    website_domain: 'lpl.com',
    allowed_domains_json: ['lpl.com', 'lplfinancial.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'login_required',
    discovery_mode: 'paused',
    provider_tier: 'tier_2',
    aum_bn: '12.00',
    strategy_count_estimate: 18,
  },
  {
    provider_key: 'schwab',
    provider_name: 'Charles Schwab Investment Management',
    provider_rank: 24,
    website_domain: 'schwab.com',
    allowed_domains_json: ['schwab.com', 'schwabassetmanagement.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '11.00',
    strategy_count_estimate: 21,
  },
  {
    provider_key: 'american_century',
    provider_name: 'American Century Investments',
    provider_rank: 25,
    website_domain: 'americancentury.com',
    allowed_domains_json: ['americancentury.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_2',
    aum_bn: '10.50',
    strategy_count_estimate: 27,
  },

  // ===== TIER 3: Ranks 26-50 (AUM < $10B) =====
  {
    provider_key: 'envestnet',
    provider_name: 'Envestnet PMC',
    provider_rank: 26,
    website_domain: 'envestnet.com',
    allowed_domains_json: ['envestnet.com', 'pmc.envestnet.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'login_required',
    discovery_mode: 'paused',
    provider_tier: 'tier_3',
    aum_bn: '9.50',
    strategy_count_estimate: 15,
  },
  {
    provider_key: 'baird',
    provider_name: 'Baird Advisors',
    provider_rank: 27,
    website_domain: 'rwbaird.com',
    allowed_domains_json: ['rwbaird.com', 'bairdadvisors.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '8.50',
    strategy_count_estimate: 19,
  },
  {
    provider_key: 'artisan_partners',
    provider_name: 'Artisan Partners',
    provider_rank: 28,
    website_domain: 'artisanpartners.com',
    allowed_domains_json: ['artisanpartners.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '7.80',
    strategy_count_estimate: 16,
  },
  {
    provider_key: 'brown_brothers',
    provider_name: 'Brown Brothers Harriman',
    provider_rank: 29,
    website_domain: 'bbh.com',
    allowed_domains_json: ['bbh.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '7.20',
    strategy_count_estimate: 14,
  },
  {
    provider_key: 'manning_napier',
    provider_name: 'Manning & Napier',
    provider_rank: 30,
    website_domain: 'manning-napier.com',
    allowed_domains_json: ['manning-napier.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '6.50',
    strategy_count_estimate: 12,
  },
  // Continuing with more Tier 3 providers...
  {
    provider_key: 'virtus',
    provider_name: 'Virtus Investment Partners',
    provider_rank: 31,
    website_domain: 'virtus.com',
    allowed_domains_json: ['virtus.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '6.00',
    strategy_count_estimate: 18,
  },
  {
    provider_key: 'lord_abbett',
    provider_name: 'Lord Abbett',
    provider_rank: 32,
    website_domain: 'lordabbett.com',
    allowed_domains_json: ['lordabbett.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '5.50',
    strategy_count_estimate: 13,
  },
  {
    provider_key: 'brandywine',
    provider_name: 'Brandywine Global (Franklin Templeton)',
    provider_rank: 33,
    website_domain: 'brandywine.com',
    allowed_domains_json: ['brandywine.com', 'franklintempleton.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '5.00',
    strategy_count_estimate: 11,
  },
  {
    provider_key: 'clearbridge',
    provider_name: 'ClearBridge Investments (Legg Mason)',
    provider_rank: 34,
    website_domain: 'clearbridge.com',
    allowed_domains_json: ['clearbridge.com', 'leggmason.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '4.80',
    strategy_count_estimate: 15,
  },
  {
    provider_key: 'victory_capital',
    provider_name: 'Victory Capital Management',
    provider_rank: 35,
    website_domain: 'vcm.com',
    allowed_domains_json: ['vcm.com', 'victorycapital.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '4.50',
    strategy_count_estimate: 14,
  },
  {
    provider_key: 'axa',
    provider_name: 'AXA Investment Managers',
    provider_rank: 36,
    website_domain: 'axa-im.com',
    allowed_domains_json: ['axa-im.com', 'axa-im.us'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '4.20',
    strategy_count_estimate: 10,
  },
  {
    provider_key: 'mfs',
    provider_name: 'MFS Investment Management',
    provider_rank: 37,
    website_domain: 'mfs.com',
    allowed_domains_json: ['mfs.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '4.00',
    strategy_count_estimate: 12,
  },
  {
    provider_key: 'principal',
    provider_name: 'Principal Global Investors',
    provider_rank: 38,
    website_domain: 'principalglobal.com',
    allowed_domains_json: ['principalglobal.com', 'principal.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '3.80',
    strategy_count_estimate: 16,
  },
  {
    provider_key: 'natixis',
    provider_name: 'Natixis Investment Managers',
    provider_rank: 39,
    website_domain: 'im.natixis.com',
    allowed_domains_json: ['im.natixis.com', 'ngam.natixis.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '3.50',
    strategy_count_estimate: 9,
  },
  {
    provider_key: 'federated_hermes',
    provider_name: 'Federated Hermes',
    provider_rank: 40,
    website_domain: 'federatedhermes.com',
    allowed_domains_json: ['federatedhermes.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '3.30',
    strategy_count_estimate: 11,
  },
  {
    provider_key: 'jpmorgan_am',
    provider_name: 'J.P. Morgan Private Bank',
    provider_rank: 41,
    website_domain: 'privatebank.jpmorgan.com',
    allowed_domains_json: ['privatebank.jpmorgan.com', 'jpmorgan.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'login_required',
    discovery_mode: 'paused',
    provider_tier: 'tier_3',
    aum_bn: '3.00',
    strategy_count_estimate: 8,
  },
  {
    provider_key: 'ppg_partners',
    provider_name: 'PPG Partners',
    provider_rank: 42,
    website_domain: 'ppgpartners.com',
    allowed_domains_json: ['ppgpartners.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '2.80',
    strategy_count_estimate: 7,
  },
  {
    provider_key: 'sei',
    provider_name: 'SEI Investments',
    provider_rank: 43,
    website_domain: 'seic.com',
    allowed_domains_json: ['seic.com', 'sei.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '2.50',
    strategy_count_estimate: 13,
  },
  {
    provider_key: 'tiaa',
    provider_name: 'TIAA',
    provider_rank: 44,
    website_domain: 'tiaa.org',
    allowed_domains_json: ['tiaa.org', 'tiaa-cref.org'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '2.30',
    strategy_count_estimate: 10,
  },
  {
    provider_key: 'nuveen',
    provider_name: 'Nuveen (TIAA)',
    provider_rank: 45,
    website_domain: 'nuveen.com',
    allowed_domains_json: ['nuveen.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '2.10',
    strategy_count_estimate: 12,
  },
  {
    provider_key: 'calamos',
    provider_name: 'Calamos Investments',
    provider_rank: 46,
    website_domain: 'calamos.com',
    allowed_domains_json: ['calamos.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '2.00',
    strategy_count_estimate: 9,
  },
  {
    provider_key: 'john_hancock',
    provider_name: 'John Hancock Investment Management',
    provider_rank: 47,
    website_domain: 'jhinvestments.com',
    allowed_domains_json: ['jhinvestments.com', 'johnhancock.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '1.90',
    strategy_count_estimate: 8,
  },
  {
    provider_key: 'oppenheimer',
    provider_name: 'OppenheimerFunds (Invesco)',
    provider_rank: 48,
    website_domain: 'oppenheimerfunds.com',
    allowed_domains_json: ['oppenheimerfunds.com', 'invesco.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '1.70',
    strategy_count_estimate: 7,
  },
  {
    provider_key: 'putnam',
    provider_name: 'Putnam Investments',
    provider_rank: 49,
    website_domain: 'putnam.com',
    allowed_domains_json: ['putnam.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '1.50',
    strategy_count_estimate: 11,
  },
  {
    provider_key: 'janus_henderson',
    provider_name: 'Janus Henderson Investors',
    provider_rank: 50,
    website_domain: 'janushenderson.com',
    allowed_domains_json: ['janushenderson.com'],
    preferred_fetch_mode: 'bright_data',
    auth_sensitivity: 'public',
    discovery_mode: 'active',
    provider_tier: 'tier_3',
    aum_bn: '1.40',
    strategy_count_estimate: 10,
  },
];

/**
 * Initial Seed URLs for Tier 1 Providers
 * Working set: J.P. Morgan, BlackRock/Aperio, Vanguard
 */
export const INITIAL_SEED_URLS: SeedUrlData[] = [
  // J.P. Morgan Asset Management
  {
    provider_key: 'jpmorgan',
    seed_url: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/separately-managed-accounts/',
    url_type: 'strategy_list',
    url_label: 'J.P. Morgan SMA Strategy Catalog',
    crawl_depth: 2,
    priority: 100,
  },
  {
    provider_key: 'jpmorgan',
    seed_url: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/separately-managed-accounts/equity/',
    url_type: 'strategy_list',
    url_label: 'J.P. Morgan Equity SMAs',
    crawl_depth: 2,
    priority: 95,
  },
  {
    provider_key: 'jpmorgan',
    seed_url: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/separately-managed-accounts/fixed-income/',
    url_type: 'strategy_list',
    url_label: 'J.P. Morgan Fixed Income SMAs',
    crawl_depth: 2,
    priority: 95,
  },

  // BlackRock
  {
    provider_key: 'blackrock',
    seed_url: 'https://www.blackrock.com/us/individual/products/separately-managed-accounts',
    url_type: 'strategy_list',
    url_label: 'BlackRock SMA Hub',
    crawl_depth: 2,
    priority: 100,
  },
  {
    provider_key: 'blackrock',
    seed_url: 'https://www.blackrock.com/us/financial-professionals/products/investment-strategies/sma',
    url_type: 'strategy_list',
    url_label: 'BlackRock SMA Investment Strategies',
    crawl_depth: 2,
    priority: 95,
  },

  // Aperio (BlackRock)
  {
    provider_key: 'aperio',
    seed_url: 'https://www.aperiogroup.com/solutions/separately-managed-accounts',
    url_type: 'strategy_list',
    url_label: 'Aperio Tax-Managed SMAs',
    crawl_depth: 2,
    priority: 100,
  },
  {
    provider_key: 'aperio',
    seed_url: 'https://www.aperiogroup.com/solutions/equity-strategies',
    url_type: 'strategy_list',
    url_label: 'Aperio Equity Strategies',
    crawl_depth: 2,
    priority: 95,
  },

  // Vanguard
  {
    provider_key: 'vanguard',
    seed_url: 'https://advisors.vanguard.com/investment-products/separately-managed-accounts',
    url_type: 'strategy_list',
    url_label: 'Vanguard SMA Overview',
    crawl_depth: 2,
    priority: 100,
  },
  {
    provider_key: 'vanguard',
    seed_url: 'https://institutional.vanguard.com/investment/separately-managed-accounts.html',
    url_type: 'strategy_list',
    url_label: 'Vanguard Institutional SMAs',
    crawl_depth: 2,
    priority: 95,
  },

  // Fidelity
  {
    provider_key: 'fidelity',
    seed_url: 'https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/separately-managed-accounts-brochure.pdf',
    url_type: 'pdf_index',
    url_label: 'Fidelity SMA Brochure',
    crawl_depth: 1,
    priority: 90,
  },
  {
    provider_key: 'fidelity',
    seed_url: 'https://institutional.fidelity.com/app/funds-and-products/separately-managed-accounts/overview.html',
    url_type: 'strategy_list',
    url_label: 'Fidelity Institutional SMA Overview',
    crawl_depth: 2,
    priority: 90,
  },

  // State Street Global Advisors
  {
    provider_key: 'state_street_ga',
    seed_url: 'https://www.ssga.com/us/en/individual/separately-managed-accounts',
    url_type: 'strategy_list',
    url_label: 'SSGA SMA Strategies',
    crawl_depth: 2,
    priority: 85,
  },
];

/**
 * Seed Database with Provider Data
 */
export async function seedProviders() {
  console.log('🌱 Seeding SMA providers...');

  let providersInserted = 0;
  let seedUrlsInserted = 0;

  // Insert providers
  for (const provider of TOP_50_PROVIDERS) {
    await db.insert(smaProviders).values({
      provider_key: provider.provider_key,
      provider_name: provider.provider_name,
      provider_rank: provider.provider_rank,
      website_domain: provider.website_domain,
      allowed_domains_json: provider.allowed_domains_json,
      preferred_fetch_mode: provider.preferred_fetch_mode,
      auth_sensitivity: provider.auth_sensitivity,
      discovery_mode: provider.discovery_mode,
      provider_tier: provider.provider_tier,
      aum_bn: provider.aum_bn,
      strategy_count_estimate: provider.strategy_count_estimate,
    }).onConflictDoUpdate({
      target: smaProviders.provider_key,
      set: {
        provider_name: provider.provider_name,
        provider_rank: provider.provider_rank,
        website_domain: provider.website_domain,
        allowed_domains_json: provider.allowed_domains_json,
        preferred_fetch_mode: provider.preferred_fetch_mode,
        auth_sensitivity: provider.auth_sensitivity,
        discovery_mode: provider.discovery_mode,
        provider_tier: provider.provider_tier,
        aum_bn: provider.aum_bn,
        strategy_count_estimate: provider.strategy_count_estimate,
        updated_at: new Date(),
      },
    });
    providersInserted++;
  }

  console.log(`✅ Inserted/updated ${providersInserted} providers`);

  // Insert seed URLs
  for (const seedUrl of INITIAL_SEED_URLS) {
    // Get provider ID
    const [provider] = await db
      .select({ id: smaProviders.id })
      .from(smaProviders)
      .where(eq(smaProviders.provider_key, seedUrl.provider_key))
      .limit(1);

    if (!provider) {
      console.warn(`⚠️  Provider not found: ${seedUrl.provider_key}`);
      continue;
    }

    await db.insert(smaProviderSeedUrls).values({
      provider_id: provider.id,
      seed_url: seedUrl.seed_url,
      url_type: seedUrl.url_type,
      url_label: seedUrl.url_label,
      crawl_depth: seedUrl.crawl_depth,
      priority: seedUrl.priority,
    }).onConflictDoNothing();

    seedUrlsInserted++;
  }

  console.log(`✅ Inserted ${seedUrlsInserted} seed URLs`);
  console.log('🎉 Provider seeding complete!');
}

/**
 * Main seed execution
 */
if (require.main === module) {
  seedProviders()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
