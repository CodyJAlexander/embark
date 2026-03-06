import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useClientContext } from '../../context/ClientContext';
import { useNotifications } from '../../hooks/useNotifications';
import { Button } from '../UI/Button';
import { DashboardStatsSkeleton } from '../UI/Skeleton';
import { useHealthHistory } from '../../hooks/useHealthHistory';
import { HealthSparkline } from '../Clients/HealthSparkline';
import { SLAStatusWidget } from '../SLA/SLAStatusWidget';
import { GoLiveWidget } from './GoLiveWidget';
import { BlockedTasksWidget } from './BlockedTasksWidget';
import { AIPortfolioBriefWidget } from './AIPortfolioBriefWidget';
import { TimeReportWidget } from './TimeReportWidget';
import { BuildADash } from './BuildADash';
import { useAuth } from '../../context/AuthContext';
import type { View, Priority, LifecycleStage, Client, DashboardWidgetId } from '../../types';
import { DEFAULT_DASHBOARD_WIDGETS } from '../../types';
import { getClientHealth, HEALTH_COLORS } from '../../utils/clientHealth';
import { computeEngagementScore } from '../../utils/engagementScore';
import { computeGoLiveForecast } from '../../utils/goLiveForecast';
import { computeChurnRisk } from '../../hooks/useChurnRisk';

interface DashboardProps {
  onNavigate: (view: View) => void;
  onOpenDigest?: () => void;
  onSelectClient?: (client: Client) => void;
}

function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      setVal(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

export function Dashboard({ onNavigate, onOpenDigest, onSelectClient }: DashboardProps) {
  const { clients } = useClientContext();
  const { preferences } = useNotifications();
  const { currentUser, updateUser } = useAuth();
  const [buildADashOpen, setBuildADashOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setIsReady(true); }, []);

  const visibleWidgets: DashboardWidgetId[] =
    currentUser?.dashboardConfig?.visibleWidgets ?? DEFAULT_DASHBOARD_WIDGETS;

  const show = (id: DashboardWidgetId) => visibleWidgets.includes(id);

  // Only consider active (non-archived) clients
  const activeClients = useMemo(
    () => clients.filter((c) => !c.archived),
    [clients]
  );

  const needsAttentionClients = useMemo(() =>
    activeClients
      .map(c => ({ client: c, health: getClientHealth(c) }))
      .filter(({ health }) => health && (health.status === 'needs-attention' || health.status === 'stalled'))
      .sort((a, b) => {
        const order = { stalled: 0, 'needs-attention': 1 } as Record<string, number>;
        return (order[a.health!.status] ?? 2) - (order[b.health!.status] ?? 2);
      }),
    [activeClients]
  );

  const engagementLeaderboard = useMemo(() => {
    if (activeClients.length < 4) return null;
    const scored = activeClients.map((c) => ({
      client: c,
      score: computeEngagementScore(c),
    }));
    const sorted = [...scored].sort((a, b) => b.score.total - a.score.total);
    return {
      top: sorted.slice(0, 3).filter((x) => x.score.tier === 'high'),
      bottom: [...scored].sort((a, b) => a.score.total - b.score.total).slice(0, 3).filter((x) => x.score.tier === 'low' || x.score.tier === 'medium'),
    };
  }, [activeClients]);

  const stats = {
    total: activeClients.length,
    active: activeClients.filter((c) => c.status === 'active').length,
    completed: activeClients.filter((c) => c.status === 'completed').length,
    onHold: activeClients.filter((c) => c.status === 'on-hold').length,
  };

  const allTasks = activeClients.flatMap((c) => c.checklist.map((item) => ({ ...item, clientName: c.name, clientId: c.id, priority: c.priority })));
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const overdueTasks = allTasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date(new Date().toDateString());
  });
  const upcomingTasks = allTasks
    .filter((t) => {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date(new Date().toDateString());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return due >= today && due <= weekFromNow;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  // On-Time Forecast: percentage of clients with a target go-live date that are on track
  const onTimeForecastPct = useMemo(() => {
    const clientsWithTarget = activeClients.filter((c) => c.targetGoLiveDate && c.status !== 'completed');
    if (clientsWithTarget.length === 0) return null;
    const onTrackCount = clientsWithTarget.filter((c) => {
      const forecast = computeGoLiveForecast(c);
      return forecast.status === 'on-track';
    }).length;
    return Math.round((onTrackCount / clientsWithTarget.length) * 100);
  }, [activeClients]);

  const recentClients = [...activeClients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Priority distribution
  const priorityStats = useMemo(() => {
    const counts: Record<Priority, number> = { high: 0, medium: 0, low: 0, none: 0 };
    activeClients.forEach((c) => {
      counts[c.priority]++;
    });
    return counts;
  }, [activeClients]);

  // Team workload
  const teamWorkload = useMemo(() => {
    const workload: Record<string, { total: number; completed: number; overdue: number }> = {};
    activeClients.forEach((client) => {
      if (!workload[client.assignedTo]) {
        workload[client.assignedTo] = { total: 0, completed: 0, overdue: 0 };
      }
      client.checklist.forEach((task) => {
        workload[client.assignedTo].total++;
        if (task.completed) {
          workload[client.assignedTo].completed++;
        } else if (task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString())) {
          workload[client.assignedTo].overdue++;
        }
      });
    });
    return Object.entries(workload).sort((a, b) => b[1].total - a[1].total);
  }, [activeClients]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities = activeClients.flatMap((client) =>
      (client.activityLog || []).map((log) => ({
        ...log,
        clientName: client.name,
        clientId: client.id,
      }))
    );
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [activeClients]);

  // Task completion trend (last 7 days)
  const completionTrend = useMemo(() => {
    const days = 7;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const trend: { date: string; completed: number; added: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      let completed = 0;
      let added = 0;

      activeClients.forEach((client) => {
        (client.activityLog || []).forEach((log) => {
          const logDate = new Date(log.timestamp);
          if (logDate >= dayStart && logDate <= dayEnd) {
            if (log.type === 'task_completed' && log.description.includes('completed')) {
              completed++;
            }
            if (log.type === 'task_added') {
              added++;
            }
          }
        });
      });

      trend.push({
        date: dateStr,
        completed,
        added,
      });
    }

    return trend;
  }, [activeClients]);

  // Services distribution
  const servicesDistribution = useMemo(() => {
    const services: Record<string, number> = {};
    activeClients.forEach((client) => {
      client.services.forEach((service) => {
        services[service.name] = (services[service.name] || 0) + 1;
      });
    });
    return Object.entries(services)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [activeClients]);

  // Average completion time (days from creation to completion)
  const avgCompletionTime = useMemo(() => {
    const completedClients = activeClients.filter((c) => c.status === 'completed');
    if (completedClients.length === 0) return null;

    const totalDays = completedClients.reduce((sum, client) => {
      const created = new Date(client.createdAt);
      const completedLog = client.activityLog.find(
        (log) => log.type === 'status_changed' && log.metadata?.newStatus === 'completed'
      );
      if (completedLog) {
        const completed = new Date(completedLog.timestamp);
        return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }
      return sum;
    }, 0);

    return Math.round(totalDays / completedClients.length);
  }, [activeClients]);

  // NPS Overview
  const npsOverview = useMemo(() => {
    const respondents = activeClients.filter((c) => c.account?.npsScore !== undefined);
    if (respondents.length < 3) return null;
    const promoters = respondents.filter((c) => c.account!.npsScore! >= 9).length;
    const passives = respondents.filter((c) => c.account!.npsScore! >= 7 && c.account!.npsScore! <= 8).length;
    const detractors = respondents.filter((c) => c.account!.npsScore! <= 6).length;
    const npsScore = Math.round(((promoters - detractors) / respondents.length) * 100);
    return { npsScore, promoters, passives, detractors, total: respondents.length };
  }, [activeClients]);

  // CRM data
  const hasCrmData = useMemo(
    () => activeClients.some((c) => c.lifecycleStage),
    [activeClients]
  );

  const totalMRR = useMemo(() => {
    if (!hasCrmData) return 0;
    return activeClients.reduce((sum, c) => {
      if (c.status !== 'active') return sum;
      return sum + (c.account?.mrr ?? 0);
    }, 0) / 100;
  }, [activeClients, hasCrmData]);

  const stageCounts = useMemo(() => {
    const counts: Record<LifecycleStage, number> = {
      'onboarding': 0,
      'active-client': 0,
      'at-risk': 0,
      'churned': 0,
    };
    activeClients.forEach((c) => {
      const stage: LifecycleStage = c.lifecycleStage ?? 'onboarding';
      counts[stage]++;
    });
    return counts;
  }, [activeClients]);

  const { getHistory, getTrend, getDelta } = useHealthHistory(activeClients);

  const healthTrends = useMemo(() => {
    const withDelta = activeClients
      .map(c => ({ client: c, delta: getDelta(c.id), snapshots: getHistory(c.id), trend: getTrend(c.id) }))
      .filter(x => x.snapshots.length >= 2);
    const improved = [...withDelta].sort((a, b) => b.delta - a.delta).slice(0, 3).filter(x => x.delta > 0);
    const declined = [...withDelta].sort((a, b) => a.delta - b.delta).slice(0, 3).filter(x => x.delta < 0);
    return { improved, declined };
  }, [activeClients, getDelta, getHistory, getTrend]);

  const churnWatchClients = useMemo(() => {
    return activeClients
      .map(c => {
        const snapshots = getHistory(c.id);
        const trend = getTrend(c.id);
        if (trend !== 'down') return null;
        const currentScore = snapshots.length > 0 ? snapshots[snapshots.length - 1].score : 50;
        const churnRisk = computeChurnRisk(snapshots, currentScore);
        return { client: c, currentScore, churnRisk };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.currentScore - b.currentScore)
      .slice(0, 5);
  }, [activeClients, getHistory, getTrend]);

  const renewalsSoon = useMemo(() => {
    const now = Date.now();
    const maxThreshold = Math.max(...(preferences.contractRenewalDays ?? [30]));
    const thresholdMs = maxThreshold * 86400000;
    return activeClients
      .filter((c) => {
        if (!c.account?.renewalDate) return false;
        const diff = new Date(c.account.renewalDate).getTime() - now;
        return diff >= 0 && diff <= thresholdMs;
      })
      .sort((a, b) =>
        new Date(a.account!.renewalDate!).getTime() - new Date(b.account!.renewalDate!).getTime()
      );
  }, [activeClients, preferences.contractRenewalDays]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2" aria-hidden="true">
            <span className="w-5 h-5 bg-yellow-400 clip-burst deco-spin inline-block" />
            <span className="w-3 h-3 bg-pink-500 clip-diamond deco-float inline-block" />
            <span className="w-2.5 h-2.5 bg-violet-500 clip-star-4 deco-float-delay inline-block" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Overview of your client onboardings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBuildADashOpen(true)}
            title="Customize dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] hover:border-zinc-900 dark:hover:border-zinc-300 shadow-[2px_2px_0_0_#d4d4d8] dark:shadow-[2px_2px_0_0_#3f3f46] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Customize</span>
          </button>
          {onOpenDigest && (
            <button
              onClick={onOpenDigest}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-yellow-400 border-2 border-zinc-900 dark:border-white rounded-[4px] hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-[2px_2px_0_0_#18181b] dark:shadow-[2px_2px_0_0_#ffffff] hover:shadow-[3px_3px_0_0_#18181b] dark:hover:shadow-[3px_3px_0_0_#ffffff] transition-all"
            >
              <span>📜</span>
              <span>Weekly Digest</span>
            </button>
          )}
          <Button onClick={() => onNavigate('clients')} tilt>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Button>
        </div>
      </div>

      {/* Needs Attention Widget */}
      {show('client-health') && needsAttentionClients.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 clip-diamond bg-red-500 animate-pulse inline-block flex-shrink-0" />
            Needs Attention
          </h2>
          <div className="space-y-2">
            {needsAttentionClients.slice(0, 5).map(({ client, health }) => (
              <button
                key={client.id}
                onClick={() => onNavigate?.('clients')}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 clip-diamond flex-shrink-0 ${HEALTH_COLORS[health!.status].dot}`} />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{client.name}</span>
                </div>
                <span className={`badge-slant text-xs px-2.5 py-0.5 flex-shrink-0 ${HEALTH_COLORS[health!.status].badge}`}>
                  <span>{health!.reason}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Churn Watch */}
      {show('client-health') && churnWatchClients.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 clip-diamond bg-orange-500 animate-pulse inline-block flex-shrink-0" />
            Churn Watch
          </h2>
          <div className="space-y-2">
            {churnWatchClients.map(({ client, currentScore, churnRisk }) => (
              <button
                key={client.id}
                onClick={() => onNavigate?.('clients')}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-orange-500 flex-shrink-0">&#8595;</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{client.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{currentScore}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${churnRisk.color}`}>
                    {churnRisk.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Watch */}
      {show('client-health') && engagementLeaderboard && (engagementLeaderboard.top.length > 0 || engagementLeaderboard.bottom.length > 0) && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 clip-diamond bg-violet-500 inline-block flex-shrink-0" />
            Engagement Watch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engagementLeaderboard.top.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                  Most Engaged
                </p>
                <div className="space-y-1.5">
                  {engagementLeaderboard.top.map(({ client, score }) => (
                    <button
                      key={client.id}
                      onClick={() => onSelectClient?.(client)}
                      className="w-full flex items-center justify-between gap-3 p-2 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {client.name}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex-shrink-0">
                        <span className="font-black">{score.total}</span>
                        <span>High</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {engagementLeaderboard.bottom.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2">
                  Least Engaged
                </p>
                <div className="space-y-1.5">
                  {engagementLeaderboard.bottom.map(({ client, score }) => (
                    <button
                      key={client.id}
                      onClick={() => onSelectClient?.(client)}
                      className="w-full flex items-center justify-between gap-3 p-2 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {client.name}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${
                        score.tier === 'low'
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      }`}>
                        <span className="font-black">{score.total}</span>
                        <span>{score.tier === 'low' ? 'Low' : 'Med'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {show('stats-bar') && !isReady && <DashboardStatsSkeleton />}
      {show('stats-bar') && isReady && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.total}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="blue"
          accentClass="border-l-4 border-yellow-400"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="purple"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="indigo"
        />
        {onTimeForecastPct !== null && (
          <StatCard
            title="On-Time Forecast"
            value={`${onTimeForecastPct}%`}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color="green"
            accentClass="border-l-4 border-yellow-400"
          />
        )}
      </div>}

      {/* NPS Overview */}
      {npsOverview && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 clip-diamond bg-indigo-500 inline-block flex-shrink-0" />
            NPS Overview
          </h2>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">NPS Score</p>
              <p className={`text-3xl font-black ${npsOverview.npsScore >= 50 ? 'text-green-600 dark:text-green-400' : npsOverview.npsScore >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                {npsOverview.npsScore >= 0 ? '+' : ''}{npsOverview.npsScore}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                <span className="text-gray-600 dark:text-gray-400">Promoters</span>
                <span className="font-bold text-gray-900 dark:text-white">{npsOverview.promoters}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                <span className="text-gray-600 dark:text-gray-400">Passives</span>
                <span className="font-bold text-gray-900 dark:text-white">{npsOverview.passives}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span className="text-gray-600 dark:text-gray-400">Detractors</span>
                <span className="font-bold text-gray-900 dark:text-white">{npsOverview.detractors}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {npsOverview.total} respondent{npsOverview.total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CRM Panel */}
      {show('crm-panel') && hasCrmData && (
        <div className="border-2 border-zinc-900 dark:border-zinc-100 shadow-[4px_4px_0_0_#18181b] dark:shadow-[4px_4px_0_0_#f4f4f5] rounded-[4px] p-6 space-y-5 bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 clip-diamond bg-emerald-500 inline-block flex-shrink-0" />
            CRM Overview
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* MRR Total */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly Recurring Revenue</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                ${totalMRR.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>

            {/* Stage Funnel */}
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Client Stages</p>
              <div className="space-y-1.5">
                {([
                  ['onboarding',    'Onboarding',    'bg-blue-500'],
                  ['active-client', 'Active Client',  'bg-emerald-500'],
                  ['at-risk',       'At Risk',        'bg-red-500'],
                  ['churned',       'Churned',        'bg-zinc-400'],
                ] as [LifecycleStage, string, string][]).map(([stage, label, color]) => {
                  const count = stageCounts[stage];
                  const total = activeClients.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={stage} className="flex items-center gap-2 text-sm">
                      <span className="w-20 text-right text-gray-600 dark:text-gray-400 flex-shrink-0">{label}</span>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-[2px] h-4 overflow-hidden">
                        {count > 0 && (
                          <div
                            className={`${color} h-4 transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                      </div>
                      <span className="w-6 text-xs font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming Renewals */}
          {renewalsSoon.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Renewals in {Math.max(...(preferences.contractRenewalDays ?? [30]))} days
              </p>
              <div className="flex flex-wrap gap-2">
                {renewalsSoon.map((c) => {
                  const days = Math.floor((new Date(c.account!.renewalDate!).getTime() - Date.now()) / 86400000);
                  return (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded-[4px] text-yellow-800 dark:text-yellow-300"
                    >
                      {c.name} — {days === 0 ? 'today' : `${days}d`}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="zigzag-rule" aria-hidden="true" />

      {show('tasks-overview') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 deco-prefix">
              Overdue Tasks
            </h2>
            {overdueTasks.length > 0 && (
              <span className="badge-slant px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                <span>{overdueTasks.length} overdue</span>
              </span>
            )}
          </div>
          {overdueTasks.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-500 dark:text-gray-400">No overdue tasks!</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {overdueTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{task.clientName}</p>
                  </div>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {formatDate(task.dueDate!)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 deco-prefix">
              Upcoming This Week
            </h2>
            {upcomingTasks.length > 0 && (
              <span className="badge-slant px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                <span>{upcomingTasks.length} tasks</span>
              </span>
            )}
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-gray-500 dark:text-gray-400">No tasks due this week</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {upcomingTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{task.clientName}</p>
                  </div>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {formatDate(task.dueDate!)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>}

      {/* Task Completion Trend */}
      {show('onboarding-trend') && <div className="glass-card p-6">
        <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
          Task Activity (Last 7 Days)
        </h2>
        <TrendChart data={completionTrend} />
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Added</span>
          </div>
        </div>
      </div>}

      {/* Services Distribution & Avg Completion Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
            Services Distribution
          </h2>
          {servicesDistribution.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2 text-gray-500 dark:text-gray-400">No services assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servicesDistribution.map(([name, count], index) => {
                const maxCount = servicesDistribution[0][1];
                const percentage = (count / maxCount) * 100;
                const colors = [
                  'bg-blue-600',
                  'bg-violet-700',
                  'bg-green-600',
                  'bg-orange-600',
                  'bg-red-600',
                  'bg-yellow-500',
                ];
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-zinc-600 dark:text-zinc-400 truncate" title={name}>
                      {name}
                    </span>
                    <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-[2px] h-3 overflow-hidden border border-zinc-300 dark:border-zinc-600">
                      <div
                        className={`h-full ${colors[index % colors.length]} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-gray-600 dark:text-gray-400 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
            Performance Metrics
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-600 rounded-[4px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-700 rounded-[4px]">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Avg. Completion Time</span>
              </div>
              <span className="text-lg font-black text-zinc-900 dark:text-white">
                {avgCompletionTime !== null ? `${avgCompletionTime} days` : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-600 rounded-[4px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-[4px]">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Tasks</span>
              </div>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{allTasks.length}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-600 rounded-[4px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-[4px]">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Overdue Tasks</span>
              </div>
              <span className="text-lg font-black text-red-600 dark:text-red-400">{overdueTasks.length}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-600 rounded-[4px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-[4px]">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tasks Completed (7d)</span>
              </div>
              <span className="text-lg font-black text-green-600 dark:text-green-400">
                {completionTrend.reduce((sum, d) => sum + d.completed, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status & Priority Distribution */}
      {show('priority-breakdown') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
            Status Distribution
          </h2>
          {activeClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No clients to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <DonutChart
                  data={[
                    { label: 'Active', value: stats.active, color: '#22c55e' },
                    { label: 'Completed', value: stats.completed, color: '#3b82f6' },
                    { label: 'On Hold', value: stats.onHold, color: '#eab308' },
                  ]}
                  size={160}
                />
              </div>
              <div className="flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active ({stats.active})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completed ({stats.completed})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">On Hold ({stats.onHold})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
            Priority Distribution
          </h2>
          {activeClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No clients to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              <PriorityBar label="High" count={priorityStats.high} total={activeClients.length} color="bg-red-500" />
              <PriorityBar label="Medium" count={priorityStats.medium} total={activeClients.length} color="bg-yellow-500" />
              <PriorityBar label="Low" count={priorityStats.low} total={activeClients.length} color="bg-blue-500" />
              <PriorityBar label="None" count={priorityStats.none} total={activeClients.length} color="bg-gray-400" />
            </div>
          )}
        </div>
      </div>}

      {/* Team Workload & Activity */}
      {(show('team-workload') || show('activity-feed')) && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        {show('team-workload') && <div className="glass-card p-6">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
            Team Workload
          </h2>
          {teamWorkload.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No team data available</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {teamWorkload.map(([name, data]) => (
                <div key={name} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600 dark:text-green-400">{data.completed} done</span>
                      {data.overdue > 0 && (
                        <span className="text-red-600 dark:text-red-400">{data.overdue} overdue</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-green-500 progress-bar"
                          style={{ width: `${data.total > 0 ? (data.completed / data.total) * 100 : 0}%` }}
                        />
                        <div
                          className="bg-red-500 progress-bar"
                          style={{ width: `${data.total > 0 ? (data.overdue / data.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                      {data.total} tasks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* Recent Activity */}
        {show('activity-feed') && <div className="glass-card p-6">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100 mb-4">
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity.map((activity, i) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg animate-view-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                  <ActivityIcon type={activity.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{activity.clientName}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>}

      {/* SLA Status */}
      {show('sla-status') && <SLAStatusWidget clients={activeClients} onNavigate={onNavigate as (view: string) => void} />}

      {/* Renewals (standalone) */}
      {show('renewals') && renewalsSoon.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>🔔</span> Upcoming Renewals
          </h2>
          <div className="flex flex-wrap gap-2">
            {renewalsSoon.map((c) => {
              const days = Math.floor((new Date(c.account!.renewalDate!).getTime() - Date.now()) / 86400000);
              return (
                <span key={c.id} className="px-2.5 py-1 text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded-[4px] text-yellow-800 dark:text-yellow-300">
                  {c.name} — {days === 0 ? 'today' : `${days}d`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Go-Live Countdown */}
      {show('go-live-dates') && <GoLiveWidget clients={activeClients} onClientClick={onSelectClient} />}

      {/* Blocked Tasks */}
      {show('blocked-tasks') && <BlockedTasksWidget clients={activeClients} onClientClick={onSelectClient} />}

      {/* AI Portfolio Brief */}
      {show('ai-portfolio-brief') && <AIPortfolioBriefWidget onSelectClient={onSelectClient} />}

      {/* Time Report */}
      {show('time-report') && <TimeReportWidget clients={activeClients} />}

      {/* Health Trends */}
      {show('health-trends') && (healthTrends.improved.length > 0 || healthTrends.declined.length > 0) && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 clip-diamond bg-violet-500 inline-block flex-shrink-0" />
            Health Trends This Week
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {healthTrends.improved.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Most Improved ↑</p>
                <div className="space-y-2">
                  {healthTrends.improved.map(({ client, snapshots, trend, delta }) => (
                    <div key={client.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{client.name}</span>
                      <HealthSparkline snapshots={snapshots} trend={trend} delta={delta} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {healthTrends.declined.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2">Steepest Decline ↓</p>
                <div className="space-y-2">
                  {healthTrends.declined.map(({ client, snapshots, trend, delta }) => (
                    <div key={client.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{client.name}</span>
                      <HealthSparkline snapshots={snapshots} trend={trend} delta={delta} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Clients */}
      {show('recent-clients') && <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-black text-gray-900 dark:text-gray-100">
            Recent Clients
          </h2>
          <button
            onClick={() => onNavigate('clients')}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View all
          </button>
        </div>
        {recentClients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No clients yet. Add your first client!</p>
            <Button onClick={() => onNavigate('clients')} className="mt-4">
              Add Client
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Assigned To</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentClients.map((client) => {
                  const completed = client.checklist.filter((t) => t.completed).length;
                  const total = client.checklist.length;
                  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <tr key={client.id}>
                      <td className="py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{client.assignedTo}</td>
                      <td className="py-3">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* BuildADash modal */}
      {buildADashOpen && (
        <BuildADash
          selected={visibleWidgets}
          onChange={(widgets) => updateUser({ dashboardConfig: { visibleWidgets: widgets } })}
          onClose={() => setBuildADashOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, accentClass = '' }: { title: string; value: string | number; icon: ReactNode; color: string; accentClass?: string }) {
  const numericValue = typeof value === 'number' ? value : null;
  const countedValue = useCountUp(numericValue ?? 0);
  const displayValue = numericValue !== null ? countedValue : value;

  const iconColors = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    purple: 'bg-violet-700 text-white',
    indigo: 'bg-blue-600 text-white',
  };

  const cardBgColors = {
    blue: '#dbeafe',   // blue-100
    green: '#dcfce7',  // green-100
    purple: '#ede9fe', // violet-100
    indigo: '#dbeafe', // blue-100
  };

  const cardBgColorsDark = {
    blue: '#0c1d3d',
    green: '#052e16',
    purple: '#1e1245',
    indigo: '#0c1d3d',
  };

  const isDark = document.documentElement.classList.contains('dark');
  const bgColor = isDark
    ? cardBgColorsDark[color as keyof typeof cardBgColorsDark]
    : cardBgColors[color as keyof typeof cardBgColors];

  return (
    <div className={`glass-card brut-hover group p-6 cursor-default ${accentClass}`} style={{ backgroundColor: bgColor }}>
      <div className="flex items-center gap-4">
        <div className={`p-3 clip-hex ${iconColors[color as keyof typeof iconColors]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
          <p className="stat-number text-zinc-900 dark:text-white transition-transform duration-100 group-hover:scale-110">{displayValue}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'completed' | 'on-hold' }) {
  const styles = {
    active: 'bg-green-600 text-white border-2 border-zinc-900',
    completed: 'bg-blue-600 text-white border-2 border-zinc-900',
    'on-hold': 'bg-orange-600 text-white border-2 border-zinc-900',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-[4px] text-xs font-bold ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date(new Date().toDateString());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size: number;
}

function DonutChart({ data, size }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke="currentColor"
          strokeWidth="20"
          className="text-gray-200 dark:text-gray-700"
        />
      </svg>
    );
  }

  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((segment, i) => {
        const percentage = segment.value / total;
        const strokeDasharray = `${percentage * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += percentage * circumference;

        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="20"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-500"
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-2xl font-bold fill-gray-900 dark:fill-gray-100"
      >
        {total}
      </text>
    </svg>
  );
}

function PriorityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} progress-bar`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-sm text-gray-600 dark:text-gray-400 text-right">{count}</span>
    </div>
  );
}

type ActivityType = 'created' | 'status_changed' | 'task_completed' | 'task_added' | 'note_updated' | 'priority_changed' | 'tag_added' | 'tag_removed' | 'archived' | 'restored' | 'duplicated' | 'attachment_added' | 'attachment_removed' | 'communication_logged' | 'milestone_added' | 'milestone_completed' | 'milestone_updated' | 'custom_field_updated' | 'phase_advanced' | 'client_graduated' | 'task_blocked' | 'task_unblocked';

function ActivityIcon({ type }: { type: ActivityType }) {
  const iconMap: Record<ActivityType, ReactNode> = {
    created: (
      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
    ),
    status_changed: (
      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    ),
    task_completed: (
      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    task_added: (
      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
    ),
    note_updated: (
      <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
    ),
    priority_changed: (
      <div className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      </div>
    ),
    tag_added: (
      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
    ),
    tag_removed: (
      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
    ),
    archived: (
      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </div>
    ),
    restored: (
      <div className="p-1.5 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    ),
    duplicated: (
      <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    ),
    attachment_added: (
      <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </div>
    ),
    attachment_removed: (
      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </div>
    ),
    communication_logged: (
      <div className="p-1.5 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    ),
    milestone_added: (
      <div className="p-1.5 bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
    ),
    milestone_completed: (
      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
    ),
    milestone_updated: (
      <div className="p-1.5 bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
    ),
    custom_field_updated: (
      <div className="p-1.5 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </div>
    ),
    phase_advanced: (
      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    ),
    client_graduated: (
      <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    task_blocked: (
      <div className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
    ),
    task_unblocked: (
      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      </div>
    ),
  };

  return iconMap[type] || iconMap.created;
}

interface TrendChartProps {
  data: { date: string; completed: number; added: number }[];
}

function TrendChart({ data }: TrendChartProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.completed, d.added]), 1);
  const chartHeight = 120;
  const chartWidth = 100;
  const padding = 10;

  const getY = (value: number) => {
    return chartHeight - padding - ((value / maxValue) * (chartHeight - padding * 2));
  };

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const completedPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
    const y = getY(d.completed);
    return `${x},${y}`;
  }).join(' ');

  const addedPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
    const y = getY(d.added);
    return `${x},${y}`;
  }).join(' ');

  // Create area fill paths
  const completedArea = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
    const y = getY(d.completed);
    return `${x},${y}`;
  });
  const completedAreaPath = `M ${padding},${chartHeight - padding} L ${completedArea.join(' L ')} L ${chartWidth - padding},${chartHeight - padding} Z`;

  const addedArea = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
    const y = getY(d.added);
    return `${x},${y}`;
  });
  const addedAreaPath = `M ${padding},${chartHeight - padding} L ${addedArea.join(' L ')} L ${chartWidth - padding},${chartHeight - padding} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + ratio * (chartHeight - padding * 2)}
            x2={chartWidth - padding}
            y2={padding + ratio * (chartHeight - padding * 2)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.3}
          />
        ))}

        {/* Added area fill */}
        <path
          d={addedAreaPath}
          fill="url(#addedGradient)"
          opacity={0.3}
        />

        {/* Completed area fill */}
        <path
          d={completedAreaPath}
          fill="url(#completedGradient)"
          opacity={0.4}
        />

        {/* Added line */}
        <polyline
          points={addedPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Completed line */}
        <polyline
          points={completedPoints}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points - Completed */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
          const y = getY(d.completed);
          return (
            <circle
              key={`completed-${i}`}
              cx={x}
              cy={y}
              r={2}
              fill="#22c55e"
              className="transition-all hover:r-3"
            />
          );
        })}

        {/* Data points - Added */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
          const y = getY(d.added);
          return (
            <circle
              key={`added-${i}`}
              cx={x}
              cy={y}
              r={2}
              fill="#3b82f6"
              className="transition-all hover:r-3"
            />
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="addedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between px-2 mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-gray-400 dark:text-gray-500">
            {formatDay(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
