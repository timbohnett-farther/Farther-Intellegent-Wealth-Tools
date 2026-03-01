/**
 * Farther Prism — Update Engine Scrapers (Barrel Export)
 *
 * Re-exports all scraper modules for convenient consumption
 * by the update-engine orchestrator and other consumers.
 */

// ==================== FEDERAL SCRAPERS ====================

export {
  runIRSScraper,
  scrapeCurrentAFR,
  extractInflationAdjustments,
  buildBracketUpdateChanges,
  IRS_NEWSROOM_RSS_URL,
  IRS_RELEVANT_KEYWORDS,
} from './irs-scraper';

export {
  runCongressMonitor,
  classifyBillStatusChange,
  fetchBillText,
  CONGRESS_API_BASE,
  TAX_BILL_KEYWORDS,
  WATCHED_COMMITTEES,
} from './congress-api';

export {
  runSSAScraper,
  scrapeSSCOLA,
  scrapeSSWageBase,
  scrapeSSBendPoints,
} from './ssa-scraper';

export {
  runCMSScraper,
  scrapeIRMAAbrackets,
  scrapePartBPremium,
} from './cms-scraper';

export {
  runTreasuryScraper,
} from './treasury-scraper';

// ==================== STATE SCRAPERS ====================

export {
  runAllStateScrapers,
  STATE_SCRAPER_REGISTRY,
  runCaliforniaScraper,
  runNewYorkScraper,
  runMassachusettsScraper,
  runFloridaScraper,
  runTexasScraper,
  runIllinoisScraper,
} from './state-scrapers';
