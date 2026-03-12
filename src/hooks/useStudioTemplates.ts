import { useCallback } from 'react';
import type { StudioTemplate, StudioPage, StudioBlock } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '../utils/helpers';

function b(type: StudioBlock['type'], content: string, extra?: Partial<StudioBlock>): StudioBlock {
  return { id: generateId(), type, content, ...extra };
}

const BUILT_IN_TEMPLATES: StudioTemplate[] = [
  {
    id: 'builtin-kickoff-agenda',
    name: 'New Client Kickoff Agenda',
    description: 'A structured agenda for your first client meeting — attendees, goals, and action items.',
    category: 'meeting',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '🤝',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'New Client Kickoff Agenda'),
      b('heading2', 'Attendees'),
      b('bullet', 'Client rep:'),
      b('bullet', 'Account manager:'),
      b('bullet', 'Delivery lead:'),
      b('heading2', 'Goals'),
      b('paragraph', 'Define the primary objectives for this engagement.'),
      b('numbered', 'Align on project scope and timeline'),
      b('numbered', 'Establish communication cadence'),
      b('numbered', 'Confirm success metrics'),
      b('heading2', 'Action Items'),
      b('todo', 'Send meeting recap'),
      b('todo', 'Share onboarding checklist with client'),
      b('todo', 'Schedule next check-in'),
    ],
  },
  {
    id: 'builtin-90-day-plan',
    name: '90-Day Onboarding Plan',
    description: 'A phased onboarding roadmap covering Day 1-30, 31-60, and 61-90 milestones.',
    category: 'onboarding',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '🗓️',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', '90-Day Onboarding Plan'),
      b('callout', 'This plan is a living document. Update it as milestones are hit.', { metadata: { calloutIcon: '💡' } }),
      b('heading2', 'Day 1–30: Foundation'),
      b('numbered', 'Complete environment setup'),
      b('numbered', 'Deliver initial training sessions'),
      b('numbered', 'Introduce key team members'),
      b('numbered', 'Establish weekly check-in cadence'),
      b('numbered', 'Review onboarding checklist progress'),
      b('heading2', 'Day 31–60: Ramp'),
      b('numbered', 'Complete advanced training'),
      b('numbered', 'Run first QBR / progress review'),
      b('numbered', 'Identify and resolve blockers'),
      b('numbered', 'Gather NPS feedback'),
      b('numbered', 'Finalize integrations'),
      b('heading2', 'Day 61–90: Activate'),
      b('numbered', 'Transition to steady-state support'),
      b('numbered', 'Define expansion opportunities'),
      b('numbered', 'Document lessons learned'),
      b('numbered', 'Confirm renewal timeline'),
      b('numbered', 'Schedule graduation meeting'),
      b('divider', ''),
      b('heading2', 'Success Metrics'),
      b('todo', 'NPS score ≥ 8'),
      b('todo', 'All checklist items complete'),
      b('todo', 'Renewal conversation initiated'),
    ],
  },
  {
    id: 'builtin-qbr',
    name: 'QBR Template',
    description: 'Quarterly business review template covering KPIs, wins, challenges, and Q+1 goals.',
    category: 'planning',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '📊',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'Quarterly Business Review'),
      b('heading2', 'Last Quarter Recap'),
      b('paragraph', 'Summarize what was delivered last quarter.'),
      b('heading2', 'KPIs'),
      b('todo', 'NPS score:'),
      b('todo', 'Tasks completed:'),
      b('todo', 'Milestones hit:'),
      b('heading2', 'Wins'),
      b('bullet', ''),
      b('heading2', 'Challenges'),
      b('bullet', ''),
      b('heading2', 'Next Quarter Goals'),
      b('numbered', ''),
      b('numbered', ''),
      b('numbered', ''),
      b('todo', 'Goals approved by client'),
      b('todo', 'Follow-up scheduled'),
    ],
  },
  {
    id: 'builtin-escalation-runbook',
    name: 'Client Escalation Runbook',
    description: 'Step-by-step process for handling client escalations with escalation paths and email templates.',
    category: 'process',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '🚨',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'Client Escalation Runbook'),
      b('callout', 'Use this runbook any time a client raises a P1 or P2 issue.', { metadata: { calloutIcon: '⚠️' } }),
      b('heading2', 'Immediate Steps'),
      b('numbered', 'Acknowledge the client within 1 hour'),
      b('numbered', 'Log the escalation in the communication log'),
      b('numbered', 'Notify delivery lead and account manager'),
      b('numbered', 'Create a blocker task linked to the client'),
      b('numbered', 'Schedule a call within 24 hours'),
      b('heading2', 'Escalation Path'),
      b('bullet', 'L1: Account Manager'),
      b('bullet', 'L2: Delivery Lead'),
      b('bullet', 'L3: Director of Customer Success'),
      b('bullet', 'L4: VP of Operations'),
      b('heading2', 'Email Template'),
      b('code', `Subject: [Action Required] Update on your support case

Hi [Client Name],

Thank you for bringing this to our attention. We are actively working on a resolution and will have an update for you by [date/time].

Please don't hesitate to reach out with any questions.

Best,
[Your Name]`, { metadata: { language: 'text' } }),
    ],
  },
  {
    id: 'builtin-onboarding-sop',
    name: 'Onboarding SOP',
    description: 'Standard operating procedure for onboarding new clients from pre-start through handoff.',
    category: 'process',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '📋',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'Onboarding SOP'),
      b('heading2', 'Pre-Start Checklist'),
      b('todo', 'SLA agreement signed'),
      b('todo', 'Kickoff call scheduled'),
      b('todo', 'Access credentials received'),
      b('todo', 'Client folder created'),
      b('todo', 'Internal team briefed'),
      b('heading2', 'Week 1'),
      b('numbered', 'Deliver welcome email and onboarding guide'),
      b('numbered', 'Complete environment setup'),
      b('numbered', 'First training session'),
      b('numbered', 'Log initial communication'),
      b('divider', ''),
      b('heading2', 'Handoff Criteria'),
      b('todo', 'All Week 1 tasks complete'),
      b('todo', 'Client confirmed setup is working'),
      b('todo', 'Steady-state support team introduced'),
      b('todo', 'Next milestone date confirmed'),
    ],
  },
  {
    id: 'builtin-meeting-notes',
    name: 'Meeting Notes',
    description: 'Clean meeting notes template with agenda, decisions, action items, and next steps.',
    category: 'meeting',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '📝',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'Meeting Notes'),
      b('heading2', 'Attendees'),
      b('bullet', ''),
      b('heading2', 'Agenda'),
      b('numbered', ''),
      b('numbered', ''),
      b('numbered', ''),
      b('heading2', 'Decisions'),
      b('bullet', ''),
      b('heading2', 'Action Items'),
      b('todo', ''),
      b('todo', ''),
      b('heading2', 'Next Meeting'),
      b('paragraph', 'Date: '),
      b('paragraph', 'Agenda: '),
    ],
  },
  {
    id: 'builtin-feature-request-log',
    name: 'Feature Request Log',
    description: 'Track client feature requests from submission through backlog to shipped.',
    category: 'reference',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '💡',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'Feature Request Log'),
      b('callout', 'Keep this log updated after every client call.', { metadata: { calloutIcon: '📌' } }),
      b('heading2', 'Active Requests'),
      b('numbered', ''),
      b('numbered', ''),
      b('heading2', 'Backlog'),
      b('bullet', ''),
      b('bullet', ''),
      b('heading2', 'Shipped'),
      b('bullet', ''),
    ],
  },
  {
    id: 'builtin-health-check',
    name: 'Client Health Check',
    description: 'Periodic health assessment tracking NPS, milestones, escalations, renewal status, and risk flags.',
    category: 'onboarding',
    author: 'Embark Team',
    authorRole: 'Customer Success',
    icon: '💚',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    blocks: [
      b('heading1', 'Client Health Check'),
      b('heading2', 'Health Indicators'),
      b('todo', 'NPS score collected (target ≥ 8)'),
      b('todo', 'Key milestones on track'),
      b('todo', 'No open escalations'),
      b('todo', 'Renewal conversation initiated'),
      b('heading2', 'Risk Flags'),
      b('bullet', 'No response in 2+ weeks'),
      b('bullet', 'Overdue tasks > 20%'),
      b('bullet', 'Negative NPS or complaint'),
      b('heading2', 'Actions'),
      b('todo', 'Update health score in CRM'),
      b('todo', 'Schedule follow-up if at-risk'),
      b('todo', 'Notify account manager of findings'),
    ],
  },
];

export function useStudioTemplates() {
  const [userTemplates, setUserTemplates] = useLocalStorage<StudioTemplate[]>('studio-templates', []);

  const templates = [
    ...BUILT_IN_TEMPLATES,
    ...userTemplates.filter((t) => !t.isBuiltIn),
  ];

  const useTemplate = useCallback((templateId: string): StudioPage => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    // Deep-copy blocks with fresh IDs
    const now = new Date().toISOString();
    const newPage: StudioPage = {
      id: generateId(),
      title: template.name,
      icon: template.icon,
      blocks: template.blocks.map((block) => ({
        ...block,
        id: generateId(),
        metadata: block.metadata ? { ...block.metadata } : undefined,
      })),
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };

    // Increment usageCount for user-created templates
    if (!template.isBuiltIn) {
      setUserTemplates((prev) =>
        prev.map((t) => t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t)
      );
    }

    return newPage;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTemplates, setUserTemplates]);

  const saveAsTemplate = useCallback((
    page: StudioPage,
    meta: Pick<StudioTemplate, 'name' | 'description' | 'category'>
  ) => {
    const newTemplate: StudioTemplate = {
      id: generateId(),
      name: meta.name,
      description: meta.description,
      category: meta.category,
      author: 'Me',
      authorRole: 'Custom',
      icon: page.icon,
      blocks: page.blocks.map((block) => ({ ...block, id: generateId() })),
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };
    setUserTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  }, [setUserTemplates]);

  const deleteUserTemplate = useCallback((id: string) => {
    setUserTemplates((prev) => prev.filter((t) => t.id !== id && !t.isBuiltIn));
  }, [setUserTemplates]);

  return { templates, useTemplate, saveAsTemplate, deleteUserTemplate };
}
