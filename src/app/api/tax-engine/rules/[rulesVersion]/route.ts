/**
 * Tax Rules Package Detail API
 *
 * GET /api/tax-engine/rules/[rulesVersion] - Get specific rules package
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRulesPackage } from '@/lib/tax-engine/rules/rules-registry';

interface RouteContext {
  params: Promise<{ rulesVersion: string }>;
}

/**
 * GET /api/tax-engine/rules/[rulesVersion]
 *
 * Retrieve full rules package details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { rulesVersion } = await context.params;

    if (!rulesVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing rulesVersion parameter',
        },
        { status: 400 }
      );
    }

    // Get rules package
    const rules = await getRulesPackage(rulesVersion);

    if (!rules) {
      return NextResponse.json(
        {
          success: false,
          error: `Rules package ${rulesVersion} not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('Get rules package error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Operation failed. Please try again.',
      },
      { status: 500 }
    );
  }
}
