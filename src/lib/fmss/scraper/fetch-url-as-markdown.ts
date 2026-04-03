/**
 * Unified Web Scraper for FMSS
 *
 * Primary: Bright Data Web Unlocker
 * Fallback: Tavily Extract
 * Returns: Plain text/markdown content
 *
 * Usage:
 *   const content = await fetchUrlAsMarkdown('https://example.com/factsheet.pdf');
 */

import crypto from 'crypto';

// Scrape result interface
export interface ScrapeResult {
  success: boolean;
  content: string | null;
  contentHash: string | null;
  source: 'bright_data' | 'tavily' | null;
  error: string | null;
  scrapedAt: Date;
}

/**
 * Fetch URL content as markdown/plain text
 * Tries Bright Data first, falls back to Tavily
 */
export async function fetchUrlAsMarkdown(
  url: string,
  options?: {
    timeout?: number;
    retries?: number;
  }
): Promise<ScrapeResult> {
  const { timeout = 30000, retries = 2 } = options || {};

  // Try Bright Data first
  try {
    const brightDataResult = await scrapeBrightData(url, timeout);
    if (brightDataResult.success) {
      return brightDataResult;
    }
  } catch (error) {
    console.warn('Bright Data failed, trying Tavily fallback:', error);
  }

  // Fallback to Tavily
  try {
    const tavilyResult = await scrapeTavily(url, timeout);
    if (tavilyResult.success) {
      return tavilyResult;
    }
  } catch (error) {
    console.error('Both Bright Data and Tavily failed:', error);
  }

  // Both failed
  return {
    success: false,
    content: null,
    contentHash: null,
    source: null,
    error: 'All scraping methods failed',
    scrapedAt: new Date(),
  };
}

/**
 * Scrape using Bright Data Web Unlocker
 */
async function scrapeBrightData(
  url: string,
  timeout: number
): Promise<ScrapeResult> {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('BRIGHT_DATA_API_KEY not configured');
  }

  // Bright Data Web Unlocker endpoint
  const brightDataUrl = 'https://api.brightdata.com/request';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(brightDataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        format: 'html',  // Get HTML, we'll convert to text
        render: true,    // Enable JS rendering
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Bright Data returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const htmlContent = data.html || data.content || '';

    // Convert HTML to plain text (basic extraction)
    const textContent = htmlToText(htmlContent);
    const contentHash = generateContentHash(textContent);

    return {
      success: true,
      content: textContent,
      contentHash,
      source: 'bright_data',
      error: null,
      scrapedAt: new Date(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Scrape using Tavily Extract (fallback)
 */
async function scrapeTavily(
  url: string,
  timeout: number
): Promise<ScrapeResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  const tavilyUrl = 'https://api.tavily.com/extract';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(tavilyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        urls: [url],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Tavily returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.results?.[0]?.raw_content || data.results?.[0]?.content || '';

    if (!textContent) {
      throw new Error('Tavily returned empty content');
    }

    const contentHash = generateContentHash(textContent);

    return {
      success: true,
      content: textContent,
      contentHash,
      source: 'tavily',
      error: null,
      scrapedAt: new Date(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Convert HTML to plain text (basic implementation)
 * Remove script/style tags, strip HTML tags, normalize whitespace
 */
function htmlToText(html: string): string {
  return html
    // Remove script and style tags with content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate SHA-256 hash of content for change detection
 */
function generateContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}
