import type { Client, LifecycleStage } from '../../types';
import { formatDate } from '../../utils/helpers';
import { getClientHealth, HEALTH_COLORS } from '../../utils/clientHealth';
import { computeHealthScore } from '../../utils/healthScore';
import { computeNextAction } from '../../utils/nextAction';
import { computeGoLiveForecast } from '../../utils/goLiveForecast';
import { useSLAStatuses } from '../../hooks/useSLA';
import { HealthScoreBadge } from './HealthScoreBadge';
import { HealthSparkline } from './HealthSparkline';
import { NextActionBanner } from './NextActionBanner';
import type { HealthSnapshot } from '../../hooks/useHealthHistory';
import { computeChurnRisk } from '../../hooks/useChurnRisk';

const STAGE_COLORS: Record<LifecycleStage, string> = {
  'onboarding':    'bg-blue-100 text-blue-700 border-blue-300',
  'active-client': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'at-risk':       'bg-red-100 text-red-700 border-red-300',
  'churned':       'bg-zinc-100 text-zinc-500 border-zinc-300',
};

const STAGE_LABELS: Record<LifecycleStage, string> = {
  'onboarding':    'Onboarding',
  'active-client': 'Active Client',
  'at-risk':       'At Risk',
  'churned':       'Churned',
};

interface ClientCardProps {
  client: Client;
  onSelect: (client: Client) => void;
  isSelected?: boolean;
  onToggleSelect?: (clientId: string) => void;
  selectionMode?: boolean;
  sparklineSnapshots?: HealthSnapshot[];
  sparklineTrend?: 'up' | 'down' | 'stable';
  sparklineDelta?: number;
  onContextMenu?: (e: React.MouseEvent, client: Client) => void;
}

const statusColors = {
  active: 'bg-green-600 text-white border-2 border-zinc-900',
  completed: 'bg-blue-600 text-white border-2 border-zinc-900',
  'on-hold': 'bg-orange-600 text-white border-2 border-zinc-900',
};

const CARD_PALETTE = [
  '#fef9c3', // yellow-100
  '#fce7f3', // pink-100
  '#ede9fe', // violet-100
  '#dcfce7', // green-100
  '#dbeafe', // blue-100
  '#ffedd5', // orange-100
];

const CARD_PALETTE_DARK = [
  '#3f3000', // amber-tinted dark
  '#2d0c2d', // pink-tinted dark
  '#1e1245', // violet-tinted dark
  '#052e16', // green-tinted dark
  '#0c1d3d', // blue-tinted dark
  '#431407', // orange-tinted dark
];

function getCardBg(id: string): { light: string; dark: string } {
  const hash = Array.from(id).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = hash % CARD_PALETTE.length;
  return { light: CARD_PALETTE[idx], dark: CARD_PALETTE_DARK[idx] };
}

function goLiveChip(date: string): { label: string; className: string } | null {
  const daysLeft = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 30) return null;
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}d overdue`, className: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' };
  if (daysLeft < 7) return { label: `${daysLeft}d to go-live`, className: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' };
  if (daysLeft < 14) return { label: `${daysLeft}d to go-live`, className: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400' };
  return { label: `${daysLeft}d to go-live`, className: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' };
}

function forecastChip(client: Client): { label: string; className: string } | null {
  const forecast = computeGoLiveForecast(client);

  // Only show if we have a real prediction
  if (!forecast.predictedDate || forecast.daysFromToday === null) return null;

  // If there's no target date, just show the predicted date
  if (!client.targetGoLiveDate) {
    const d = new Date(forecast.predictedDate);
    const label = `At pace: ~${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return { label, className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' };
  }

  // With a target date: only show if the deviation is meaningful (>1 day difference)
  if (forecast.daysVsTarget === null || Math.abs(forecast.daysVsTarget) <= 1) return null;

  if (forecast.status === 'on-track') {
    const d = new Date(forecast.predictedDate);
    const label = `At pace: ~${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return { label, className: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' };
  }

  if (forecast.status === 'at-risk') {
    return {
      label: `Predicted: ${forecast.daysVsTarget}d late`,
      className: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400',
    };
  }

  // 'late'
  return {
    label: `Predicted: ${forecast.daysVsTarget}d late`,
    className: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  };
}

export function ClientCard({ client, onSelect, isSelected, onToggleSelect, selectionMode, sparklineSnapshots, sparklineTrend, sparklineDelta, onContextMenu }: ClientCardProps) {
  const completedTasks = client.checklist.filter((item) => item.completed).length;
  const totalTasks = client.checklist.length;
  const health = getClientHealth(client);
  const chip = client.targetGoLiveDate ? goLiveChip(client.targetGoLiveDate) : null;
  const fchip = forecastChip(client);
  const slaStatuses = useSLAStatuses([client]);
  const healthScore = computeHealthScore(client, slaStatuses);
  const nextAction = computeNextAction(client, slaStatuses);

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(client.id);
    } else {
      onSelect(client);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(client.id);
  };

  const cardBg = getCardBg(client.id);
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div
      onClick={handleClick}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, client) : undefined}
      className={`glass-card p-5 cursor-pointer transition-all relative group ${
        isSelected
          ? 'ring-2 ring-yellow-400 ring-offset-0 border-yellow-400'
          : ''
      }`}
      style={{ backgroundColor: isDark ? cardBg.dark : cardBg.light }}
    >
      {/* Health status dot - top-right corner, hidden for on-track clients */}
      {health && health.status !== 'on-track' && (
        <div
          className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full
            ${HEALTH_COLORS[health.status].dot}
            ${health.status === 'stalled' ? 'health-pulse-fast' : 'health-pulse-slow'}
          `}
          title={health.reason}
        />
      )}

      {/* Selection checkbox - shown on hover or when selected */}
      <div
        className={`absolute top-3 left-3 ${selectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={handleCheckboxClick}
      >
        <span
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </div>

      <div className={`flex items-start justify-between mb-3 ${selectionMode || isSelected ? 'pl-7' : ''}`}>
        <div className="min-w-0">
          <h3 className="text-lg font-black font-display text-gray-900 dark:text-gray-100 truncate">
            {client.name}
          </h3>
          {chip && (
            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${chip.className}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {chip.label}
            </span>
          )}
          {fchip && (
            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${fchip.className}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {fchip.label}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`px-2.5 py-0.5 rounded-[4px] text-xs font-bold transition-transform duration-100 hover:scale-105 hover:-rotate-1 ${statusColors[client.status]}`}>
            {client.status}
          </span>
          {client.lifecycleStage && client.lifecycleStage !== 'onboarding' && (
            <span className={`px-2 py-0.5 text-xs font-bold rounded-[4px] border ${STAGE_COLORS[client.lifecycleStage]}`}>
              {STAGE_LABELS[client.lifecycleStage]}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <HealthScoreBadge score={healthScore} />
            {sparklineSnapshots && sparklineTrend && sparklineDelta !== undefined && (
              <HealthSparkline
                snapshots={sparklineSnapshots}
                trend={sparklineTrend}
                delta={sparklineDelta}
              />
            )}
          </div>
          {sparklineSnapshots && (() => {
            const churnRisk = computeChurnRisk(sparklineSnapshots, sparklineSnapshots.length > 0 ? sparklineSnapshots[sparklineSnapshots.length - 1].score : 50);
            if (churnRisk.level === 'stable') return null;
            return (
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-semibold ${churnRisk.color}`}>
                {churnRisk.label}
              </span>
            );
          })()}
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        {/* Show primary contact or legacy email */}
        {(() => {
          const primaryContact = client.contacts?.find((c) => c.isPrimary) || client.contacts?.[0];
          if (primaryContact) {
            return (
              <>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate">
                    {primaryContact.name}
                    {primaryContact.title && <span className="text-gray-400 dark:text-gray-500"> · {primaryContact.title}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{primaryContact.email}</span>
                </div>
              </>
            );
          }
          // Fallback to legacy email
          return (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{client.email}</span>
            </div>
          );
        })()}
        {client.contacts && client.contacts.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>+{client.contacts.length - 1} more contact{client.contacts.length > 2 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t-2 border-zinc-200 dark:border-zinc-600">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {client.services.length} service{client.services.length !== 1 ? 's' : ''}
          </span>
          {totalTasks > 0 && (
            <span className="text-gray-500 dark:text-gray-400">
              {completedTasks}/{totalTasks} tasks
            </span>
          )}
        </div>
        {totalTasks > 0 && (
          <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-600 rounded-none h-2.5 overflow-hidden border border-zinc-900 dark:border-zinc-600">
            <div
              className="bg-yellow-400 h-2.5 progress-bar rounded-none"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        )}
      </div>

      {nextAction && (
        <div className="mt-2">
          <NextActionBanner action={nextAction} />
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Added {formatDate(client.createdAt)}
      </p>
    </div>
  );
}
