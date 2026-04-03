/**
 * FMSS SMA Ingestion API Endpoint
 *
 * POST /api/fmss/ingest/sma
 *
 * Triggers SMA strategy ingestion from URL(s).
 * Supports single URL or batch processing.
 *
 * Request Body:
 * {
 *   "url": "https://example.com/sma-factsheet.pdf",  // Single URL
 *   // OR
 *   "urls": ["url1", "url2", "url3"],  // Batch URLs
 *   "options": {
 *     "skip_if_unchanged": true,
 *     "extraction_model": "minimax-2.7",
 *     "concurrent": 3
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Ingested 1 SMA strategy",
 *   "data": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ingestSMAStrategy,
  batchIngestSMAStrategies,
} from '@/lib/fmss/workers/sma-ingestion-worker';

export const maxDuration = 300; // 5 minutes for long-running ingestion

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, urls, options } = body;

    // Validate input
    if (!url && !urls) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either "url" (string) or "urls" (array) is required',
        },
        { status: 400 }
      );
    }

    if (url && urls) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either "url" or "urls", not both',
        },
        { status: 400 }
      );
    }

    // Single URL ingestion
    if (url) {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid URL format',
          },
          { status: 400 }
        );
      }

      const result = await ingestSMAStrategy(url, options);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            data: result,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully ingested SMA strategy from ${url}`,
        data: result,
      });
    }

    // Batch URL ingestion
    if (urls) {
      if (!Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: '"urls" must be a non-empty array',
          },
          { status: 400 }
        );
      }

      if (urls.length > 50) {
        return NextResponse.json(
          {
            success: false,
            error: 'Maximum 50 URLs per batch request',
          },
          { status: 400 }
        );
      }

      // Validate all URLs
      const invalidUrls = urls.filter(
        (u: unknown) => typeof u !== 'string' || !u.startsWith('http')
      );

      if (invalidUrls.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid URLs: ${invalidUrls.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const batchResult = await batchIngestSMAStrategies(urls, options);

      return NextResponse.json({
        success: true,
        message: `Batch ingestion complete: ${batchResult.successful} successful, ${batchResult.failed} failed, ${batchResult.skipped} skipped`,
        data: batchResult,
      });
    }

    // Should never reach here due to validation
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[FMSS SMA Ingestion API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fmss/ingest/sma
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'FMSS SMA Ingestion API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: {
        description: 'Trigger SMA ingestion',
        body: {
          url: 'Single URL (string)',
          urls: 'Batch URLs (array)',
          options: {
            skip_if_unchanged: 'boolean (default: true)',
            scrape_timeout: 'number (default: 30000)',
            extraction_model: '"minimax-2.7" | "minimax-2.7-highspeed" (default: "minimax-2.7")',
            concurrent: 'number (default: 3, batch only)',
            delay_between_batches_ms: 'number (default: 2000, batch only)',
          },
        },
      },
    },
  });
}
