import { useMemo, useState } from 'react';
import { useClientContext } from '../../context/ClientContext';
import { computeHealthScore } from '../../utils/healthScore';
import { useSLAStatuses } from '../../hooks/useSLA';
import { HealthScoreBadge } from '../Clients/HealthScoreBadge';
import type { Client } from '../../types';

type RenewalStage = 'upcoming' | 'at-risk' | 'negotiating' | 'renewed' | 'churned';

interface RenewalClient {
  client: Client;
  daysToRenewal: number;
  renewalStage: RenewalStage;
  healthScore: number;
  mrr: number;
}

const COLUMNS: { id: RenewalStage; label: string; color: string; headerColor: string }[] = [
  { id: 'upcoming',    label: 'Upcoming (90d)',   color: 'border-blue-400',    headerColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-400' },
  { id: 'at-risk',     label: 'At Risk',          color: 'border-red-400',     headerColor: 'bg-red-50 dark:bg-red-950/30 border-red-400' },
  { id: 'negotiating', label: 'In Negotiation',   color: 'border-amber-400',   headerColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-400' },
  { id: 'renewed',     label: 'Renewed',          color: 'border-emerald-400', headerColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400' },
  { id: 'churned',     label: 'Churned',          color: 'border-zinc-400',    headerColor: 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-400' },
];

function formatMrr(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

function daysLabel(days: number): { text: string; className: string } {
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, className: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' };
  if (days <= 7)  return { text: `${days}d left`, className: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' };
  if (days <= 30) return { text: `${days}d left`, className: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' };
  return { text: `${days}d left`, className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' };
}

function RenewalCard({ rc, onMove }: { rc: RenewalClient; onMove: (clientId: string, stage: RenewalStage) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dayInfo = daysLabel(rc.daysToRenewal);

  return (
    <div className="glass-card p-4 cursor-default hover:shadow-[3px_3px_0_0_#18181b] dark:hover:shadow-[3px_3px_0_0_#ffffff] transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {rc.client.name}
        </h4>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            title="Move to stage"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white shadow-[3px_3px_0_0_#18181b] dark:shadow-[3px_3px_0_0_#ffffff] rounded-[4px] py-1 text-sm"
              onBlur={() => setMenuOpen(false)}
            >
              {COLUMNS.filter(c => c.id !== rc.renewalStage).map(col => (
                <button
                  key={col.id}
                  onClick={() => { onMove(rc.client.id, col.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  → {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <HealthScoreBadge score={rc.healthScore} />
        {rc.mrr > 0 && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            {formatMrr(rc.mrr)}/mo
          </span>
        )}
        {rc.daysToRenewal !== Infinity && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dayInfo.className}`}>
            {dayInfo.text}
          </span>
        )}
      </div>

      {rc.client.account?.renewalDate && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Renews {new Date(rc.client.account.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

// Persist manual stage overrides in localStorage
function useRenewalStages() {
  const KEY = 'embark-renewal-stages';
  const [overrides, setOverrides] = useState<Record<string, RenewalStage>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
  });

  const moveClient = (clientId: string, stage: RenewalStage) => {
    setOverrides(prev => {
      const next = { ...prev, [clientId]: stage };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return { overrides, moveClient };
}

export function RenewalPipelineView() {
  const { clients } = useClientContext();
  const slaStatuses = useSLAStatuses(clients);
  const { overrides, moveClient } = useRenewalStages();

  const renewalClients = useMemo((): RenewalClient[] => {
    const now = Date.now();
    const results: RenewalClient[] = [];

    for (const client of clients) {
      if (client.archived) continue;

      const renewalDate = client.account?.renewalDate;
      const mrr = client.account?.mrr ?? 0;
      const healthScore = computeHealthScore(client, slaStatuses).total;

      // Include clients with a renewal date, OR manually moved to a renewal stage
      const hasManualOverride = !!overrides[client.id];
      if (!renewalDate && !hasManualOverride) continue;

      let daysToRenewal = Infinity;
      if (renewalDate) {
        daysToRenewal = Math.ceil((new Date(renewalDate).getTime() - now) / 86_400_000);
      }

      // Default stage based on renewal date + health
      let defaultStage: RenewalStage;
      if (client.lifecycleStage === 'churned') {
        defaultStage = 'churned';
      } else if (daysToRenewal <= 90 && daysToRenewal >= 0) {
        defaultStage = healthScore < 50 ? 'at-risk' : 'upcoming';
      } else if (daysToRenewal < 0) {
        defaultStage = healthScore < 40 ? 'churned' : 'renewed';
      } else {
        // >90 days — only show if manually placed
        if (!hasManualOverride) continue;
        defaultStage = 'upcoming';
      }

      results.push({
        client,
        daysToRenewal,
        renewalStage: overrides[client.id] ?? defaultStage,
        healthScore,
        mrr,
      });
    }

    return results;
  }, [clients, slaStatuses, overrides]);

  const byStage = useMemo(() => {
    const map: Record<RenewalStage, RenewalClient[]> = {
      upcoming: [], 'at-risk': [], negotiating: [], renewed: [], churned: [],
    };
    for (const rc of renewalClients) {
      map[rc.renewalStage].push(rc);
    }
    // Sort each column by health score ascending (most at-risk first)
    for (const stage of Object.keys(map) as RenewalStage[]) {
      map[stage].sort((a, b) => a.healthScore - b.healthScore);
    }
    return map;
  }, [renewalClients]);

  const totalMrr = useMemo(() =>
    renewalClients.reduce((sum, rc) => sum + rc.mrr, 0),
  [renewalClients]);

  const atRiskMrr = useMemo(() =>
    byStage['at-risk'].reduce((sum, rc) => sum + rc.mrr, 0),
  [byStage]);

  if (renewalClients.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 font-display">Renewal Pipeline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track and manage client renewals</p>
        </div>
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">🔄</div>
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No renewals tracked yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Add a <strong>Renewal Date</strong> to a client's account info to see it appear here. Clients renewing within 90 days will surface automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 font-display">Renewal Pipeline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {renewalClients.length} client{renewalClients.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        {/* Revenue summary */}
        <div className="flex items-center gap-4">
          {totalMrr > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-bold">Total MRR at Stake</p>
              <p className="text-xl font-black text-gray-900 dark:text-gray-100">{formatMrr(totalMrr)}</p>
            </div>
          )}
          {atRiskMrr > 0 && (
            <div className="text-right">
              <p className="text-xs text-red-400 uppercase tracking-wide font-bold">At Risk MRR</p>
              <p className="text-xl font-black text-red-600 dark:text-red-400">{formatMrr(atRiskMrr)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {COLUMNS.map(col => {
          const cards = byStage[col.id];
          const colMrr = cards.reduce((sum, rc) => sum + rc.mrr, 0);

          return (
            <div key={col.id} className={`flex-shrink-0 w-72 flex flex-col rounded-[6px] border-2 ${col.color} overflow-hidden`}>
              {/* Column header */}
              <div className={`px-4 py-3 border-b-2 ${col.headerColor} ${col.color.replace('border-', 'border-b-')}`}>
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-gray-900 dark:text-gray-100">{col.label}</span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-black/30 px-2 py-0.5 rounded-full">
                    {cards.length}
                  </span>
                </div>
                {colMrr > 0 && (
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatMrr(colMrr)}/mo
                  </p>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-3 bg-gray-50/50 dark:bg-zinc-900/30">
                {cards.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-6 italic">No clients</p>
                ) : (
                  cards.map(rc => (
                    <RenewalCard key={rc.client.id} rc={rc} onMove={moveClient} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
