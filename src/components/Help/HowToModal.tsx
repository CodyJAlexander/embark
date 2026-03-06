import { useState } from 'react';
import type { ReactNode } from 'react';

interface HowToArticle {
  id: string;
  category: string;
  title: string;
  icon: string;
  summary: string;
  content: ReactNode;
}

const articles: HowToArticle[] = [
  // ── Getting Started ──────────────────────────────────────────────────────
  {
    id: 'app-overview',
    category: 'Getting Started',
    title: 'App Overview & Navigation',
    icon: '🗺️',
    summary: 'Find your way around Embark',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Embark is a client onboarding tracker with a full sidebar for navigating between views,
          a command palette for quick actions, and keyboard shortcuts so you can move fast without
          lifting your hands off the keyboard.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Sidebar views</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Dashboard</span> — high-level metrics and widgets</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Clients</span> — your full client roster</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Tasks</span> — cross-client task board</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Planner</span> — daily time blocks and journal</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Templates</span> — reusable checklist templates</li>
            <li><span className="font-medium text-gray-900 dark:text-white">AI</span> — AI chat and Buds (agents)</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Team</span> — team members and assignments</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Automations</span> — trigger-based rules</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Hall of Heroes</span> — gamification leaderboard</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Reports</span> — analytics and PDF export</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Keyboard shortcuts</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">D</kbd> — Dashboard</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">C</kbd> — Clients</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">T</kbd> — Tasks</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">P</kbd> — Planner</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">H</kbd> — Hall of Heroes</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">R</kbd> — Reports</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">A</kbd> — Automations</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Ctrl+K</kbd> — Command palette</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Esc</kbd> — Close panels and modals</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Collapse the sidebar with the arrow button at the bottom to gain more screen space — client avatars stay visible.</li>
            <li>Use the command palette (<kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Ctrl+K</kbd>) to jump to any client or view instantly.</li>
            <li>Toggle dark mode from the Settings view or the gear icon.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'first-client',
    category: 'Getting Started',
    title: 'Adding Your First Client',
    icon: '🚀',
    summary: 'Create a client and walk through the onboarding wizard',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Getting a new client into Embark takes about 30 seconds. The onboarding wizard then walks
          you through adding contacts, tasks, milestones, and more so nothing falls through the cracks.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How to add a client</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Open Clients view.</span> Click "Clients" in the sidebar or press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">C</kbd>.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Click "+ Add Client"</span> in the top-right corner (or use the floating action button).</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Fill in the form.</span> Name and email are required. Set status (Active / On Hold / Completed), priority (Low / Medium / High / Critical), and any tags.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Save.</span> The client appears in your list immediately.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Follow the wizard.</span> After saving, the onboarding wizard opens — step through contacts, tasks, milestones, and account info to fully set up the client.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>You can skip any wizard step and come back to it later from the client detail panel.</li>
            <li>Use tags to group clients by project type, industry, or any label that makes sense for your workflow.</li>
            <li>Star a client to add it to the Favorites section at the top of the sidebar.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">New: 3-Step Intake Wizard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">When you click <strong>Add Client</strong>, a guided wizard now walks you through three steps:</p>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Client Info</span> — name, go-live date, and contacts (name, email, phone, title)</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Template</span> — optionally pick a checklist template; tasks are pre-populated with due dates offset from the go-live date</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Team</span> — assign team members with roles in one step</li>
          </ol>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">💡 Setting a go-live date in step 1 lets template tasks land on meaningful dates automatically.</p>
        </div>
      </div>
    ),
  },

  // ── Clients ──────────────────────────────────────────────────────────────
  {
    id: 'managing-clients',
    category: 'Clients',
    title: 'Managing Clients',
    icon: '👥',
    summary: 'List view, status lifecycle, archive, duplicate & delete',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Clients view is your main workspace. Switch between list and card views, filter by
          status or tag, and manage the full lifecycle of every client from here.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">View modes</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">List view</span> — compact rows with progress bars, great for large rosters.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Card view</span> — larger cards showing status, priority, tags, and task count.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Status lifecycle</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Active</span> — client is actively being onboarded.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">On Hold</span> — paused, awaiting action from the client or another party.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Completed</span> — onboarding finished.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Client actions</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Edit</span> — open the client and click the edit icon to change any field.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Duplicate</span> — creates a copy with all tasks and settings, useful for recurring engagements.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Archive</span> — hides the client from the main list without deleting data.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Delete</span> — permanently removes the client and all associated data.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Favorite</span> — star a client to pin it at the top of the sidebar.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Use the filter bar to narrow down by status, priority, assignee, tag, or lifecycle stage.</li>
            <li>Archived clients can be restored from the archived clients section.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Health Score</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Every client card and detail header shows a colored <strong>Health Score badge</strong> (0–100). Click it to open a breakdown of four sub-scores: task completion, SLA status, communication recency, and blocked tasks.</p>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>🟢 80+ = Excellent &nbsp;|&nbsp; 🔵 60–79 = Good &nbsp;|&nbsp; 🟡 40–59 = At Risk &nbsp;|&nbsp; 🔴 &lt;40 = Critical</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Next-Action Banner</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Below the progress bar on each client card (and in the header on detail view) a <strong>Next Action</strong> banner surfaces the single most important thing to act on. Priority order: overdue tasks → blocked tasks → tasks due this week → SLA warning → no communication in 7+ days.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Kickoff Pack</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">For clients in the <em>Onboarding</em> lifecycle stage, a <strong>Kickoff Pack</strong> button appears in the header. It generates a client-facing kickoff email and an internal team brief using AI. You can edit both, copy to clipboard, or save the email as a reusable template.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Graduation Ceremony</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">When you complete the last checklist item, confetti fires and a <strong>Graduation modal</strong> appears with an AI-generated handoff summary. Confirm to pin the summary as a note, move the client to <em>Active Client</em> stage, and award 75 XP.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Portal Enhancements</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Health Banner</span> — shows "On Track", "At Risk", or "Behind" based on overall client health (no raw score exposed to the client)</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Phase Timeline</span> — horizontal timeline showing phase progress dots</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Upcoming Tasks</span> — all tasks (not just client-owned) due in the next 14 days</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Print Button</span> — generates a clean printable version of the portal view</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'contacts-account',
    category: 'Clients',
    title: 'Contacts & Account Info',
    icon: '📇',
    summary: 'Multiple contacts, MRR, contract dates, lifecycle stage',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Every client can have multiple points of contact and a rich set of account-level data
          including revenue figures, contract dates, industry, and lifecycle stage.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Adding contacts</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Open a client and go to the <span className="font-medium text-gray-900 dark:text-white">Contacts</span> section.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">+ Add Contact</span> and fill in name, email, phone, and role.</li>
            <li>Mark one contact as the primary contact using the star icon.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Account info fields</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">MRR</span> — monthly recurring revenue for this account.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Contract value</span> — total contract amount.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Contract start / end dates</span> — used for renewal alerts.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Renewal date</span> — triggers alerts at your configured thresholds.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Lifecycle stage</span> — Onboarding, Active Client, At-Risk, or Churned.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Industry, website, NPS score</span> — additional CRM fields.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>The Dashboard CRM panel shows total MRR across all clients and the stage funnel.</li>
            <li>Set a renewal date to receive notification bell alerts before the contract renews.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'notes-tags-fields',
    category: 'Clients',
    title: 'Notes, Tags & Custom Fields',
    icon: '📝',
    summary: 'Pinned notes, tag filtering, and custom data fields',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Capture freeform context with notes, organize clients with tags, and track any extra data
          with custom fields — all without touching the core data model.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Open a client and go to the <span className="font-medium text-gray-900 dark:text-white">Notes</span> tab to add a note.</li>
            <li>Pin important notes so they appear at the top of the list.</li>
            <li>Notes support rich text — use the toolbar for bold, lists, and links.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Add or remove tags from the client form or the tag manager in the client detail.</li>
            <li>Filter the client list by tag using the filter bar.</li>
            <li>Tags are color-coded and shared across all clients.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Custom fields</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Go to <span className="font-medium text-gray-900 dark:text-white">Settings → Custom Fields</span> to define new fields.</li>
            <li>Supported types: <span className="font-medium text-gray-900 dark:text-white">Text, Number, Date, Select, Boolean</span>.</li>
            <li>Custom fields appear in every client's detail panel once created.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Use a Boolean custom field for quick yes/no checklists at the account level.</li>
            <li>Combine tags with saved views to build a filtered list you can pin to the sidebar.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'tasks-checklists',
    category: 'Clients',
    title: 'Tasks & Checklists',
    icon: '✅',
    summary: 'Subtasks, dependencies, recurring tasks, and 5 view modes',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Tasks are the core of client onboarding. Each client has its own checklist, and the global
          Tasks view shows everything across all clients. View tasks as a list, table, kanban board,
          timeline, or calendar.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Creating tasks</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Open a client and go to the <span className="font-medium text-gray-900 dark:text-white">Tasks</span> tab, or use the global Tasks view.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">+ Add Task</span> and enter a title, due date, and assignee.</li>
            <li>Expand a task to add subtasks by clicking the subtask icon.</li>
            <li>Set dependencies by linking a task to another task that must complete first.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Task views</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">List</span> — simple ordered list with checkboxes.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Table</span> — spreadsheet-style with sortable columns.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Kanban</span> — drag cards between To Do / In Progress / Done columns.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Timeline</span> — Gantt-style bar chart by due date.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Calendar</span> — monthly calendar with tasks on their due dates.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Recurring tasks</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Set a recurrence (daily, weekly, monthly) on any task. When completed, a new instance
            is automatically created for the next cycle.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Apply a template to populate a client's task list in one click.</li>
            <li>Use dependencies to enforce order — a blocked task shows a lock icon until its dependency is complete.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI Task Suggestions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Click the <strong>✨ AI Suggest</strong> button in the checklist header to get a list of recommended tasks based on the client's services and go-live date. Check the ones you want and click <em>Add Selected</em>.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Phase Gates</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">When phases are configured, tasks belonging to a later phase are <strong>locked</strong> (dimmed) until all prior phases are marked complete. Once all tasks in a phase are done, an <strong>Advance Phase</strong> button appears — click it to unlock the next phase and log the milestone.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dependency Graph</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">If any tasks have dependencies set (via the task detail), a <strong>graph icon tab</strong> appears in the Tasks header. Click it to view an interactive dependency map showing which tasks block others. The longest chain (critical path) is highlighted in red.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'milestones-attachments',
    category: 'Clients',
    title: 'Milestones, Attachments & Communication',
    icon: '📎',
    summary: 'Track progress milestones, upload files, log calls and emails',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Beyond tasks, Embark lets you mark key milestones in the onboarding journey, attach
          supporting documents, and keep a full communication log of every client interaction.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Milestones</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Open a client and go to the <span className="font-medium text-gray-900 dark:text-white">Milestones</span> tab.</li>
            <li>Add a milestone with a name, target date, and optional description.</li>
            <li>Mark milestones complete — they show as green checkpoints on the client timeline.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">File attachments</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Go to the <span className="font-medium text-gray-900 dark:text-white">Attachments</span> tab and drag-and-drop files or click to browse.</li>
            <li>Supported formats: images, PDFs, Word docs, spreadsheets, and more.</li>
            <li>Click a file to preview it inline or download it.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Communication log</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Go to the <span className="font-medium text-gray-900 dark:text-white">Communication</span> tab to log an interaction.</li>
            <li>Choose the type: <span className="font-medium text-gray-900 dark:text-white">Email, Call, or Meeting</span>.</li>
            <li>Add a date, subject, and summary of what was discussed.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Use the client timeline to get a bird's-eye view of milestones, tasks, and communications in chronological order.</li>
            <li>Attach a signed contract PDF to keep everything in one place.</li>
          </ul>
        </div>
      </div>
    ),
  },

  // ── Productivity ─────────────────────────────────────────────────────────
  {
    id: 'planner',
    category: 'Productivity',
    title: 'The Daily Planner',
    icon: '📅',
    summary: 'Time blocks, daily goals, journal, and calendar integration',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Daily Planner helps you structure your workday with time blocks, track daily goals,
          and keep a running journal — all tied to a calendar view you can sync with Google or
          Microsoft Calendar.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Time blocks</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to <span className="font-medium text-gray-900 dark:text-white">Planner</span> and click on the calendar to select a day.</li>
            <li>In the day panel, click <span className="font-medium text-gray-900 dark:text-white">+ Add Time Block</span>.</li>
            <li>Set a title, start time, end time, and optional color.</li>
            <li>Drag to reorder or resize blocks on the timeline.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Daily goals checklist</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Add up to 5 daily goals at the top of the day panel. Check them off as you go.
            Goals reset each day so you start fresh.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Journal</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The journal area below the goals is a freeform text field. Write reflections, meeting
            notes, or anything else. It auto-saves as you type.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Client tasks with due dates today appear automatically in the day panel.</li>
            <li>Connect Google or Microsoft Calendar in Settings to see external events alongside your time blocks.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'templates',
    category: 'Productivity',
    title: 'Templates',
    icon: '📋',
    summary: 'Create reusable checklist templates with offset-based due dates',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Templates let you define a standard set of tasks once and apply them to any new client
          in one click. Due dates are set relative to the client's start date so they always land
          on the right day.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Creating a template</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to <span className="font-medium text-gray-900 dark:text-white">Templates</span> in the sidebar.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">+ New Template</span> and give it a name.</li>
            <li>Add tasks one by one. For each task, set a <span className="font-medium text-gray-900 dark:text-white">day offset</span> (e.g. +3 means 3 days after the client's start date).</li>
            <li>Save the template.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Applying a template</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Open a client and go to the Tasks tab.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">Apply Template</span>.</li>
            <li>Select the template — tasks are added with due dates calculated from the client's start date.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Build a different template for each service type (e.g. "Software Onboarding", "Marketing Kickoff").</li>
            <li>You can apply multiple templates to the same client — tasks are merged, not replaced.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'automations',
    category: 'Productivity',
    title: 'Automations',
    icon: '⚡',
    summary: 'Trigger-based rules: conditions, actions, and run logs',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Automations run actions automatically when conditions are met — no manual work required.
          Build rules like "when a task is completed, send a notification" or "when a client status
          changes to On Hold, assign a follow-up task."
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Building an automation</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to <span className="font-medium text-gray-900 dark:text-white">Automations</span> in the sidebar.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">+ New Automation</span>.</li>
            <li>Choose a <span className="font-medium text-gray-900 dark:text-white">trigger</span>: Status Changed, Task Completed, Due Date Reached, Client Created, etc.</li>
            <li>Add optional <span className="font-medium text-gray-900 dark:text-white">conditions</span> to narrow when the automation fires (e.g. only for high-priority clients).</li>
            <li>Define one or more <span className="font-medium text-gray-900 dark:text-white">actions</span>: Create Task, Send Notification, Update Status, Apply Template, etc.</li>
            <li>Save and toggle it <span className="font-medium text-gray-900 dark:text-white">enabled</span>.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Automation logs</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Every automation run is logged with a timestamp, the triggering event, and whether it
            succeeded or was skipped. View logs by clicking the log icon on any automation.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Disable an automation without deleting it by toggling the switch — handy for seasonal rules.</li>
            <li>Use the "Apply Template" action to auto-populate tasks when a client is created.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-buds',
    category: 'Productivity',
    title: 'AI Features & Buds',
    icon: '🤖',
    summary: 'AI chat, Anthropic/Ollama setup, and custom AI agents',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The AI view gives you a chat interface for asking questions about your clients and tasks.
          AI Buds are specialized agents with custom system prompts — think of them as pre-configured
          AI personas for different workflows.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Setting up an AI provider</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to <span className="font-medium text-gray-900 dark:text-white">Settings → AI Configuration</span>.</li>
            <li>Choose your provider: <span className="font-medium text-gray-900 dark:text-white">Anthropic</span> (Claude) or <span className="font-medium text-gray-900 dark:text-white">Ollama</span> (local models).</li>
            <li>For Anthropic, paste your API key. For Ollama, set the local endpoint URL.</li>
            <li>Select the model you want to use and save.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Using AI chat</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Open the <span className="font-medium text-gray-900 dark:text-white">AI</span> view and type any question. The AI has context about your clients,
            tasks, and recent activity. Ask things like "Which clients have overdue tasks?" or
            "Draft a status update for Acme Corp."
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Creating an AI Bud</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>In the AI view, go to the <span className="font-medium text-gray-900 dark:text-white">Buds</span> tab.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">+ New Bud</span>, give it a name and avatar.</li>
            <li>Write a system prompt that defines its persona and focus.</li>
            <li>Select the Bud before chatting to activate its persona.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Create a "Status Report Writer" Bud with a prompt that formats updates in your preferred style.</li>
            <li>Ollama lets you run AI locally with no API costs — great for sensitive data.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI Health Pulse</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">On each client's detail page, expand the <strong>🩺 AI Health Pulse</strong> panel (below the header) to get a concise AI summary of the client's current onboarding health. Results are cached — click <em>Refresh</em> to regenerate. No API key = panel shows a graceful message.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Kickoff Pack Generator</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Available via the <strong>Kickoff Pack</strong> button on onboarding-stage clients. Generates a client-facing kickoff email and internal team brief in one API call. Both are editable before copying or saving.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI Task Suggestions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">The <strong>✨ AI Suggest</strong> button in the checklist header fetches task recommendations tailored to the client's services, existing tasks, and go-live date. Select the tasks you want and add them in one click.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Graduation Handoff Summary</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">When all tasks are completed, the Graduation modal uses AI to draft a handoff summary covering services delivered, key milestones, go-live date, and team. Edit the draft before confirming.</p>
        </div>
      </div>
    ),
  },

  // ── Insights ─────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    category: 'Insights',
    title: 'Dashboard Guide',
    icon: '📊',
    summary: 'All 9 widget sections explained',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Dashboard gives you a real-time overview of your entire client portfolio. Nine
          widget sections cover everything from high-level stats to individual client health scores.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Widget sections</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Stats bar</span> — total clients, active, on-hold, completed, and overdue tasks at a glance.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Client health</span> — health scores for each active client based on task completion and communication recency.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Tasks overview</span> — tasks due today, this week, and overdue across all clients.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Priority breakdown</span> — how many clients sit at each priority level.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Team workload</span> — tasks assigned per team member.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Activity feed</span> — chronological feed of recent actions across all clients.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Onboarding trend</span> — chart of clients started vs. completed over time.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Renewals</span> — upcoming contract renewals within your configured alert window.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Recent clients</span> — the most recently added or modified clients.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Click any client in the health or recent clients widget to jump straight to their detail panel.</li>
            <li>A red health score means a client has overdue tasks or hasn't had a communication logged recently.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'reports',
    category: 'Insights',
    title: 'Reports & Analytics',
    icon: '📈',
    summary: 'Velocity, completion trends, team performance, and PDF export',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Reports view digs deeper into your data with charts you can filter by time range and
          export as a PDF to share with stakeholders.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Available reports</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Onboarding velocity</span> — average days to complete onboarding per client.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Completion trend</span> — tasks completed per day over the last 7, 30, or 90 days.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Team performance</span> — tasks completed and on-time rate per team member.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Exporting</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Click <span className="font-medium text-gray-900 dark:text-white">Export PDF</span> in the top-right of the Reports view. The PDF includes all
            visible charts and a summary table. Use the time-range selector first to scope the data.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Use the 90-day trend to spot slowdowns in your onboarding process.</li>
            <li>Share the PDF in weekly team syncs to celebrate completions and flag bottlenecks.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Three New Widgets</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Task Bottleneck Heatmap</span> — shows the slowest tasks by average days from creation to completion, color-coded green/amber/red. Helps identify recurring delays.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Onboarding Velocity Trend</span> — bar chart of average days to complete onboarding, grouped by month. Spot whether your team is getting faster or slower over time.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Phase Duration Breakdown</span> — average days spent in each onboarding phase across all clients. Identifies which phases consistently take the longest.</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Add them via the <strong>+ Add Widget</strong> button in any report dashboard.</p>
        </div>
      </div>
    ),
  },

  // ── Intelligence & AI ────────────────────────────────────────────────────
  {
    id: 'ai-status-report',
    category: 'Intelligence & AI',
    title: 'AI Status Reports',
    icon: '📄',
    summary: 'Generate client-ready status reports in one click',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The AI Status Report generator creates a structured update for any client — covering progress, blockers, and next steps — in seconds. Open a client, click <strong>Status Report</strong> in the header, and the AI drafts a report using live client data.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What's in a report</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Executive Summary</span> — one-paragraph health snapshot</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Progress This Week</span> — recently completed tasks and milestones</li>
            <li><span className="font-medium text-gray-900 dark:text-white">What's Next</span> — the next 3 pending actions</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Blockers</span> — overdue or blocked items that need attention</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Sending the report</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Click <strong>Copy to Clipboard</strong> to paste into any email or message.</li>
            <li>Click <strong>Send via Email</strong> to open the Email Composer pre-filled with the report.</li>
            <li>Embark saves the last 5 reports per client — view them in the Recent Reports section.</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Requires an AI provider (Anthropic or Ollama) configured in Settings → AI.</p>
      </div>
    ),
  },
  {
    id: 'ai-meeting-brief',
    category: 'Intelligence & AI',
    title: 'AI Meeting Brief',
    icon: '📞',
    summary: 'Get a pre-call intelligence brief before every client meeting',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Meeting Brief generates a structured one-pager before any client call — so you walk in fully prepared without digging through notes. Click <strong>Meeting Brief</strong> in the client header and the brief generates automatically.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What's included</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Client Status Snapshot</span> — health score, phase, % complete, lifecycle stage</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Recent Communications</span> — last 3 log entries with dates</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Open Action Items</span> — overdue and blocked tasks</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Talking Points</span> — AI-suggested discussion topics based on what's stalled</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Suggested Agenda</span> — a ready-to-use 30-minute meeting agenda</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Click <strong>Copy to Clipboard</strong> to paste into Zoom chat or a calendar invite.</li>
            <li>Click <strong>Regenerate</strong> if you want a fresh take with different talking points.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-plan-generator',
    category: 'Intelligence & AI',
    title: 'AI Onboarding Plan Generator',
    icon: '✨',
    summary: 'Generate a full onboarding plan from a prompt',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Instead of picking a template, you can ask the AI to generate a tailored onboarding plan for a new client. It creates phases, tasks, owners, and estimated durations based on the client's industry and complexity.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How to use it</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Click <strong>+ New Client</strong> and proceed to the Template step.</li>
            <li>Click <strong>Generate with AI</strong> instead of choosing a template.</li>
            <li>Select industry, describe the product/services being onboarded, and set complexity.</li>
            <li>Click <strong>Generate Plan</strong> — preview the phases and tasks.</li>
            <li>Click <strong>Accept Plan</strong> to apply it to the new client, or <strong>Regenerate</strong> for another version.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What gets generated</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Phases with names, colors, and descriptions</li>
            <li>Tasks with titles, owner types (internal/client), priority levels, and relative due dates</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'churn-engagement',
    category: 'Intelligence & AI',
    title: 'Engagement Score & Churn Risk',
    icon: '📈',
    summary: 'Spot disengaged clients before they churn',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Embark tracks two predictive signals alongside the Health Score: an <strong>Engagement Score</strong> measuring how actively a client is participating, and a <strong>Churn Risk</strong> classification based on health trend.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Engagement Score (0–100)</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Portal recency</span> — when did the client last visit their portal? (30 pts)</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Client task completion</span> — how many of their assigned tasks are done? (25 pts)</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Communication recency</span> — how recent and frequent are interactions? (25 pts)</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Task responsiveness</span> — how quickly do they complete tasks? (20 pts)</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Churn Risk</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-emerald-600">Stable ✓</span> — health trend is flat or improving</li>
            <li><span className="font-medium text-yellow-600">Declining ⚠</span> — health has dropped 5–15 points/week</li>
            <li><span className="font-medium text-red-600">High Risk 🔴</span> — health below 40 or dropping &gt;15 pts/week</li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Churn Watch on the Dashboard lists all declining/high-risk clients sorted by current score.</p>
        </div>
      </div>
    ),
  },

  // ── Client Experience ─────────────────────────────────────────────────────
  {
    id: 'portal-branding',
    category: 'Client Experience',
    title: 'White-Label Portal Branding',
    icon: '🎨',
    summary: 'Brand the client portal with your company logo and colors',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Replace Embark branding with your own in every client portal. Clients see your logo, your colors, and your company name — not Embark's.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How to set it up</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Open <strong>Settings</strong> (gear icon, top right).</li>
            <li>Click the <strong>Branding</strong> tab.</li>
            <li>Upload your logo, enter your company name and tagline, and pick your accent color.</li>
            <li>The live preview updates in real time — what you see is what clients see.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What gets branded</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Portal header gradient and logo</li>
            <li>Company name and tagline in the portal header</li>
            <li>Action buttons, progress bars, and the circular progress ring</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'embedded-media',
    category: 'Client Experience',
    title: 'Embedded Media in Tasks',
    icon: '🎬',
    summary: 'Attach Loom videos, Calendly links, and more to portal tasks',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Any task can have an embedded media attachment — a Loom walkthrough, a YouTube tutorial, a Calendly booking link, or a Typeform survey. Clients see the embed inline in their portal without leaving the page.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Adding media to a task</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Open a client and click to edit any checklist task.</li>
            <li>Paste a URL into the <strong>Attach media URL</strong> field.</li>
            <li>Embark auto-detects the type (Loom / YouTube / Calendly / Typeform / iframe).</li>
            <li>Save the task — the embed is stored and shown in the portal.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Supported types</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>📹 <span className="font-medium text-gray-900 dark:text-white">Loom</span> — loom.com/share/... links auto-convert to embed URLs</li>
            <li>▶️ <span className="font-medium text-gray-900 dark:text-white">YouTube</span> — watch?v= and youtu.be links auto-convert</li>
            <li>📅 <span className="font-medium text-gray-900 dark:text-white">Calendly</span> — booking link embedded directly; note to complete after booking</li>
            <li>📝 <span className="font-medium text-gray-900 dark:text-white">Typeform</span> — form embedded inline</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'approval-tasks',
    category: 'Client Experience',
    title: 'Approval / Sign-Off Tasks',
    icon: '✍️',
    summary: 'Require client approval before a task is marked complete',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Some tasks need explicit client sign-off before they're done — SOW review, deliverable acceptance, or go-live confirmation. Mark any task as requiring approval and clients see a dedicated Approve / Request Changes UI in their portal.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Setting up an approval task</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Edit any checklist task.</li>
            <li>Check <strong>Requires Approval</strong>.</li>
            <li>Save. The task now shows a yellow "⏳ Awaiting Approval" badge.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Client experience</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Client sees an amber approval card with <strong>Approve</strong> and <strong>Request Changes</strong> buttons.</li>
            <li>Approving marks the task complete and records who approved it and when.</li>
            <li>Requesting changes shows a text field for the rejection note.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Finding pending approvals</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Focus Mode shows a <strong>Pending Approvals</strong> card at the top with all tasks awaiting client sign-off, grouped by client.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'nps-survey',
    category: 'Client Experience',
    title: 'NPS / CSAT Surveys',
    icon: '⭐',
    summary: 'Collect Net Promoter Scores from clients with a shareable link',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Send clients a simple NPS survey at any point in their journey. Scores are stored in the client record and feed into the NPS Overview widget on the dashboard.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Sending a survey</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Open a client detail view.</li>
            <li>Click <strong>Request NPS Survey</strong> — the survey URL is copied to your clipboard.</li>
            <li>Paste the link into an email to your client.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Client experience</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>A clean, branded page with a 0–10 scale and optional comment field.</li>
            <li>No login required — the link works for anyone.</li>
            <li>After submitting, the client sees a thank-you message.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Score classification</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-emerald-600">Promoter</span> — 9–10</li>
            <li><span className="font-medium text-yellow-600">Passive</span> — 7–8</li>
            <li><span className="font-medium text-red-600">Detractor</span> — 0–6</li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">The NPS Overview dashboard widget appears once 3+ clients have responded.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'success-plan',
    category: 'Client Experience',
    title: 'Post-Onboarding Success Plan',
    icon: '🏆',
    summary: 'Keep driving value after go-live with structured success tracks',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          When a client graduates from onboarding, a Success Plan continues the engagement with structured Adoption, QBR, Expansion, and Renewal Prep tracks. Don't let the relationship go quiet after go-live.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Creating a Success Plan</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Graduate a client (complete all tasks → Graduation button).</li>
            <li>When prompted, choose <strong>90-Day Success Plan</strong> or <strong>Annual Account Plan</strong>.</li>
            <li>The plan is pre-populated with milestone tasks — customize as needed.</li>
            <li>Access the plan at any time from the client detail view (active-client lifecycle stage).</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tracks</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>🚀 <span className="font-medium text-gray-900 dark:text-white">Adoption Milestones</span> — feature adoption and training goals</li>
            <li>📅 <span className="font-medium text-gray-900 dark:text-white">QBR Schedule</span> — 30/60/90-day and quarterly business reviews</li>
            <li>💰 <span className="font-medium text-gray-900 dark:text-white">Expansion Targets</span> — upsell and cross-sell opportunities</li>
            <li>🔄 <span className="font-medium text-gray-900 dark:text-white">Renewal Prep</span> — NPS collection and renewal discussion</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">KPIs</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Track Adoption %, MRR Expansion, QBR completion, and NPS target — all editable inline from the Success Plan panel.</p>
        </div>
      </div>
    ),
  },

  // ── Workflows ─────────────────────────────────────────────────────────────
  {
    id: 'smart-segments',
    category: 'Workflows',
    title: 'Smart Segments & Filter Builder',
    icon: '🔍',
    summary: 'Build compound filters and save them as reusable segments',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Filter Builder lets you combine multiple conditions with AND/OR logic to create dynamic client segments. Save a filter as a segment and reuse it instantly.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Using the filter builder</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to the Clients view and click the <strong>Filter</strong> button in the toolbar.</li>
            <li>Click <strong>+ Add condition</strong> and choose a field, operator, and value.</li>
            <li>Toggle between <strong>AND</strong> (all conditions must match) and <strong>OR</strong> (any condition matches).</li>
            <li>Click <strong>Save as Segment</strong> to name and store the filter for reuse.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Filterable fields</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Health score, status, priority, lifecycle stage</li>
            <li>Days since last contact, go-live proximity, MRR</li>
            <li>Assigned to, tags</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Quick segments</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">At Risk Renewals</span> — health &lt; 60 and renewal within 90 days</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Stalled Onboardings</span> — no contact in 14+ days and status active</li>
            <li><span className="font-medium text-gray-900 dark:text-white">High Value, Low Health</span> — MRR &gt; $1,000 and health &lt; 60</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'capacity-planning',
    category: 'Workflows',
    title: 'Team Capacity Planning',
    icon: '⚖️',
    summary: 'See who has bandwidth to take the next client',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Capacity view shows per-member workload across active clients and open tasks so you can make smart assignment decisions without guessing.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Opening Capacity view</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to <strong>Team</strong> in the sidebar.</li>
            <li>Click the <strong>Capacity</strong> tab.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Reading the capacity bars</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-emerald-600">Green</span> — under 70% capacity — plenty of headroom</li>
            <li><span className="font-medium text-yellow-600">Yellow</span> — 70–90% — getting busy</li>
            <li><span className="font-medium text-red-600">Red</span> — over 90% — at or above limit</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Recommended assignee</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">The member with the most headroom gets a green <strong>Recommended</strong> badge. Use this when adding a new client to pick the best person automatically.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Setting capacity limits</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Click the capacity limit input on any member card to set their max (default 5 clients). Press Enter to save.</p>
        </div>
      </div>
    ),
  },

  // ── Team & More ───────────────────────────────────────────────────────────
  {
    id: 'team',
    category: 'Team & More',
    title: 'Team Management',
    icon: '🏢',
    summary: 'Add members, roles, client assignments, and assignment roles',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Team view lets you manage who has access to Embark and who is responsible for which
          clients. Assign multiple team members to each client with customizable assignment roles.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Adding team members</h3>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
            <li>Go to <span className="font-medium text-gray-900 dark:text-white">Team</span> in the sidebar.</li>
            <li>Click <span className="font-medium text-gray-900 dark:text-white">+ Add Member</span> and enter their name and email.</li>
            <li>Assign an app role: <span className="font-medium text-gray-900 dark:text-white">Owner, Admin, Member, or Viewer</span>.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">App roles</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Owner</span> — full access including billing and settings.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Admin</span> — manage clients, team, and automations.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Member</span> — manage their assigned clients and tasks.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Viewer</span> — read-only access.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Assigning members to clients</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Open a client and go to the <span className="font-medium text-gray-900 dark:text-white">Team</span> tab. Click <span className="font-medium text-gray-900 dark:text-white">+ Assign</span>, select a
            team member, and give them an assignment role like "Delivery Lead", "Account Manager",
            or "TAM". One client can have multiple assignees with different roles.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Filter the client list by assignee to see any team member's workload at a glance.</li>
            <li>The Dashboard workload widget uses client assignments to calculate per-person task load.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'notifications',
    category: 'Team & More',
    title: 'Notifications & Alerts',
    icon: '🔔',
    summary: 'Notification types, preferences, renewal alerts, sound & badge',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Embark sends in-app notifications for important events. The notification bell in the
          header shows unread counts. You control exactly which events trigger alerts.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notification types</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Task due</span> — a task is due today or overdue.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Task assigned</span> — a task was assigned to you.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Automation triggered</span> — an automation ran against a client.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Contract renewal</span> — a client's contract is approaching renewal.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Client status change</span> — a client moved to a new status.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Contract renewal alerts</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Go to <span className="font-medium text-gray-900 dark:text-white">Settings → Notifications</span> to configure renewal thresholds. Enable any
            combination of 90, 60, 30, 14, and 7 day alerts. Each alert fires once per client
            per threshold — no duplicates on page reload.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Preferences</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Open the <span className="font-medium text-gray-900 dark:text-white">Notifications</span> panel (bell icon) and click the gear icon to toggle
            individual notification types, sound effects, and badge counts on or off.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Turn off sound if you find it distracting — the badge count still keeps you informed.</li>
            <li>Mark all as read with one click to clear the unread count without opening each notification.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'gamification',
    category: 'Team & More',
    title: 'Gamification & Hall of Heroes',
    icon: '🏆',
    summary: 'XP, levels, character classes, deeds, streaks, and leaderboard',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Embark turns your work into an adventure. Complete tasks to earn XP, level up, unlock
          character classes, and compete on the Hall of Heroes leaderboard.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How XP works</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Completing tasks earns XP — higher-priority tasks give more XP.</li>
            <li>Onboarding a client (all tasks complete) gives a bonus XP reward.</li>
            <li>Daily streaks multiply your XP — the longer your streak, the bigger the bonus.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Character classes</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Paladin</span> — unlocked for high task completion rates.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Wizard</span> — unlocked for heavy AI usage.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Ranger</span> — unlocked for using automations extensively.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Rogue</span> — unlocked for speed — completing tasks well before their due date.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Deeds & leaderboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Deeds are achievement badges awarded for milestones like "First Client Onboarded" or
            "10-Day Streak." The Hall of Heroes leaderboard ranks all team members by XP earned
            this month.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Check the Hall of Heroes to see which deeds you're close to unlocking.</li>
            <li>Maintain your daily streak by completing at least one task every day.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'settings',
    category: 'Team & More',
    title: 'Settings & Preferences',
    icon: '⚙️',
    summary: 'Theme, dark mode, AI config, import/export, undo/redo',
    content: (
      <div className="space-y-5">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Settings live in the gear icon in the top-right header. Customize your workspace,
          configure AI, and manage your data all in one place.
        </p>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Appearance</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Dark mode</span> — toggle between light and dark themes.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Color theme</span> — choose an accent color for the UI.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI configuration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Set your AI provider (Anthropic or Ollama), API key, and default model. Changes take
            effect immediately in the AI view.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Import & Export</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li><span className="font-medium text-gray-900 dark:text-white">Export all data</span> — downloads a complete JSON backup of every client, task, template, and setting.</li>
            <li><span className="font-medium text-gray-900 dark:text-white">Import data</span> — restore from a previously exported JSON file.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Undo & Redo</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Use <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Ctrl+Z</kbd> to undo the last action and{' '}
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Ctrl+Shift+Z</kbd> (or{' '}
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Ctrl+Y</kbd>) to redo.
            Most data changes are undoable including task completion, status changes, and edits.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
            <li>Export your data regularly as a backup — Embark stores everything in your browser's localStorage.</li>
            <li>Use import/export to transfer your data to a different browser or device.</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export function HowToModal({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(articles[0].id);

  const selected = articles.find((a) => a.id === selectedId) ?? articles[0];
  const categories = [...new Set(articles.map((a) => a.category))];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 transition-all ${
          isCollapsed ? 'justify-center' : ''
        }`}
        title={isCollapsed ? 'How To' : undefined}
      >
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        {!isCollapsed && <span className="font-medium text-sm">How To</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative border-2 border-zinc-900 dark:border-white shadow-[8px_8px_0_0_#18181b] dark:shadow-[8px_8px_0_0_rgba(255,255,255,0.15)] rounded-[4px] bg-white dark:bg-zinc-900 max-w-4xl w-full max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b-2 border-zinc-900 dark:border-zinc-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-400 border-2 border-zinc-900 rounded-[4px]">
                    <svg className="w-5 h-5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-zinc-900 dark:text-white">How To Guide</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Learn how to use every feature</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-zinc-900 dark:hover:text-white border-2 border-zinc-900 dark:border-zinc-700 shadow-[2px_2px_0_0_#18181b] dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] rounded-[4px] hover:bg-yellow-400 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body: two-panel */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left nav */}
                <nav className="w-56 shrink-0 overflow-y-auto bg-zinc-50 dark:bg-zinc-800/60 border-r-2 border-zinc-900 dark:border-zinc-700 p-3 space-y-4">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-display font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 mb-1">
                        {cat}
                      </p>
                      {articles
                        .filter((a) => a.category === cat)
                        .map((article) => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedId(article.id)}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-sm transition-all ${
                              selectedId === article.id
                                ? 'bg-yellow-400 text-zinc-900 font-bold border-l-4 border-zinc-900'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <span className="shrink-0">{article.icon}</span>
                            <span className="truncate">{article.title}</span>
                          </button>
                        ))}
                    </div>
                  ))}
                </nav>

                {/* Right content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{selected.icon}</span>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.title}</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selected.summary}</p>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    {selected.content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
