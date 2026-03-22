export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';
import { generateReportSectionEnhanced } from '@/lib/ai-engine/nlp/report-writer';
import { generateDocument, pollGeneration, isGammaAvailable } from '@/lib/ai/gamma';

interface GenerateReportBody {
  reportType: string;
  sections: string[];
  exportFormat?: 'pdf' | 'pptx';
  useGamma?: boolean;
  sectionData?: Record<string, Record<string, unknown>>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body: GenerateReportBody = await request.json();

    // Validate plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        primaryClient: true,
        advisor: { include: { firm: true } },
        planResults: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
        accounts: true,
        goals: true,
        incomeSources: true,
        expenses: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Build base data from plan for sections that don't have explicit data
    const latestResult = plan.planResults[0];
    const totalPortfolioValue = plan.accounts.reduce(
      (sum, a) => sum + (a.currentBalance ?? 0), 0
    );
    const annualIncome = plan.incomeSources.reduce(
      (sum, s) => sum + (s.annualAmount ?? 0), 0
    );
    const annualExpenses = plan.expenses.reduce(
      (sum, e) => sum + (e.annualAmount ?? 0), 0
    );

    const baseData: Record<string, unknown> = {
      clientName: `${plan.primaryClient.firstName} ${plan.primaryClient.lastName}`,
      successRate: latestResult?.probabilityOfSuccess ?? 0,
      totalPortfolioValue,
      netWorth: totalPortfolioValue,
      annualIncome,
      annualExpenses,
      currentYear: new Date().getFullYear(),
      retirementYear: plan.endYear,
    };

    // Generate each section
    const sectionTexts: string[] = [];
    for (const section of body.sections) {
      const sectionData = body.sectionData?.[section] ?? baseData;
      const text = await generateReportSectionEnhanced(section, sectionData as Record<string, unknown>);
      sectionTexts.push(text);
    }

    const combinedText = sectionTexts.join('\n\n---\n\n');

    // Gamma integration for PDF/PPTX generation
    let gammaUrl: string | undefined;
    let exportUrl: string | undefined;

    if (body.useGamma && isGammaAvailable()) {
      try {
        const generationId = await generateDocument({
          inputText: combinedText,
          format: 'document',
          numCards: body.sections.length,
          exportAs: body.exportFormat ?? 'pdf',
        });

        const result = await pollGeneration(generationId);

        if (result.status === 'completed') {
          gammaUrl = result.gammaUrl;
          exportUrl = result.exportUrl;
        } else {
          console.warn(`[ReportGenerate] Gamma generation ${result.status}: ${result.error}`);
        }
      } catch (gammaError) {
        console.warn('[ReportGenerate] Gamma generation failed:', gammaError);
        // Continue without Gamma — still return text content
      }
    }

    // Save report record
    const report = await prisma.generatedReport.create({
      data: {
        planId,
        reportType: body.reportType,
        title: `${body.reportType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Report`,
        sections: JSON.stringify(body.sections),
        outputFormat: body.exportFormat ?? 'pdf',
        storagePath: exportUrl ?? null,
        generatedBy: 'ai',
      },
    });

    return NextResponse.json({
      report,
      textContent: combinedText,
      gammaUrl,
      exportUrl,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
