import { useState } from 'react';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix';
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '5.0.0',
    date: 'March 4, 2026',
    title: 'Personalized Embark',
    changes: [
      { type: 'feature', description: 'Auth System — login and registration page with per-user profiles stored in localStorage; isolated from existing data, structured for easy backend migration' },
      { type: 'feature', description: 'New-User Onboarding Wizard — 5-step guided setup covering profile, avatar upload, team join/create, class selection, and dashboard configuration' },
      { type: 'feature', description: 'Build-A-Dash — 13-widget dashboard picker; choose which widgets you see, toggle anytime via the new Customize button in the dashboard header' },
      { type: 'feature', description: 'User Avatar Chip — sidebar footer shows your profile photo (or initials) and username with a dropdown for profile access and sign-out' },
      { type: 'improvement', description: 'Dashboard widget visibility persists per user; each account has its own dashboard configuration saved to localStorage' },
      { type: 'improvement', description: 'Character class from your profile is synced to the gamification engine automatically on every login' },
    ],
  },
  {
    version: '4.0.0',
    date: 'March 4, 2026',
    title: 'Intelligent Onboarding Suite',
    changes: [
      { type: 'feature', description: 'Smart Client Intake Wizard — 3-step guided wizard (info → template → team) replaces the single-form client creation flow' },
      { type: 'feature', description: 'Onboarding Health Score — 0–100 score computed from task completion, SLA status, communication recency, and blocked tasks; shown as a color-coded badge with breakdown popover' },
      { type: 'feature', description: 'Auto Next-Action Banner — AI-free banner on every client card and detail view showing the single highest-priority action (overdue task, blocked task, due-soon task, SLA warning, or no-comm alert)' },
      { type: 'feature', description: 'Phase Gates — "Advance Phase" button appears when all tasks in a phase are complete; prior-phase tasks are locked and dimmed until that phase advances' },
      { type: 'feature', description: 'Client Graduation Ceremony — completing all checklist items fires confetti, opens an AI-generated handoff summary modal, pins the summary as a note, and awards 75 XP' },
      { type: 'feature', description: 'AI Health Pulse — collapsible panel on each client detail page generates a 3–5 sentence AI health summary; results cached per-client and refreshable on demand' },
      { type: 'feature', description: 'Smart Kickoff Pack Generator — one-click AI generation of a client-facing kickoff email and an internal team brief; editable, copy-to-clipboard, and saveable as an email template' },
      { type: 'feature', description: 'Smart Task Suggestions — "AI Suggest" button in the checklist header fetches AI-powered task recommendations tailored to the client\'s services and go-live date; select and add in bulk' },
      { type: 'feature', description: 'Dependency Graph Visualizer — tasks with dependencies get an interactive React Flow graph tab; topological layout with critical path highlighted in red' },
      { type: 'feature', description: 'Bottleneck & Velocity Analytics — three new report widgets: Task Bottleneck Heatmap, Onboarding Velocity Trend (by month), and Phase Duration Breakdown' },
      { type: 'improvement', description: 'Enhanced Client Portal — horizontal phase timeline, health status banner (On Track / At Risk / Behind), upcoming tasks in next 14 days, and a print button' },
    ],
  },
  {
    version: '3.0.0',
    date: 'March 3, 2026',
    title: 'Enterprise Upgrade',
    changes: [
      { type: 'feature', description: 'Client Portal — share a beautiful read-only progress view with clients; export as a self-contained HTML file that works offline' },
      { type: 'feature', description: 'Webhooks & Slack integration — send real-time alerts to Slack or any custom URL when clients are created, tasks completed, SLAs breached, and more' },
      { type: 'feature', description: 'SLA Engine — define onboarding, task, communication, and first-response SLAs; see on-track / warning / breached status across all clients' },
      { type: 'feature', description: 'Custom Report Builder — drag-and-drop dashboard canvas with 11 widget types, saveable dashboards, starter templates, and print-to-PDF export' },
      { type: 'feature', description: 'Event bus — shared pub/sub wires all four features together so webhooks, SLA alerts, and automations all react to the same client events' },
      { type: 'improvement', description: 'SLA Status widget added to the Dashboard — on-track / warning / breached counts plus worst-5 client list at a glance' },
      { type: 'improvement', description: 'Integrations nav item added to the sidebar — configure webhooks, review delivery logs, and manage SLA rules in one place' },
      { type: 'improvement', description: 'Reports view now has an Overview tab (existing analytics) and a Builder tab (new drag-and-drop canvas)' },
      { type: 'improvement', description: 'Complete app backup now includes webhooks, delivery log, SLA definitions, and saved report dashboards' },
    ],
  },
  {
    version: '2.3.0',
    date: 'March 3, 2026',
    title: 'Contract Renewal Alerts',
    changes: [
      { type: 'feature', description: 'Configurable renewal alert thresholds — get notified at 90, 60, 30, 14, and/or 7 days before a contract renews' },
      { type: 'feature', description: 'Notification bell alerts for contract renewals — fires once per client per threshold, no duplicates on reload' },
      { type: 'improvement', description: 'Renewal alert settings in Notifications preferences — toggle on/off and select which day thresholds to enable' },
      { type: 'improvement', description: 'Dashboard renewal widget now respects your max configured threshold instead of a hardcoded 30 days' },
      { type: 'improvement', description: 'Account section renewal banner threshold also follows your configured settings' },
    ],
  },
  {
    version: '2.2.0',
    date: 'March 3, 2026',
    title: 'CRM & Lifecycle Management',
    changes: [
      { type: 'feature', description: 'Lifecycle Stages — classify clients as Onboarding, Active Client, At-Risk, or Churned' },
      { type: 'feature', description: 'Account Info panel — track MRR, contract value, renewal date, billing cycle, industry, website, and NPS score' },
      { type: 'feature', description: 'CRM health scoring — active clients scored on communication recency instead of task activity' },
      { type: 'feature', description: 'Renewal alerts — yellow banner when contract renewal is within 30 days' },
      { type: 'feature', description: 'CRM Dashboard panel — MRR total, stage funnel, and upcoming renewals at a glance' },
      { type: 'improvement', description: 'Lifecycle stage badges on client cards for non-onboarding clients' },
      { type: 'improvement', description: 'Lifecycle stage filter in the client list alongside status and assignee filters' },
    ],
  },
  {
    version: '2.1.0',
    date: 'February 11, 2026',
    title: 'Team & Planner Update',
    changes: [
      { type: 'feature', description: 'Daily Planner - full time block management with create, edit, and delete' },
      { type: 'feature', description: 'Daily Journal - notes and daily goals with auto-save' },
      { type: 'feature', description: 'Team Management - add team members with roles (Owner, Admin, Member, Viewer)' },
      { type: 'feature', description: 'Team Assignments - assign multiple team members to clients with custom roles' },
      { type: 'feature', description: 'Assignment Roles - customizable roles like Delivery Lead, Account Manager, TAM' },
      { type: 'feature', description: 'Multiple Client Contacts - add multiple points of contact per client' },
      { type: 'feature', description: 'Complete App Backup - export and restore all app data at once' },
      { type: 'improvement', description: 'Day detail panel - click any day to see tasks, time blocks, and journal' },
      { type: 'improvement', description: 'Keyboard shortcuts - press Escape to close panels and modals' },
      { type: 'fix', description: 'Error boundaries - graceful error handling with recovery options' },
    ],
  },
  {
    version: '2.0.0',
    date: 'February 5, 2026',
    title: 'Major Update',
    changes: [
      { type: 'feature', description: 'Collapsible sidebar with quick client access' },
      { type: 'feature', description: 'Favorites - pin your most important clients' },
      { type: 'feature', description: 'Recent activity feed across all clients' },
      { type: 'feature', description: 'Color themes - personalize your workspace' },
      { type: 'feature', description: 'Settings menu with dark/light mode toggle' },
      { type: 'feature', description: 'Undo/Redo support with keyboard shortcuts' },
      { type: 'feature', description: 'Onboarding wizard for new users' },
    ],
  },
  {
    version: '1.5.0',
    date: 'February 1, 2026',
    title: 'Enhanced Features',
    changes: [
      { type: 'feature', description: 'File attachments - attach documents to clients' },
      { type: 'feature', description: 'Communication log - track emails, calls, meetings' },
      { type: 'feature', description: 'Milestones - visual onboarding progress tracking' },
      { type: 'feature', description: 'Custom fields - add your own data fields' },
      { type: 'feature', description: 'Notes templates with variable support' },
      { type: 'feature', description: 'Quick Add floating action button' },
      { type: 'feature', description: 'PDF export for client reports' },
      { type: 'feature', description: 'Excel export with multiple sheets' },
    ],
  },
  {
    version: '1.0.0',
    date: 'January 15, 2026',
    title: 'Initial Release',
    changes: [
      { type: 'feature', description: 'Client management with multiple views' },
      { type: 'feature', description: 'Customizable checklist templates' },
      { type: 'feature', description: 'Service tracking per client' },
      { type: 'feature', description: 'Dashboard with analytics' },
      { type: 'feature', description: 'Tags and filtering' },
      { type: 'feature', description: 'Automation rules' },
      { type: 'feature', description: 'Import/Export functionality' },
    ],
  },
];

const typeColors = {
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  improvement: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  fix: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const typeLabels = {
  feature: 'New',
  improvement: 'Improved',
  fix: 'Fixed',
};

interface ChangelogProps {
  isCollapsed?: boolean;
}

export function Changelog({ isCollapsed = false }: ChangelogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 transition-all ${
          isCollapsed ? 'justify-center' : ''
        }`}
        title={isCollapsed ? "What's New" : undefined}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        {!isCollapsed && <span className="font-medium text-sm">What's New</span>}
        {!isCollapsed && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white">
            v5.0
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative glass-strong rounded-2xl shadow-2xl max-w-lg w-full border border-white/30 dark:border-white/10 max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold gradient-text">What's New</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Latest updates and features
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {changelog.map((entry) => (
                  <div key={entry.version}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2.5 py-1 rounded-lg text-sm font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                        v{entry.version}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.date}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {entry.title}
                    </h3>
                    <ul className="space-y-2">
                      {entry.changes.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeColors[change.type]}`}>
                            {typeLabels[change.type]}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {change.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/20 dark:border-white/10 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Made with care for better client onboarding
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
