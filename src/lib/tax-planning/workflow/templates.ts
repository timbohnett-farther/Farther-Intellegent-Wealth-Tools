// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Workflow Templates
// =============================================================================
//
// Built-in workflow template registry with 6 standard templates.
// =============================================================================

import type { WorkflowTemplate, WorkflowType } from './types';

// =====================================================================
// Template Registry
// =====================================================================

const TEMPLATES: Record<WorkflowType, WorkflowTemplate> = {
  implement_recommendation: {
    templateId: 'implement_recommendation',
    name: 'Implement Tax Recommendation',
    description: 'Standard workflow for implementing a tax planning recommendation.',
    version: '1.0.0',
    tasks: [
      {
        taskKey: 'review',
        taskType: 'review',
        title: 'Review recommendation: {{recommendationTitle}}',
        description: 'Internal review of recommendation feasibility and compliance.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: [],
        estimatedDays: 2,
      },
      {
        taskKey: 'discuss',
        taskType: 'client_discussion',
        title: 'Discuss with client: {{recommendationTitle}}',
        description: 'Schedule and conduct client meeting to present recommendation.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: ['review'],
        estimatedDays: 7,
      },
      {
        taskKey: 'coordinate_cpa',
        taskType: 'coordinate_cpa',
        title: 'Coordinate with CPA on {{recommendationTitle}}',
        description: 'Send formal request to CPA and await response.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: ['discuss'],
        estimatedDays: 5,
      },
      {
        taskKey: 'implement',
        taskType: 'implementation',
        title: 'Execute implementation steps for {{recommendationTitle}}',
        description: 'Complete all action items required to implement the recommendation.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: ['coordinate_cpa'],
        estimatedDays: 10,
      },
    ],
    enabled: true,
  },

  coordinate_cpa: {
    templateId: 'coordinate_cpa',
    name: 'CPA Coordination',
    description: 'Workflow for coordinating with external CPA on a tax matter.',
    version: '1.0.0',
    tasks: [
      {
        taskKey: 'prepare_memo',
        taskType: 'review',
        title: 'Prepare CPA memo for {{subject}}',
        description: 'Draft technical memo summarizing the tax issue and requested guidance.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: [],
        estimatedDays: 2,
      },
      {
        taskKey: 'send_request',
        taskType: 'coordinate_cpa',
        title: 'Send CPA request: {{subject}}',
        description: 'Send formal request to CPA via email or portal.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: ['prepare_memo'],
        estimatedDays: 1,
      },
      {
        taskKey: 'follow_up',
        taskType: 'follow_up',
        title: 'Follow up on CPA request: {{subject}}',
        description: 'Follow up if no response received within expected timeframe.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: ['send_request'],
        estimatedDays: 7,
      },
    ],
    enabled: true,
  },

  client_follow_up: {
    templateId: 'client_follow_up',
    name: 'Client Follow-Up',
    description: 'Standard workflow for following up with a client.',
    version: '1.0.0',
    tasks: [
      {
        taskKey: 'schedule_meeting',
        taskType: 'prepare_meeting',
        title: 'Schedule follow-up meeting with {{clientName}}',
        description: 'Reach out to client to schedule follow-up meeting.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: [],
        estimatedDays: 3,
      },
      {
        taskKey: 'follow_up',
        taskType: 'follow_up',
        title: 'Complete follow-up with {{clientName}}',
        description: 'Conduct follow-up meeting and document outcomes.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: ['schedule_meeting'],
        estimatedDays: 7,
      },
    ],
    enabled: true,
  },

  meeting_prep: {
    templateId: 'meeting_prep',
    name: 'Meeting Preparation',
    description: 'Workflow for preparing for a client or stakeholder meeting.',
    version: '1.0.0',
    tasks: [
      {
        taskKey: 'prepare_brief',
        taskType: 'prepare_meeting',
        title: 'Prepare meeting brief for {{meetingSubject}}',
        description: 'Assemble agenda, talking points, and key numbers.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: [],
        estimatedDays: 2,
      },
      {
        taskKey: 'review_data',
        taskType: 'review',
        title: 'Review latest data for {{meetingSubject}}',
        description: 'Ensure all household data is current and accurate.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: [],
        estimatedDays: 1,
      },
      {
        taskKey: 'prepare_talking_points',
        taskType: 'prepare_meeting',
        title: 'Finalize talking points for {{meetingSubject}}',
        description: 'Review and finalize advisor talking points.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: ['prepare_brief', 'review_data'],
        estimatedDays: 1,
      },
    ],
    enabled: true,
  },

  data_collection: {
    templateId: 'data_collection',
    name: 'Data Collection',
    description: 'Workflow for requesting and reviewing client data.',
    version: '1.0.0',
    tasks: [
      {
        taskKey: 'request_data',
        taskType: 'request_data',
        title: 'Request {{dataType}} from client',
        description: 'Send data request to client with specific instructions.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: [],
        estimatedDays: 1,
      },
      {
        taskKey: 'review_received_data',
        taskType: 'review',
        title: 'Review received {{dataType}}',
        description: 'Validate completeness and accuracy of received data.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: ['request_data'],
        estimatedDays: 7,
      },
    ],
    enabled: true,
  },

  review_and_approve: {
    templateId: 'review_and_approve',
    name: 'Review and Approve',
    description: 'Workflow for multi-stage review and approval process.',
    version: '1.0.0',
    tasks: [
      {
        taskKey: 'initial_review',
        taskType: 'review',
        title: 'Initial review: {{itemName}}',
        description: 'First-pass review for accuracy and completeness.',
        defaultOwnerRole: 'PARAPLANNER',
        dependsOnKeys: [],
        estimatedDays: 2,
      },
      {
        taskKey: 'compliance_check',
        taskType: 'compliance',
        title: 'Compliance check: {{itemName}}',
        description: 'Verify compliance with regulatory requirements.',
        defaultOwnerRole: 'OPS',
        dependsOnKeys: ['initial_review'],
        estimatedDays: 3,
      },
      {
        taskKey: 'final_approval',
        taskType: 'review',
        title: 'Final approval: {{itemName}}',
        description: 'Final advisor approval before delivery.',
        defaultOwnerRole: 'ADVISOR',
        dependsOnKeys: ['compliance_check'],
        estimatedDays: 1,
      },
    ],
    enabled: true,
  },
};

// =====================================================================
// Template Getters
// =====================================================================

/**
 * Retrieves a workflow template by type.
 */
export function getWorkflowTemplate(workflowType: WorkflowType): WorkflowTemplate | undefined {
  return TEMPLATES[workflowType];
}

/**
 * Returns all enabled workflow templates.
 */
export function getAllWorkflowTemplates(): WorkflowTemplate[] {
  return Object.values(TEMPLATES).filter((t) => t.enabled);
}
