export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('reportType');

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { planId };
    if (reportType) {
      where.reportType = reportType;
    }

    const reports = await prisma.generatedReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      reports,
      summary: {
        totalReports: reports.length,
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const { reportType, title, generatedBy } = body;

    if (!reportType || !title || !generatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: reportType, title, generatedBy' },
        { status: 400 }
      );
    }

    // If sections is an array, stringify for storage
    if (body.sections && Array.isArray(body.sections)) {
      body.sections = JSON.stringify(body.sections);
    }

    // Convert dates
    if (body.deliveredAt) {
      body.deliveredAt = new Date(body.deliveredAt);
    }

    const report = await prisma.generatedReport.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
