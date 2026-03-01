import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      include: {
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, triggerType, steps } = body;

    if (!name || !triggerType || !steps) {
      return NextResponse.json(
        { error: 'Missing required fields: name, triggerType, steps' },
        { status: 400 }
      );
    }

    const template = await prisma.workflowTemplate.create({
      data: body,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
