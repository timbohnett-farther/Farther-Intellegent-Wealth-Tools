// =============================================================================
// Automation Engine — System Workflow Templates
// =============================================================================

import type { WorkflowTemplate } from './types';

/**
 * System-defined workflow templates that ship with the platform.
 * These are marked as `isSystem: true` and cannot be edited by users.
 * Each template defines a complete automation sequence triggered by
 * a specific event type.
 */
export const SYSTEM_WORKFLOWS: WorkflowTemplate[] = [
  // ==================== New Client Onboarding ====================
  {
    id: 'sys_wf_new_client_onboarding',
    name: 'New Client Onboarding',
    trigger: {
      type: 'client_created',
      config: {},
    },
    steps: [
      {
        action: 'create_crm_contact',
        delay: 0,
        templateId: null,
        taskText: 'Create CRM contact record for new client',
        config: {
          syncFields: ['name', 'email', 'phone', 'address'],
        },
      },
      {
        action: 'send_email',
        delay: 0,
        templateId: 'tpl_welcome_email',
        taskText: 'Send welcome email to new client',
        config: {
          emailType: 'welcome',
          includeAttachments: ['privacy_policy', 'service_agreement'],
        },
      },
      {
        action: 'create_plan_shell',
        delay: 0,
        templateId: null,
        taskText: 'Create initial comprehensive plan shell',
        config: {
          planType: 'comprehensive',
          status: 'draft',
        },
      },
      {
        action: 'send_portal_invite',
        delay: 300, // 5 minutes after previous steps
        templateId: 'tpl_portal_invite',
        taskText: 'Send client portal invitation with login credentials',
        config: {
          portalAccess: ['view_plan', 'upload_documents', 'messaging'],
        },
      },
      {
        action: 'schedule_meeting',
        delay: 0,
        templateId: null,
        taskText: 'Schedule initial discovery meeting with advisor',
        config: {
          meetingType: 'initial_consultation',
          durationMinutes: 60,
          defaultDaysOut: 7,
        },
      },
      {
        action: 'create_task',
        delay: 0,
        templateId: null,
        taskText: 'Review new client profile and prepare for discovery meeting',
        config: {
          assignTo: 'primary_advisor',
          priority: 'high',
          dueDays: 3,
        },
      },
      {
        action: 'send_document_request',
        delay: 600, // 10 minutes delay
        templateId: 'tpl_document_checklist',
        taskText: 'Send document collection request to client',
        config: {
          documents: [
            'tax_returns_3yr',
            'pay_stubs',
            'investment_statements',
            'insurance_policies',
            'estate_documents',
            'social_security_statement',
          ],
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // ==================== Annual Review ====================
  {
    id: 'sys_wf_annual_review',
    name: 'Annual Review',
    trigger: {
      type: 'scheduled',
      config: {
        schedule: 'annual',
        description: 'Triggered annually for each active client',
      },
    },
    steps: [
      {
        action: 'recalculate_plans',
        delay: 0,
        templateId: null,
        taskText: 'Recalculate all active plans with current data and assumptions',
        config: {
          scope: 'all_active_plans',
          updateAssumptions: true,
          updateTaxTables: true,
        },
      },
      {
        action: 'generate_report',
        delay: 0,
        templateId: 'tpl_annual_review_report',
        taskText: 'Generate annual review reports for each client',
        config: {
          reportType: 'annual_review',
          includeComparison: true,
          includeMonteCarlo: true,
          includeGoalProgress: true,
        },
      },
      {
        action: 'create_review_task',
        delay: 0,
        templateId: null,
        taskText: 'Complete annual review analysis and prepare talking points',
        config: {
          assignTo: 'primary_advisor',
          priority: 'high',
          dueDays: 14,
          checklist: [
            'Review plan changes year-over-year',
            'Check goal funding status',
            'Review tax strategy opportunities',
            'Assess insurance coverage adequacy',
            'Review estate plan updates',
          ],
        },
      },
      {
        action: 'send_email',
        delay: 0,
        templateId: 'tpl_annual_review_invite',
        taskText: 'Send annual review meeting invitation to client',
        config: {
          emailType: 'annual_review_invitation',
          includePreMeetingChecklist: true,
        },
      },
      {
        action: 'update_crm',
        delay: 0,
        templateId: null,
        taskText: 'Update CRM with annual review status and next review date',
        config: {
          fields: ['last_review_date', 'next_review_date', 'review_status'],
          setNextReview: true,
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // ==================== RMD Reminder ====================
  {
    id: 'sys_wf_rmd_reminder',
    name: 'RMD Reminder',
    trigger: {
      type: 'scheduled',
      config: {
        schedule: 'annual',
        month: 10, // October
        description: 'Triggered annually in October for RMD-eligible clients',
      },
    },
    steps: [
      {
        action: 'identify_clients',
        delay: 0,
        templateId: null,
        taskText: 'Identify all clients age 72+ who are subject to RMD requirements',
        config: {
          criteria: {
            minimumAge: 72,
            hasAccountTypes: [
              'ira_traditional',
              'ira_rollover',
              'ira_sep',
              'ira_simple',
              '401k_traditional',
              '403b_traditional',
              'ira_inherited',
            ],
          },
        },
      },
      {
        action: 'generate_calculations',
        delay: 0,
        templateId: null,
        taskText: 'Generate RMD calculations for all eligible accounts',
        config: {
          calculationType: 'rmd',
          includeProjections: true,
          taxImpactAnalysis: true,
        },
      },
      {
        action: 'send_alert',
        delay: 0,
        templateId: 'tpl_rmd_alert',
        taskText: 'Send RMD alerts to advisors with client details and amounts',
        config: {
          alertType: 'rmd_reminder',
          priority: 'high',
          includeDeadline: true,
          deadlineDate: 'december_31',
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // ==================== Market Correction Response ====================
  {
    id: 'sys_wf_market_correction',
    name: 'Market Correction Response',
    trigger: {
      type: 'account_synced',
      config: {
        condition: 'market_decline',
        declineThresholdPct: 10,
        description: 'Triggered when market declines exceed 10% from recent high',
      },
    },
    steps: [
      {
        action: 'recalculate_plans',
        delay: 0,
        templateId: null,
        taskText: 'Recalculate all affected financial plans with updated market values',
        config: {
          scope: 'affected_plans',
          priority: 'immediate',
          updateAccountBalances: true,
        },
      },
      {
        action: 'generate_report',
        delay: 0,
        templateId: 'tpl_market_impact_report',
        taskText: 'Generate market impact alerts showing plan status changes',
        config: {
          reportType: 'market_impact',
          includeStressTest: true,
          includeRebalancingRecommendations: true,
          highlightGoalsAtRisk: true,
        },
      },
      {
        action: 'notify_advisor',
        delay: 0,
        templateId: 'tpl_market_correction_notification',
        taskText: 'Notify advisors of affected clients and recommended actions',
        config: {
          notificationType: 'in_app_and_email',
          priority: 'urgent',
          includeSummary: true,
          includeClientList: true,
          suggestActions: [
            'Review at-risk client plans',
            'Contact clients near retirement',
            'Assess rebalancing opportunities',
            'Review tax-loss harvesting potential',
          ],
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // ==================== Life Event Response ====================
  {
    id: 'sys_wf_life_event_response',
    name: 'Life Event Response',
    trigger: {
      type: 'life_event',
      config: {
        eventTypes: [
          'marriage',
          'new_child',
          'job_change',
          'home_purchase',
          'inheritance',
          'divorce',
          'death_in_family',
        ],
      },
    },
    steps: [
      {
        action: 'notify_advisor',
        delay: 0,
        templateId: 'tpl_life_event_notification',
        taskText: 'Notify advisor of client life event requiring plan review',
        config: {
          notificationType: 'in_app_and_email',
          priority: 'high',
          includeEventDetails: true,
          includeClientSummary: true,
        },
      },
      {
        action: 'create_review_task',
        delay: 0,
        templateId: null,
        taskText: 'Review and update financial plan in response to life event',
        config: {
          assignTo: 'primary_advisor',
          priority: 'high',
          dueDays: 7,
          checklist: [
            'Update client profile with new information',
            'Review impact on current financial goals',
            'Assess insurance coverage changes needed',
            'Review estate planning implications',
            'Update tax strategy if applicable',
            'Schedule follow-up meeting with client',
          ],
        },
      },
      {
        action: 'suggest_plan_updates',
        delay: 0,
        templateId: null,
        taskText: 'Generate AI-driven suggestions for plan updates based on life event',
        config: {
          analysisAreas: [
            'income_changes',
            'expense_changes',
            'insurance_needs',
            'estate_planning',
            'tax_implications',
            'goal_adjustments',
          ],
          generateRecommendations: true,
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },
];
