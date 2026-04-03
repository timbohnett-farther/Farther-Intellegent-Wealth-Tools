/**
 * Tax Document Scraper
 *
 * Fetches tax policy documents from authoritative sources:
 * - Tax Foundation State Tax Tables
 * - NCSL State Tax Actions
 * - ACTEC State Death Tax Chart
 * - Puerto Rico Official Documents
 */

export interface ScraperTarget {
  name: string;
  url: string;
  sourceType: 'tax_foundation' | 'ncsl_state_tax_actions' | 'actec_death_tax_chart' | 'puerto_rico_official';
  jurisdictionCodes?: string[]; // Optional filter for specific jurisdictions
}

export interface ScrapedDocument {
  url: string;
  sourceType: string;
  title: string;
  content: string;
  scrapedAt: string;
  contentHash: string;
}

const SCRAPER_TARGETS: ScraperTarget[] = [
  {
    name: 'Tax Foundation - State Individual Income Tax Rates 2026',
    url: 'https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/',
    sourceType: 'tax_foundation',
  },
  {
    name: 'NCSL - State Tax Actions Database',
    url: 'https://www.ncsl.org/research/fiscal-policy/state-tax-actions.aspx',
    sourceType: 'ncsl_state_tax_actions',
  },
  {
    name: 'ACTEC - State Death Tax Chart 2026',
    url: 'https://www.actec.org/resources/state-death-tax-chart/',
    sourceType: 'actec_death_tax_chart',
  },
  {
    name: 'Puerto Rico - Act 60 Official Documentation',
    url: 'https://www.ddec.pr.gov/en/incentives-act-60/',
    sourceType: 'puerto_rico_official',
    jurisdictionCodes: ['PR'],
  },
];

/**
 * Scrape a single document from a URL
 */
export async function scrapeDocument(target: ScraperTarget): Promise<ScrapedDocument> {
  console.log(`[Scraper] Fetching ${target.name}...`);

  try {
    // Attempt with native fetch first
    const response = await fetch(target.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const content = extractTextFromHTML(html);
    const contentHash = await hashContent(content);

    return {
      url: target.url,
      sourceType: target.sourceType,
      title: target.name,
      content,
      scrapedAt: new Date().toISOString(),
      contentHash,
    };
  } catch (error) {
    console.error(`[Scraper] Failed to fetch ${target.url}:`, error);
    throw error;
  }
}

/**
 * Scrape all configured tax document sources
 */
export async function scrapeAllSources(): Promise<ScrapedDocument[]> {
  const results: ScrapedDocument[] = [];

  for (const target of SCRAPER_TARGETS) {
    try {
      const doc = await scrapeDocument(target);
      results.push(doc);
      console.log(`[Scraper] ✓ ${target.name} (${doc.content.length} chars)`);

      // Polite delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Scraper] ✗ ${target.name} failed:`, error);
      // Continue with other sources even if one fails
    }
  }

  return results;
}

/**
 * Extract plain text content from HTML
 * (Simple implementation - strips tags and decodes entities)
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Generate hash of content for change detection
 */
async function hashContent(content: string): Promise<string> {
  // Simple hash for content comparison (SHA-256 would be better in production)
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple string hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if scraped content has changed since last scrape
 */
export async function hasContentChanged(
  url: string,
  previousHash: string | null
): Promise<boolean> {
  if (!previousHash) return true;

  const target = SCRAPER_TARGETS.find(t => t.url === url);
  if (!target) return false;

  try {
    const doc = await scrapeDocument(target);
    return doc.contentHash !== previousHash;
  } catch (error) {
    console.error(`[Scraper] Failed to check content change for ${url}:`, error);
    return false;
  }
}

/**
 * Get all scraper targets (for admin configuration)
 */
export function getScraperTargets(): ScraperTarget[] {
  return SCRAPER_TARGETS;
}
