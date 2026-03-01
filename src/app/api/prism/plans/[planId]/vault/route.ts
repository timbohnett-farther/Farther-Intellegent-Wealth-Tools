import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const visibleToClient = searchParams.get('visibleToClient');

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { planId };
    if (folder) {
      where.folder = folder;
    }
    if (visibleToClient === 'true') {
      where.visibleToClient = true;
    }

    const documents = await prisma.vaultDocument.findMany({
      where,
      include: {
        auditLog: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by folder
    const byFolder: Record<string, number> = {};
    const allDocs = await prisma.vaultDocument.findMany({
      where: { planId },
      select: { folder: true },
    });
    for (const doc of allDocs) {
      byFolder[doc.folder] = (byFolder[doc.folder] || 0) + 1;
    }

    return NextResponse.json({
      documents,
      summary: {
        totalDocuments: allDocs.length,
        byFolder,
      },
    });
  } catch (error) {
    console.error('Error fetching vault documents:', error);
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

    const { fileName, fileType, fileSize, storagePath, uploadedBy } = body;

    if (!fileName || !fileType || fileSize === undefined || !storagePath || !uploadedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize, storagePath, uploadedBy' },
        { status: 400 }
      );
    }

    if (body.expiresAt) {
      body.expiresAt = new Date(body.expiresAt);
    }

    const document = await prisma.vaultDocument.create({
      data: {
        ...body,
        planId,
      },
    });

    // Create audit log entry for upload
    await prisma.vaultAuditLog.create({
      data: {
        documentId: document.id,
        action: 'uploaded',
        actorType: uploadedBy,
        actorName: body.uploadedByName || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating vault document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
