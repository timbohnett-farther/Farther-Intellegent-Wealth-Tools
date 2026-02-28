import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const firm = await prisma.firm.findFirst({
      include: {
        _count: {
          select: {
            advisors: true,
            households: true,
            clients: true,
            plans: true,
          },
        },
      },
    });

    if (!firm) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(firm);
  } catch (error) {
    console.error('Error fetching firm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const firm = await prisma.firm.findFirst();

    if (!firm) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const updatedFirm = await prisma.firm.update({
      where: { id: firm.id },
      data: body,
    });

    return NextResponse.json(updatedFirm);
  } catch (error) {
    console.error('Error updating firm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
