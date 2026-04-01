// =============================================================================
// API Route: POST /api/v1/workflow/tasks, GET /api/v1/workflow/tasks
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { createTask } from '@/lib/tax-planning/workflow';
import { CreateTaskCommandSchema } from '@/lib/tax-planning/workflow/schemas';
import { store } from '@/lib/tax-planning/store';

export async function POST(req: NextRequest) {
  try {
    const authContext = parseAuthContext(req.headers.get('authorization'));
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', retryable: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = CreateTaskCommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message, retryable: false },
        { status: 400 }
      );
    }

    const task = createTask(parsed.data, authContext, req.ip);
    return NextResponse.json({ success: true, data: task, error: null, retryable: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create task';
    const status = message.includes('Authorization denied') ? 403 : 500;
    return NextResponse.json(
      { success: false, data: null, error: message, retryable: status === 500 },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authContext = parseAuthContext(req.headers.get('authorization'));
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', retryable: false },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const filters = {
      householdId: url.searchParams.get('household_id') || undefined,
      taxYear: url.searchParams.get('tax_year')
        ? parseInt(url.searchParams.get('tax_year')!, 10)
        : undefined,
      status: url.searchParams.get('status') || undefined,
      taskType: url.searchParams.get('task_type') || undefined,
      ownerUserId: url.searchParams.get('owner_user_id') || undefined,
    };

    const tasks = store.listWorkflowTasks(filters);
    return NextResponse.json({ success: true, data: tasks, error: null, retryable: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list tasks';
    return NextResponse.json(
      { success: false, data: null, error: message, retryable: true },
      { status: 500 }
    );
  }
}
