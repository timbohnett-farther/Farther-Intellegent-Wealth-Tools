/**
 * FMSS Initial Data Seed
 *
 * Seeds initial configuration data:
 * - 8 scoring dimensions with weights
 * - Asset categories (equity, fixed income, alternatives, etc.)
 * - Data source configurations
 *
 * Run with: tsx src/lib/db/seed/fmss-initial-data.ts
 */

import { db } from '../index';
import {
  scoringDimensions,
  assetCategories,
  dataSources,
} from '../schema';

async function seedScoringDimensions() {
  console.log('Seeding scoring dimensions...');

  const dimensions = [
    {
      dimension_code: 'risk_adjusted_performance',
      dimension_name: 'Risk-Adjusted Performance',
      weight_pct: '25.00',
      calculation_method: 'formula',
      formula: '(sharpe_ratio * 0.4 + sortino_ratio * 0.4 + (1 - max_drawdown) * 0.2) * 100',
      data_sources: ['fmp', 'finnhub'],
      description: 'Sharpe ratio, Sortino ratio, and max drawdown vs. benchmark',
      display_order: 1,
      is_active: true,
    },
    {
      dimension_code: 'manager_pedigree',
      dimension_name: 'Manager Pedigree',
      weight_pct: '15.00',
      calculation_method: 'formula',
      formula: '(tenure_years / 20 * 0.3 + aum_percentile * 0.4 + (1 - regulatory_issues) * 0.3) * 100',
      data_sources: ['fmp', 'sec_edgar'],
      description: 'Track record, AUM, tenure, and regulatory compliance history',
      display_order: 2,
      is_active: true,
    },
    {
      dimension_code: 'fee_efficiency',
      dimension_name: 'Fee Efficiency',
      weight_pct: '10.00',
      calculation_method: 'formula',
      formula: '(1 - (fee_bps / category_median_bps)) * 100',
      data_sources: ['fmp'],
      description: 'Management fees relative to category median',
      display_order: 3,
      is_active: true,
    },
    {
      dimension_code: 'insider_conviction',
      dimension_name: 'Insider Conviction',
      weight_pct: '15.00',
      calculation_method: 'ai',
      formula: null,
      data_sources: ['fmp', 'finnhub'],
      description: 'Insider buying activity, Form 4 filings, and director purchases',
      display_order: 4,
      is_active: true,
    },
    {
      dimension_code: 'regulatory_signal',
      dimension_name: 'Regulatory Signal',
      weight_pct: '10.00',
      calculation_method: 'ai',
      formula: null,
      data_sources: ['sec_edgar', 'fmp'],
      description: 'SEC filings sentiment, Form ADV changes, and compliance signals',
      display_order: 5,
      is_active: true,
    },
    {
      dimension_code: 'concentration',
      dimension_name: 'Concentration Risk',
      weight_pct: '10.00',
      calculation_method: 'formula',
      formula: '(1 - herfindahl_index) * 100',
      data_sources: ['fmp'],
      description: 'Position concentration and diversification metrics',
      display_order: 6,
      is_active: true,
    },
    {
      dimension_code: 'benchmark_consistency',
      dimension_name: 'Benchmark Consistency',
      weight_pct: '10.00',
      calculation_method: 'formula',
      formula: '((1 - tracking_error) * 0.5 + active_share * 0.5) * 100',
      data_sources: ['fmp', 'finnhub'],
      description: 'Tracking error, active share, and style drift analysis',
      display_order: 7,
      is_active: true,
    },
    {
      dimension_code: 'esg_alignment',
      dimension_name: 'ESG Alignment',
      weight_pct: '5.00',
      calculation_method: 'api',
      formula: null,
      data_sources: ['fmp'],
      description: 'ESG scores, sustainability initiatives, and impact metrics',
      display_order: 8,
      is_active: true,
    },
  ];

  await db.insert(scoringDimensions).values(dimensions).onConflictDoNothing();
  console.log(`✓ Seeded ${dimensions.length} scoring dimensions`);
}

async function seedAssetCategories() {
  console.log('Seeding asset categories...');

  const categories = [
    // Asset Classes
    { category_type: 'asset_class', category_code: 'equity', category_name: 'Equity', display_order: 1 },
    { category_type: 'asset_class', category_code: 'fixed_income', category_name: 'Fixed Income', display_order: 2 },
    { category_type: 'asset_class', category_code: 'alternative', category_name: 'Alternative', display_order: 3 },
    { category_type: 'asset_class', category_code: 'multi_asset', category_name: 'Multi-Asset', display_order: 4 },
    { category_type: 'asset_class', category_code: 'cash', category_name: 'Cash & Equivalents', display_order: 5 },

    // Equity Strategies
    { category_type: 'strategy', category_code: 'growth', category_name: 'Growth', display_order: 1 },
    { category_type: 'strategy', category_code: 'value', category_name: 'Value', display_order: 2 },
    { category_type: 'strategy', category_code: 'blend', category_name: 'Blend', display_order: 3 },
    { category_type: 'strategy', category_code: 'dividend', category_name: 'Dividend', display_order: 4 },
    { category_type: 'strategy', category_code: 'momentum', category_name: 'Momentum', display_order: 5 },

    // Sectors
    { category_type: 'sector', category_code: 'technology', category_name: 'Technology', display_order: 1 },
    { category_type: 'sector', category_code: 'healthcare', category_name: 'Healthcare', display_order: 2 },
    { category_type: 'sector', category_code: 'financials', category_name: 'Financials', display_order: 3 },
    { category_type: 'sector', category_code: 'consumer', category_name: 'Consumer', display_order: 4 },
    { category_type: 'sector', category_code: 'industrials', category_name: 'Industrials', display_order: 5 },
    { category_type: 'sector', category_code: 'energy', category_name: 'Energy', display_order: 6 },
    { category_type: 'sector', category_code: 'materials', category_name: 'Materials', display_order: 7 },
    { category_type: 'sector', category_code: 'utilities', category_name: 'Utilities', display_order: 8 },
    { category_type: 'sector', category_code: 'real_estate', category_name: 'Real Estate', display_order: 9 },
    { category_type: 'sector', category_code: 'telecom', category_name: 'Telecommunications', display_order: 10 },

    // Alternative Types
    { category_type: 'alternative_type', category_code: 'hedge_fund', category_name: 'Hedge Fund', display_order: 1 },
    { category_type: 'alternative_type', category_code: 'private_equity', category_name: 'Private Equity', display_order: 2 },
    { category_type: 'alternative_type', category_code: 'venture_capital', category_name: 'Venture Capital', display_order: 3 },
    { category_type: 'alternative_type', category_code: 'real_estate', category_name: 'Real Estate', display_order: 4 },
    { category_type: 'alternative_type', category_code: 'commodities', category_name: 'Commodities', display_order: 5 },
  ];

  await db.insert(assetCategories).values(categories).onConflictDoNothing();
  console.log(`✓ Seeded ${categories.length} asset categories`);
}

async function seedDataSources() {
  console.log('Seeding data sources...');

  const sources = [
    {
      source_name: 'bright_data',
      source_type: 'web_scraper',
      base_url: 'https://api.brightdata.com',
      api_key_env_var: 'BRIGHT_DATA_API_KEY',
      rate_limit_per_minute: 60,
      is_active: true,
      config: {
        description: 'Bright Data Web Unlocker - primary web scraping service',
        useCase: 'SMA fact sheets, alternative fund documents',
      },
    },
    {
      source_name: 'tavily',
      source_type: 'web_scraper',
      base_url: 'https://api.tavily.com',
      api_key_env_var: 'TAVILY_API_KEY',
      rate_limit_per_minute: 60,
      is_active: true,
      config: {
        description: 'Tavily Extract - backup web scraping service',
        useCase: 'Fallback for Bright Data failures',
      },
    },
    {
      source_name: 'fmp',
      source_type: 'api',
      base_url: 'https://financialmodelingprep.com/stable',
      api_key_env_var: 'FMP_API_KEY',
      rate_limit_per_minute: 300,
      is_active: true,
      config: {
        description: 'Financial Modeling Prep - equity/ETF fundamentals',
        useCase: 'Company profiles, financials, insider trades, earnings transcripts',
        authPattern: 'append ?apikey=YOUR_KEY to endpoints',
      },
    },
    {
      source_name: 'finnhub',
      source_type: 'api',
      base_url: 'https://finnhub.io/api/v1',
      api_key_env_var: 'FINNHUB_API_KEY',
      rate_limit_per_minute: 60,
      is_active: true,
      config: {
        description: 'Finnhub - real-time market data and news sentiment',
        useCase: 'Stock prices, news sentiment, earnings surprises',
        authPattern: 'pass as query param ?token=YOUR_KEY',
      },
    },
    {
      source_name: 'alpha_vantage',
      source_type: 'api',
      base_url: 'https://www.alphavantage.co/query',
      api_key_env_var: 'ALPHA_VANTAGE_API_KEY',
      rate_limit_per_minute: 5,
      is_active: true,
      config: {
        description: 'Alpha Vantage - earnings transcripts with sentiment',
        useCase: 'Earnings call transcripts, news sentiment, forex data',
        authPattern: 'pass as query param ?apikey=YOUR_KEY',
        note: 'Low rate limit - use sparingly',
      },
    },
    {
      source_name: 'fred',
      source_type: 'api',
      base_url: 'https://api.stlouisfed.org/fred',
      api_key_env_var: 'FRED_API_KEY',
      rate_limit_per_minute: null,
      is_active: true,
      config: {
        description: 'FRED - Federal Reserve economic data',
        useCase: 'Macro indicators (GDP, CPI, unemployment, etc.)',
        authPattern: 'pass as query param ?api_key=YOUR_KEY',
        note: 'Unlimited requests for non-commercial use',
      },
    },
    {
      source_name: 'econdb',
      source_type: 'api',
      base_url: 'https://www.econdb.com/api',
      api_key_env_var: null,
      rate_limit_per_minute: null,
      is_active: true,
      config: {
        description: 'Econdb - international economic data',
        useCase: 'Global macro indicators',
        authPattern: 'No authentication required for basic endpoints',
      },
    },
    {
      source_name: 'sec_edgar',
      source_type: 'api',
      base_url: 'https://www.sec.gov/cgi-bin/browse-edgar',
      api_key_env_var: null,
      rate_limit_per_minute: 10,
      is_active: true,
      config: {
        description: 'SEC EDGAR - regulatory filings',
        useCase: 'Form 10-K, 10-Q, 8-K, Form ADV, Form D',
        authPattern: 'No API key required',
        note: 'Must include User-Agent header with contact info',
      },
    },
    {
      source_name: 'minimax',
      source_type: 'api',
      base_url: 'https://api.minimax.chat/v1',
      api_key_env_var: 'MINIMAX_API_KEY',
      rate_limit_per_minute: 60,
      is_active: true,
      config: {
        description: 'MiniMax M2.7 - AI document extraction',
        useCase: 'Extract structured data from fact sheets, transcripts, filings',
        models: ['minimax-2.7', 'minimax-2.7-highspeed'],
      },
    },
  ];

  await db.insert(dataSources).values(sources).onConflictDoNothing();
  console.log(`✓ Seeded ${sources.length} data sources`);
}

async function main() {
  console.log('🌱 Starting FMSS initial data seed...\n');

  try {
    await seedScoringDimensions();
    await seedAssetCategories();
    await seedDataSources();

    console.log('\n✅ FMSS initial data seed complete!');
    console.log('\nSeeded:');
    console.log('  - 8 scoring dimensions');
    console.log('  - 25 asset categories');
    console.log('  - 9 data sources');
    console.log('\nReady for Phase 2 development! 🚀');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
