/**
 * Tax Rules Packages API
 *
 * GET  /api/tax-engine/rules - List all rules packages
 * POST /api/tax-engine/rules - Publish new rules package (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  listAllRulesPackages,
  publishRulesPackage,
  initializeRulesRegistry,
} from '@/lib/tax-engine/rules/rules-registry';

/**
 * GET /api/tax-engine/rules
 *
 * List all available rules packages
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize registry if needed
    await initializeRulesRegistry();

    // List all packages
    const packages = await listAllRulesPackages();

    return NextResponse.json({
      success: true,
      packages,
      count: packages.length,
    });
  } catch (error) {
    console.error('List rules packages error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tax-engine/rules
 *
 * Publish a new rules package (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { rulesPackage, publishedBy } = body;

    if (!rulesPackage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: rulesPackage',
        },
        { status: 400 }
      );
    }

    // Publish package
    await publishRulesPackage(rulesPackage, publishedBy || 'system');

    return NextResponse.json(
      {
        success: true,
        rulesVersion: rulesPackage.rulesVersion,
        message: 'Rules package published successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Publish rules package error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
