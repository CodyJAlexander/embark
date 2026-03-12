import { useCallback } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { StudioTemplate, StudioPage } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '../utils/helpers';

// ── JSONContent builder helpers ──────────────────────────────────────────────

const h1 = (text: string): JSONContent => ({
  type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text }],
});
const h2 = (text: string): JSONContent => ({
  type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }],
});
const p = (text = ''): JSONContent => ({
  type: 'paragraph', content: text ? [{ type: 'text', text }] : [],
});
const ul = (...items: string[]): JSONContent => ({
  type: 'bulletList',
  content: items.map((text) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  })),
});
const ol = (...items: string[]): JSONContent => ({
  type: 'orderedList',
  content: items.map((text) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  })),
});
const tl = (...items: [string, boolean?][]): JSONContent => ({
  type: 'taskList',
  content: items.map(([text, checked = false]) => ({
    type: 'taskItem',
    attrs: { checked },
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  })),
});
const bq = (text: string): JSONContent => ({
  type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});
const cb = (text: string): JSONContent => ({
  type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text }],
});
const hr = (): JSONContent => ({ type: 'horizontalRule' });
const doc = (...nodes: JSONContent[]): JSONContent => ({ type: 'doc', content: nodes });

// ── Built-in templates ───────────────────────────────────────────────────────

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
    content: doc(
      h1('New Client Kickoff Agenda'),
      h2('Attendees'),
      ul('Client rep:', 'Account manager:', 'Delivery lead:'),
      h2('Goals'),
      p('Define the primary objectives for this engagement.'),
      ol('Align on project scope and timeline', 'Establish communication cadence', 'Confirm success metrics'),
      h2('Action Items'),
      tl(['Send meeting recap'], ['Share onboarding checklist with client'], ['Schedule next check-in']),
    ),
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
    content: doc(
      h1('90-Day Onboarding Plan'),
      bq('This plan is a living document. Update it as milestones are hit.'),
      h2('Day 1–30: Foundation'),
      ol(
        'Complete environment setup',
        'Deliver initial training sessions',
        'Introduce key team members',
        'Establish weekly check-in cadence',
        'Review onboarding checklist progress',
      ),
      h2('Day 31–60: Ramp'),
      ol(
        'Complete advanced training',
        'Run first QBR / progress review',
        'Identify and resolve blockers',
        'Gather NPS feedback',
        'Finalize integrations',
      ),
      h2('Day 61–90: Activate'),
      ol(
        'Transition to steady-state support',
        'Define expansion opportunities',
        'Document lessons learned',
        'Confirm renewal timeline',
        'Schedule graduation meeting',
      ),
      hr(),
      h2('Success Metrics'),
      tl(['NPS score ≥ 8'], ['All checklist items complete'], ['Renewal conversation initiated']),
    ),
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
    content: doc(
      h1('Quarterly Business Review'),
      h2('Last Quarter Recap'),
      p('Summarize what was delivered last quarter.'),
      h2('KPIs'),
      tl(['NPS score:'], ['Tasks completed:'], ['Milestones hit:']),
      h2('Wins'),
      ul(''),
      h2('Challenges'),
      ul(''),
      h2('Next Quarter Goals'),
      ol('', '', ''),
      tl(['Goals approved by client'], ['Follow-up scheduled']),
    ),
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
    content: doc(
      h1('Client Escalation Runbook'),
      bq('Use this runbook any time a client raises a P1 or P2 issue.'),
      h2('Immediate Steps'),
      ol(
        'Acknowledge the client within 1 hour',
        'Log the escalation in the communication log',
        'Notify delivery lead and account manager',
        'Create a blocker task linked to the client',
        'Schedule a call within 24 hours',
      ),
      h2('Escalation Path'),
      ul('L1: Account Manager', 'L2: Delivery Lead', 'L3: Director of Customer Success', 'L4: VP of Operations'),
      h2('Email Template'),
      cb(`Subject: [Action Required] Update on your support case

Hi [Client Name],

Thank you for bringing this to our attention. We are actively working on a resolution and will have an update for you by [date/time].

Please don't hesitate to reach out with any questions.

Best,
[Your Name]`),
    ),
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
    content: doc(
      h1('Onboarding SOP'),
      h2('Pre-Start Checklist'),
      tl(
        ['SLA agreement signed'],
        ['Kickoff call scheduled'],
        ['Access credentials received'],
        ['Client folder created'],
        ['Internal team briefed'],
      ),
      h2('Week 1'),
      ol(
        'Deliver welcome email and onboarding guide',
        'Complete environment setup',
        'First training session',
        'Log initial communication',
      ),
      hr(),
      h2('Handoff Criteria'),
      tl(
        ['All Week 1 tasks complete'],
        ['Client confirmed setup is working'],
        ['Steady-state support team introduced'],
        ['Next milestone date confirmed'],
      ),
    ),
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
    content: doc(
      h1('Meeting Notes'),
      h2('Attendees'),
      ul(''),
      h2('Agenda'),
      ol('', '', ''),
      h2('Decisions'),
      ul(''),
      h2('Action Items'),
      tl([''], ['']),
      h2('Next Meeting'),
      p('Date: '),
      p('Agenda: '),
    ),
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
    content: doc(
      h1('Feature Request Log'),
      bq('Keep this log updated after every client call.'),
      h2('Active Requests'),
      ol('', ''),
      h2('Backlog'),
      ul('', ''),
      h2('Shipped'),
      ul(''),
    ),
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
    content: doc(
      h1('Client Health Check'),
      h2('Health Indicators'),
      tl(
        ['NPS score collected (target ≥ 8)'],
        ['Key milestones on track'],
        ['No open escalations'],
        ['Renewal conversation initiated'],
      ),
      h2('Risk Flags'),
      ul('No response in 2+ weeks', 'Overdue tasks > 20%', 'Negative NPS or complaint'),
      h2('Actions'),
      tl(
        ['Update health score in CRM'],
        ['Schedule follow-up if at-risk'],
        ['Notify account manager of findings'],
      ),
    ),
  },
];

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStudioTemplates() {
  const [userTemplates, setUserTemplates] = useLocalStorage<StudioTemplate[]>('studio-templates', []);

  const templates = [
    ...BUILT_IN_TEMPLATES,
    ...userTemplates.filter((t) => !t.isBuiltIn),
  ];

  const useTemplate = useCallback((templateId: string): StudioPage => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    const now = new Date().toISOString();
    const newPage: StudioPage = {
      id: generateId(),
      title: template.name,
      icon: template.icon,
      content: JSON.parse(JSON.stringify(template.content)) as JSONContent,
      parentId: null,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };

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
      content: JSON.parse(JSON.stringify(page.content)) as JSONContent,
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
