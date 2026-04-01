// =============================================================================
// Workflow Integration Tests
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { auditService } from '../../audit';
import type { AuthContext } from '../../rbac';
import { createTask, updateTask, assignTask } from '../task-service';
import { createWorkflow, updateWorkflow } from '../workflow-service';
import { buildCRMPayload } from '../crm-service';
import { createCPARequest, updateCPARequest } from '../cpa-service';

const mockAuthContext: AuthContext = {
  userId: 'user-001',
  firmId: 'firm-001',
  role: 'ADVISOR',
  email: 'advisor@farther.com',
};

describe('Workflow Integration Tests', () => {
  beforeEach(() => {
    auditService.clear();
  });

  it('End-to-end workflow: create workflow → tasks → CRM → CPA → complete', () => {
    // 1. Create workflow
    const workflow = createWorkflow(
      {
        householdId: 'hh-001',
        taxYear: 2025,
        workflowType: 'implement_recommendation',
        metadata: { recommendationTitle: 'Roth Conversion' },
      },
      mockAuthContext
    );

    expect(workflow.workflowRunId).toBeDefined();
    expect(workflow.taskIds.length).toBe(4); // Template has 4 tasks
    expect(workflow.status).toBe('new');

    // 2. Verify tasks were created
    const tasks = store.listWorkflowTasks({ workflowRunId: workflow.workflowRunId });
    expect(tasks.length).toBe(4);
    expect(tasks[0].title).toContain('Roth Conversion');

    // 3. Assign first task
    const task1 = tasks[0];
    const assigned = assignTask(
      task1.taskId,
      { ownerUserId: 'user-002', ownerRole: 'ADVISOR' },
      mockAuthContext
    );
    expect(assigned.status).toBe('assigned');

    // 4. Complete first task
    const completed = updateTask(
      task1.taskId,
      { status: 'completed' },
      mockAuthContext
    );
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeDefined();

    // 5. Create CRM payload
    const crmPayload = buildCRMPayload(
      {
        householdId: 'hh-001',
        payloadType: 'note',
        sourceTaskId: task1.taskId,
        payload: { note_text: 'Completed review task' },
      },
      mockAuthContext
    );
    expect(crmPayload.syncStatus).toBe('pending');

    // 6. Create CPA request
    const cpaRequest = createCPARequest(
      {
        householdId: 'hh-001',
        taxYear: 2025,
        subject: 'Roth Conversion Guidance',
        message: 'Please advise on conversion timing',
        cpaEmail: 'cpa@example.com',
      },
      mockAuthContext
    );
    expect(cpaRequest.status).toBe('draft');

    // 7. Send CPA request
    const sent = updateCPARequest(
      cpaRequest.requestId,
      { status: 'sent' },
      mockAuthContext
    );
    expect(sent.status).toBe('sent');
    expect(sent.sentAt).toBeDefined();

    // 8. Complete workflow
    const completedWorkflow = updateWorkflow(
      workflow.workflowRunId,
      { status: 'completed' },
      mockAuthContext
    );
    expect(completedWorkflow.status).toBe('completed');
    expect(completedWorkflow.completedAt).toBeDefined();

    // 9. Verify audit trail
    const auditEvents = auditService.query({ firmId: 'firm-001' });
    expect(auditEvents.total).toBeGreaterThan(5);
    const eventKeys = auditEvents.events.map((e) => e.event_key);
    expect(eventKeys).toContain('workflow.created');
    expect(eventKeys).toContain('task.created');
    expect(eventKeys).toContain('task.assigned');
    expect(eventKeys).toContain('task.completed');
    expect(eventKeys).toContain('crm_sync.created');
    expect(eventKeys).toContain('cpa_request.created');
    expect(eventKeys).toContain('workflow.completed');
  });
});
