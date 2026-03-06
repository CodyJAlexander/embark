import { useMemo, useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import type { Client } from '../../types';
import { getClientHealth, HEALTH_COLORS } from '../../utils/clientHealth';
import { SLABadge } from '../SLA/SLABadge';
import { useSLAStatuses } from '../../hooks/useSLA';
import { usePortalWriter } from '../../hooks/usePortalWriter';
import { formatRelativeTime } from '../../utils/helpers';
import { useBranding } from '../../hooks/useBranding';
import { getEmbedUrl, getEmbedLabel, getEmbedIcon } from '../../utils/embedHelpers';

interface ClientPortalViewProps {
  client: Client;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function statusLabel(status: Client['status']): string {
  const map: Record<Client['status'], string> = { active: 'Active', completed: 'Completed', 'on-hold': 'On Hold' };
  return map[status];
}

export function ClientPortalView({ client }: ClientPortalViewProps) {
  const health = getClientHealth(client);
  const slaStatuses = useSLAStatuses([client]);
  const { completeTask, addComment, addStatusUpdate, logPortalView, updateApproval } = usePortalWriter(client.id);
  const { branding } = useBranding();
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [statusUpdateText, setStatusUpdateText] = useState('');
  const [statusUpdatePosted, setStatusUpdatePosted] = useState(false);
  const [localApprovalStatus, setLocalApprovalStatus] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [showRejectionInput, setShowRejectionInput] = useState<Record<string, boolean>>({});
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});

  useEffect(() => { logPortalView(); }, [logPortalView]);

  const handleCompleteTask = useCallback((taskId: string) => {
    setLocalCompleted(prev => new Set([...prev, taskId]));
    completeTask(taskId);
  }, [completeTask]);

  const handlePostComment = useCallback((taskId: string) => {
    const text = (commentTexts[taskId] ?? '').trim();
    if (!text) return;
    addComment(taskId, text);
    setCommentTexts(prev => ({ ...prev, [taskId]: '' }));
  }, [commentTexts, addComment]);

  const handlePostStatusUpdate = useCallback(() => {
    const text = statusUpdateText.trim();
    if (!text) return;
    addStatusUpdate(text);
    setStatusUpdateText('');
    setStatusUpdatePosted(true);
    setTimeout(() => setStatusUpdatePosted(false), 3000);
  }, [statusUpdateText, addStatusUpdate]);

  const handleApproveTask = useCallback((taskId: string) => {
    const now = new Date().toISOString();
    updateApproval(taskId, {
      approvalStatus: 'approved',
      approvedBy: 'Client',
      approvedAt: now,
    });
    setLocalApprovalStatus(prev => ({ ...prev, [taskId]: 'approved' }));
    setLocalCompleted(prev => new Set([...prev, taskId]));
  }, [updateApproval]);

  const handleRejectTask = useCallback((taskId: string) => {
    const note = (rejectionNotes[taskId] ?? '').trim();
    if (!note) return;
    updateApproval(taskId, {
      approvalStatus: 'rejected',
      rejectionNote: note,
    });
    setLocalApprovalStatus(prev => ({ ...prev, [taskId]: 'rejected' }));
    setShowRejectionInput(prev => ({ ...prev, [taskId]: false }));
  }, [updateApproval, rejectionNotes]);

  const worstSLA = useMemo(() => {
    const order = { breached: 0, warning: 1, on_track: 2 };
    return [...slaStatuses].sort((a, b) => order[a.status] - order[b.status])[0];
  }, [slaStatuses]);

  const portalUrl = `${window.location.origin}${window.location.pathname}#portal/${client.id}`;
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);

  // Generate QR code
  useEffect(() => {
    QRCode.toDataURL(portalUrl, { width: 128, margin: 1 }).then(setQrDataUrl).catch(() => {});
  }, [portalUrl]);

  // Phase completion confetti — once per phase per client
  useEffect(() => {
    const celebratedKey = `embark_celebrated_${client.id}`;
    const celebrated: string[] = JSON.parse(localStorage.getItem(celebratedKey) ?? '[]');
    const phases = client.phases ?? [];
    let newlyCelebrated = false;
    const toAdd: string[] = [];

    for (const phase of phases) {
      if (celebrated.includes(phase.id)) continue;
      const phaseItems = client.checklist.filter(t => t.phaseId === phase.id);
      if (phaseItems.length > 0 && phaseItems.every(t => t.completed)) {
        toAdd.push(phase.id);
        newlyCelebrated = true;
      }
    }

    if (newlyCelebrated) {
      localStorage.setItem(celebratedKey, JSON.stringify([...celebrated, ...toAdd]));
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }
  }, [client.id, client.phases, client.checklist]);

  // Print setup: hide non-portal elements during print
  useEffect(() => {
    const handleBeforePrint = () => document.body.classList.add('printing-portal');
    const handleAfterPrint = () => document.body.classList.remove('printing-portal');
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handleCopyEmail = useCallback(() => {
    const phases = [...(client.phases ?? [])].sort((a, b) => a.order - b.order);
    const completedPhases = phases.filter(p => p.completedAt).map(p => p.name);
    const currentPhase = phases.find(p => !p.completedAt);
    const currentPhaseItems = currentPhase
      ? client.checklist.filter(t => t.phaseId === currentPhase.id)
      : [];
    const currentPct = currentPhaseItems.length > 0
      ? Math.round(currentPhaseItems.filter(t => t.completed).length / currentPhaseItems.length * 100)
      : 0;
    const remaining = client.checklist.filter(t => !t.completed).length;
    const nextMilestone = (client.milestones ?? []).find(m => !m.completedAt);

    const lines = [
      `Hi ${client.name},`,
      '',
      `Here's a quick update on your onboarding progress:`,
      '',
      completedPhases.length > 0 ? `✅ Completed phases: ${completedPhases.join(', ')}` : null,
      currentPhase ? `🔄 In progress: ${currentPhase.name} (${currentPct}% complete)` : null,
      `📋 Tasks remaining: ${remaining}`,
      nextMilestone ? `🎯 Next milestone: ${nextMilestone.title}` : null,
      '',
      `View your full onboarding portal: ${portalUrl}`,
    ].filter(l => l !== null).join('\n');

    navigator.clipboard.writeText(lines);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  }, [client, portalUrl]);

  const handleDownloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${client.name.replace(/\s+/g, '-')}-portal-qr.png`;
    a.click();
  }, [qrDataUrl, client.name]);

  const lastActivity = client.activityLog[client.activityLog.length - 1];
  const lastUpdated = lastActivity
    ? new Date(lastActivity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const completedCount = client.checklist.filter(t => t.completed).length;
  const totalCount = client.checklist.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overdueCount = client.checklist.filter(
    t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;
  const inProgressCount = client.checklist.filter(t => !t.completed).length;

  // Health banner
  const healthBanner = useMemo(() => {
    if (!health) return null;
    if (health.status === 'on-track') return { label: 'On Track', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (health.status === 'at-risk') return { label: 'At Risk', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Behind', cls: 'bg-red-100 text-red-700 border-red-200' };
  }, [health]);

  // Upcoming tasks — next 14 days
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 86400000);
    return client.checklist
      .filter(t => !t.completed && t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= in14)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [client.checklist]);

  const sortByDue = (items: typeof client.checklist) =>
    [...items].sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });

  const clientActionItems = useMemo(() =>
    sortByDue(client.checklist.filter(t => !t.completed && t.ownerType === 'client')).slice(0, 8),
  [client.checklist]);

  const internalItems = useMemo(() =>
    sortByDue(client.checklist.filter(t => !t.completed && t.ownerType !== 'client')).slice(0, 5),
  [client.checklist]);

  const phases = client.phases ?? [];
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  const milestones = client.milestones ?? [];
  const now = new Date();

  // SVG ring
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const keyDates = [
    { label: 'Contract Start', value: client.account?.contractStartDate },
    { label: 'Contract End', value: client.account?.renewalDate },
    { label: 'Industry', value: client.account?.industry },
  ].filter(d => d.value);

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <div
        className={`text-white px-8 py-8${!branding.accentColor ? ' bg-gradient-to-r from-violet-700 to-indigo-600' : ''}`}
        style={branding.accentColor ? { background: `linear-gradient(to right, ${branding.accentColor}, ${branding.accentColor}cc)` } : undefined}
      >
        {/* Branding bar — company name/logo/tagline */}
        {(branding.companyName || branding.logoUrl || branding.tagline) && (
          <div className="max-w-2xl mx-auto mb-4 flex items-center gap-3 pb-4 border-b border-white/20">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt={branding.companyName || 'Company logo'}
                className="h-10 w-auto max-w-[120px] object-contain rounded bg-white/10 p-1"
              />
            )}
            <div>
              {branding.companyName && (
                <p className="text-lg font-black leading-tight">{branding.companyName}</p>
              )}
              {branding.tagline && (
                <p className="text-sm text-white/75 leading-tight">{branding.tagline}</p>
              )}
            </div>
          </div>
        )}
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black flex-shrink-0">
              {initials(client.name)}
            </div>
            <div>
              <h1 className="text-2xl font-black">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-white/20">
                  {statusLabel(client.status)}
                </span>
                {health && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${HEALTH_COLORS[health.status].dot}`} />
                    {HEALTH_COLORS[health.status].label}
                  </span>
                )}
                {worstSLA && worstSLA.status !== 'on_track' && (
                  <SLABadge status={worstSLA.status} />
                )}
              </div>
            </div>
          </div>
          <div className="print:hidden flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <button
              onClick={handleCopyEmail}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 border-2 border-white shadow-[3px_3px_0_0_rgba(255,255,255,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] rounded-[4px] text-sm font-semibold transition-all"
              title="Copy progress email to clipboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {emailCopied ? 'Copied!' : 'Copy Email'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 border-2 border-white shadow-[3px_3px_0_0_rgba(255,255,255,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] rounded-[4px] text-sm font-semibold transition-all"
              title="Print this page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
        {lastUpdated && (
          <div className="max-w-2xl mx-auto mt-3 text-xs text-white/60">
            Last updated: {lastUpdated}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Progress block */}
        <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6 border-t-4" style={{ borderTopColor: branding.accentColor || '#7c3aed' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Onboarding Progress</h2>
          <div className="flex items-center gap-8 flex-wrap">
            {/* Ring */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="56" cy="56" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="56" cy="56" r={r}
                  fill="none" stroke={branding.accentColor || '#7c3aed'} strokeWidth="10"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-slate-800">
                {pct}%
              </div>
            </div>
            {/* Pills */}
            <div className="flex gap-3 flex-wrap">
              <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold">
                {completedCount} Completed
              </div>
              <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                {inProgressCount} In Progress
              </div>
              {overdueCount > 0 && (
                <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                  {overdueCount} Overdue
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Health Banner */}
        {healthBanner && (
          <div className={`border-2 border-zinc-900 rounded-[4px] p-4 flex items-center gap-3 ${healthBanner.cls}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold">Overall Status: {healthBanner.label}</span>
          </div>
        )}

        {/* Horizontal Phase Timeline */}
        {sortedPhases.length > 0 && client.targetGoLiveDate && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6 border-t-4" style={{ borderTopColor: branding.accentColor || '#7c3aed' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Phase Timeline</h2>
            <div className="relative">
              {/* Base line */}
              <div className="h-1 bg-slate-200 rounded-full" />
              {/* Phase dots positioned along timeline */}
              <div className="relative mt-1">
                {sortedPhases.map((phase, i) => {
                  const pct = sortedPhases.length > 1 ? (i / (sortedPhases.length - 1)) * 100 : 50;
                  return (
                    <div
                      key={phase.id}
                      className="absolute -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${pct}%` }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 -mt-2.5 ${
                        phase.completedAt
                          ? 'bg-violet-600 border-violet-600'
                          : 'bg-white border-violet-400'
                      }`} />
                      <span className="text-xs text-slate-500 mt-1 text-center whitespace-nowrap">{phase.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-8" /> {/* Spacer for labels */}
            </div>
          </div>
        )}

        {/* Upcoming Tasks — next 14 days */}
        {upcomingTasks.length > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Upcoming (Next 14 Days)</h2>
            <div className="space-y-2">
              {upcomingTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700 flex-1 truncate">{t.title}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full flex-shrink-0">
                    {t.dueDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestone timeline */}
        {milestones.length > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Milestones</h2>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              {milestones.map(m => {
                const isPast = !m.completedAt && m.targetDate && new Date(m.targetDate) < now;
                return (
                  <div
                    key={m.id}
                    title={`${m.title}${m.targetDate ? ` · ${m.targetDate}` : ''}`}
                    className={`w-5 h-5 rounded-full flex-shrink-0 border-2 ${
                      m.completedAt
                        ? 'bg-violet-700 border-violet-700'
                        : isPast
                          ? 'bg-white border-red-500'
                          : 'bg-white border-violet-400'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {milestones.map(m => (
                <span key={m.id} className={`text-xs ${m.completedAt ? 'text-violet-700 font-semibold' : 'text-slate-400'}`}>
                  {m.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Phase-grouped progress (if phases exist) */}
        {sortedPhases.length > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Onboarding Phases</h2>
            <div className="space-y-3">
              {sortedPhases.map((phase) => {
                const phaseItems = client.checklist.filter(t => t.phaseId === phase.id);
                if (phaseItems.length === 0) return null;
                const done = phaseItems.filter(t => t.completed).length;
                const phasePct = Math.round((done / phaseItems.length) * 100);
                return (
                  <div key={phase.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700">{phase.name}</span>
                      <span className="text-xs text-slate-500">{done}/{phaseItems.length}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${phasePct}%`, backgroundColor: branding.accentColor || '#7c3aed' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Your Action Items (client-owned tasks) — interactive */}
        {clientActionItems.length > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6 border-t-4 border-t-violet-500">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Your Action Items</h2>
            <div className="space-y-4">
              {clientActionItems.map((t) => {
                const isDone = localCompleted.has(t.id) || t.completed;
                const localApproval = localApprovalStatus[t.id];
                const effectiveApprovalStatus = localApproval ?? t.approvalStatus;
                const isApprovalTask = !!t.requiresApproval;
                const isApproved = effectiveApprovalStatus === 'approved';
                const isRejected = effectiveApprovalStatus === 'rejected';
                const isPendingApproval = isApprovalTask && !isApproved && !isRejected;

                return (
                  <div key={t.id} className={`rounded-xl p-3 transition-all ${(isDone && !isRejected) ? 'opacity-60' : 'bg-white shadow-sm'}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox — hide for approval tasks (replaced by approval UI) */}
                      {!isApprovalTask && (
                        <button
                          onClick={() => !isDone && handleCompleteTask(t.id)}
                          disabled={isDone}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-500' : 'border-2 border-slate-300 hover:border-violet-500'}`}
                        >
                          {isDone && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${(isDone && !isRejected) ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                        {t.dueDate && <p className="text-xs text-slate-400 mt-0.5">Due {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}

                        {/* Approval card */}
                        {isApprovalTask && (
                          <div className="mt-3">
                            {isApproved ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm font-semibold text-emerald-700">
                                  Approved on {t.approvedAt
                                    ? new Date(t.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            ) : isRejected ? (
                              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm font-semibold text-red-700">Changes Requested</p>
                                {(t.rejectionNote ?? rejectionNotes[t.id]) && (
                                  <p className="text-xs text-red-600 mt-0.5">{t.rejectionNote ?? rejectionNotes[t.id]}</p>
                                )}
                              </div>
                            ) : isPendingApproval ? (
                              <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">✍</span>
                                  <p className="text-sm font-bold text-amber-800">Approval Required</p>
                                </div>
                                <p className="text-xs text-amber-700">Please review and approve or request changes to this task.</p>
                                {!showRejectionInput[t.id] ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApproveTask(t.id)}
                                      className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setShowRejectionInput(prev => ({ ...prev, [t.id]: true }))}
                                      className="flex-1 py-2 text-sm font-semibold rounded-lg border border-red-400 text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      Request Changes
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <textarea
                                      value={rejectionNotes[t.id] ?? ''}
                                      onChange={e => setRejectionNotes(prev => ({ ...prev, [t.id]: e.target.value }))}
                                      placeholder="Describe the changes needed..."
                                      rows={3}
                                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRejectTask(t.id)}
                                        disabled={!(rejectionNotes[t.id] ?? '').trim()}
                                        className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Submit
                                      </button>
                                      <button
                                        onClick={() => setShowRejectionInput(prev => ({ ...prev, [t.id]: false }))}
                                        className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Embedded media */}
                        {t.embed && !isDone && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">
                              {getEmbedIcon(t.embed.type)} {getEmbedLabel(t.embed.type)}
                            </p>
                            <iframe
                              src={getEmbedUrl(t.embed)}
                              width="100%"
                              height={t.embed.type === 'calendly' || t.embed.type === 'typeform' ? 500 : 315}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                              className="rounded-lg border border-slate-200"
                              title={getEmbedLabel(t.embed.type)}
                            />
                            {t.embed.type === 'calendly' && (
                              <p className="text-xs text-slate-400 mt-1 italic">Complete this task after booking</p>
                            )}
                          </div>
                        )}
                        {!isDone && !isApprovalTask && (
                          <div className="flex gap-2 mt-2">
                            <input
                              value={commentTexts[t.id] ?? ''}
                              onChange={e => setCommentTexts(prev => ({ ...prev, [t.id]: e.target.value }))}
                              placeholder="Leave a comment..."
                              className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                            <button
                              onClick={() => handlePostComment(t.id)}
                              className="text-xs px-3 py-1.5 text-white rounded-lg font-medium transition-colors"
                              style={{ backgroundColor: branding.accentColor || '#7c3aed' }}
                            >
                              Post
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Project Status Update */}
        <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Post a Status Update</h2>
          {(client.communicationLog ?? []).filter(e => e.source === 'client-portal').slice(-3).reverse().map(entry => (
            <div key={entry.id} className="mb-3 text-sm bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-600">{entry.content}</p>
              <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(entry.timestamp)}</p>
            </div>
          ))}
          <div className="mt-3 space-y-2">
            <textarea
              value={statusUpdateText}
              onChange={e => setStatusUpdateText(e.target.value)}
              placeholder="How is the project going from your perspective?"
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
            />
            <button
              onClick={handlePostStatusUpdate}
              className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors"
              style={{ backgroundColor: branding.accentColor || '#7c3aed' }}
            >
              {statusUpdatePosted ? '✓ Posted!' : 'Post Update'}
            </button>
          </div>
        </div>

        {/* What We're Working On (internal tasks) */}
        {internalItems.length > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">What We&apos;re Working On</h2>
            <ol className="space-y-2 list-decimal list-inside">
              {internalItems.map((t) => (
                <li key={t.id} className="text-sm text-slate-700">
                  <span className="font-medium">{t.title}</span>
                  {t.dueDate && (
                    <span className="text-slate-400 text-xs ml-2">· due {t.dueDate}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Fallback: show all incomplete tasks if neither bucket has items */}
        {clientActionItems.length === 0 && internalItems.length === 0 && sortedPhases.length === 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Next Steps</h2>
            <ol className="space-y-2 list-decimal list-inside">
              {sortByDue(client.checklist.filter(t => !t.completed)).slice(0, 5).map((t) => (
                <li key={t.id} className="text-sm text-slate-700">
                  <span className="font-medium">{t.title}</span>
                  {t.dueDate && (
                    <span className="text-slate-400 text-xs ml-2">· due {t.dueDate}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Key Dates */}
        {keyDates.length > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Key Dates</h2>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              {keyDates.map(d => (
                <>
                  <dt key={`${d.label}-key`} className="text-slate-500">{d.label}</dt>
                  <dd key={`${d.label}-val`} className="font-semibold text-slate-800">{d.value}</dd>
                </>
              ))}
            </dl>
          </div>
        )}

        {/* Team */}
        {(client.assignments?.length ?? 0) > 0 && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Team</h2>
            <div className="flex flex-wrap gap-4">
              {(client.assignments ?? []).map((a, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-700 text-white flex items-center justify-center text-xs font-bold">
                    {initials(a.memberId)}
                  </div>
                  <span className="text-sm text-slate-700">{a.memberId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* QR Code */}
        {qrDataUrl && (
          <div className="bg-slate-50 border-2 border-zinc-900 rounded-[4px] p-6 print:hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Share This Portal</h2>
            <div className="flex items-center gap-6 flex-wrap">
              <img src={qrDataUrl} alt="Portal QR Code" className="w-24 h-24 rounded-lg border border-slate-200" />
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Scan to open this portal on any device</p>
                <button
                  onClick={handleDownloadQR}
                  className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors"
                  style={{ backgroundColor: branding.accentColor || '#7c3aed' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download QR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-slate-400">
        Powered by Embark
      </div>
    </div>
  );
}
