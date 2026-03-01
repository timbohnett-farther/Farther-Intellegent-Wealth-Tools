import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: workflowId },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching workflow template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;
    const body = await request.json();

    const existing = await prisma.workflowTemplate.findUnique({
      where: { id: workflowId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const template = await prisma.workflowTemplate.update({
      where: { id: workflowId },
      data: body,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating workflow template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    const existing = await prisma.workflowTemplate.findUnique({
      where: { id: workflowId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.workflowTemplate.delete({
      where: { id: workflowId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
