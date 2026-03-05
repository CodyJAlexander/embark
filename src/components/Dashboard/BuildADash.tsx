import type { DashboardWidgetId } from '../../types';
import { DEFAULT_DASHBOARD_WIDGETS } from '../../types';

interface WidgetMeta {
  id: DashboardWidgetId;
  label: string;
  icon: string;
  description: string;
}

const WIDGETS: WidgetMeta[] = [
  { id: 'stats-bar',         label: 'Stats Bar',       icon: '📊', description: 'Total clients, active, overdue count' },
  { id: 'client-health',     label: 'Client Health',   icon: '🩺', description: 'Health score grid for active clients' },
  { id: 'tasks-overview',    label: 'Tasks Overview',  icon: '✅', description: 'Tasks due today, this week, overdue' },
  { id: 'priority-breakdown',label: 'Priority',        icon: '🎯', description: 'Client count by priority level' },
  { id: 'team-workload',     label: 'Team Workload',   icon: '👥', description: 'Task load per team member' },
  { id: 'activity-feed',     label: 'Activity Feed',   icon: '📋', description: 'Recent actions across all clients' },
  { id: 'onboarding-trend',  label: 'Trend Chart',     icon: '📈', description: 'Clients started vs. completed' },
  { id: 'renewals',          label: 'Renewals',        icon: '🔔', description: 'Upcoming contract renewals' },
  { id: 'recent-clients',    label: 'Recent Clients',  icon: '🕐', description: 'Recently added or modified clients' },
  { id: 'sla-status',        label: 'SLA Status',      icon: '⏱️', description: 'On-track / warning / breached SLAs' },
  { id: 'crm-panel',         label: 'CRM Panel',       icon: '💰', description: 'MRR total, stage funnel' },
  { id: 'blocked-tasks',     label: 'Blocked Tasks',   icon: '🔒', description: 'Tasks blocked by dependencies' },
  { id: 'go-live-dates',     label: 'Go-Live Dates',   icon: '🚀', description: 'Clients with upcoming go-live dates' },
  { id: 'ai-portfolio-brief', label: 'AI Portfolio Brief', icon: '🧠', description: 'AI-powered at-risk client analysis' },
  { id: 'time-report',       label: 'Time Report',     icon: '⏱',  description: 'Hours per client, profitability ranking' },
  { id: 'health-trends',     label: 'Health Trends',   icon: '📉', description: 'Most improved and steepest declining clients' },
];

interface BuildADashProps {
  selected: DashboardWidgetId[];
  onChange: (widgets: DashboardWidgetId[]) => void;
  /** When true, renders without modal chrome (for wizard step) */
  inline?: boolean;
  onClose?: () => void;
}

function WidgetGrid({ selected, onChange }: { selected: DashboardWidgetId[]; onChange: (w: DashboardWidgetId[]) => void }) {
  const toggle = (id: DashboardWidgetId) => {
    if (selected.includes(id)) {
      onChange(selected.filter(w => w !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">{selected.length} of {WIDGETS.length} selected</span>
        <button
          onClick={() => onChange([...DEFAULT_DASHBOARD_WIDGETS])}
          className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          ★ Recommended
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {WIDGETS.map(w => {
          const active = selected.includes(w.id);
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              className={`relative text-left p-3 rounded-[4px] border-2 transition-all ${
                active
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'
              }`}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 text-yellow-400 text-xs font-black">✓</span>
              )}
              <div className="text-xl mb-1">{w.icon}</div>
              <p className="text-xs font-bold text-white leading-tight">{w.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{w.description}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function BuildADash({ selected, onChange, inline, onClose }: BuildADashProps) {
  if (inline) {
    return <WidgetGrid selected={selected} onChange={onChange} />;
  }

  // Modal mode
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[6px_6px_0_0_#18181b]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-zinc-700">
          <div>
            <h2 className="text-lg font-black text-white">Customize Dashboard</h2>
            <p className="text-sm text-zinc-400">Click widgets to toggle them on or off.</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <WidgetGrid selected={selected} onChange={onChange} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t-2 border-zinc-700">
          <button
            onClick={onClose}
            className="bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-bold px-5 py-2 rounded-[4px] border-2 border-zinc-900 shadow-[2px_2px_0_0_#18181b] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
