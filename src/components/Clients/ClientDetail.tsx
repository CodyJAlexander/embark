import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../UI/Toast';
import type { Client, ClientFormData, Priority } from '../../types';
import { useClientContext } from '../../context/ClientContext';
import { useFavorites } from '../../hooks/useFavorites';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { formatDate, formatPhone, formatRelativeTime } from '../../utils/helpers';
import { exportClientToPDF } from '../../utils/pdfExport';
import { exportClientStatusPDF } from '../../utils/export';
import { useSLAStatuses } from '../../hooks/useSLA';
import { computeHealthScore } from '../../utils/healthScore';
import { computeNextAction } from '../../utils/nextAction';
import { subscribe } from '../../events/appEvents';
import { Button } from '../UI/Button';
import { ClientForm } from './ClientForm';
import { ServiceManager } from '../Services/ServiceManager';
import { Checklist } from '../Checklist/Checklist';
import { TaskTableView } from '../Tasks/TaskTableView';
import { NotesSection } from './NotesSection';
import { TagManager } from './TagManager';
import { ActivityLog } from './ActivityLog';
import { ClientTimeline } from './ClientTimeline';
import { CustomFieldRenderer } from '../CustomFields/CustomFieldRenderer';
import { MilestoneManager } from '../Milestones/MilestoneManager';
import { CommunicationLog } from '../Communication/CommunicationLog';
import { AttachmentManager } from '../Attachments/AttachmentManager';
import { EmailComposer } from '../Email/EmailComposer';
import { ContactsSection } from './ContactsSection';
import { AccountSection } from './AccountSection';
import { PortalModal } from '../Portal/PortalModal';
import { getPortalLastView } from '../../hooks/usePortalWriter';
import { PhaseProgress } from '../Phases/PhaseProgress';
import { PhaseManager } from '../Phases/PhaseManager';
import { PhaseGateButton } from '../Phases/PhaseGateButton';
import { HealthScoreBadge } from './HealthScoreBadge';
import { HealthPulsePanel } from './HealthPulsePanel';
import { AIRiskBrief } from '../AI/AIRiskBrief';
import { NextActionBanner } from './NextActionBanner';
import { GraduationModal } from './GraduationModal';
import { KickoffPackModal } from './KickoffPackModal';
import { DependencyGraph } from '../Checklist/DependencyGraph';
import { ClientTaskKanban } from './ClientTaskKanban';
import { ClientTimeReport } from './ClientTimeReport';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
}

const statusColors = {
  active: 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg shadow-green-500/25',
  completed: 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/25',
  'on-hold': 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/25',
};

const priorityColors: Record<Priority, string> = {
  high: 'bg-gradient-to-r from-red-400 to-rose-500 text-white',
  medium: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  low: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white',
  none: '',
};

type TaskViewMode = 'list' | 'tables' | 'board' | 'graph' | 'time';
type ActivityViewMode = 'timeline' | 'list';

export function ClientDetail({ client, onBack }: ClientDetailProps) {
  const { updateClient, deleteClient, archiveClient, restoreClient, duplicateClient, tags, completePhase, addClientNote, togglePinNote, updateLifecycleStage, updateStatus, gamification } = useClientContext() as ReturnType<typeof useClientContext> & { gamification?: { awardXP: (n: number) => void; trackClientGraduated: (id: string, opts: { perfect: boolean; daysToGraduate: number; checklistSize: number; clientName: string }) => void } };
  const { showToast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const slaStatuses = useSLAStatuses([client]);
  const healthScore = computeHealthScore(client, slaStatuses);
  const nextAction = computeNextAction(client, slaStatuses);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [showPhaseManager, setShowPhaseManager] = useState(false);
  const [showGraduationModal, setShowGraduationModal] = useState(false);
  const [showKickoffPack, setShowKickoffPack] = useState(false);
  const [taskViewMode, setTaskViewMode] = useLocalStorage<TaskViewMode>('task-view-mode', 'tables');
  const [activityViewMode, setActivityViewMode] = useLocalStorage<ActivityViewMode>('activity-view-mode', 'timeline');
  const [urlCopied, setUrlCopied] = useState(false);
  const isClientFavorite = isFavorite(client.id);

  // Subscribe to graduation_ready event for this client
  useEffect(() => {
    // Only show if not already graduated
    const alreadyGraduated = client.activityLog.some(e => e.type === 'client_graduated');
    if (alreadyGraduated) return;

    return subscribe((event) => {
      if (event.type === 'graduation_ready' && event.clientId === client.id) {
        setShowGraduationModal(true);
      }
    });
  }, [client.id, client.activityLog]);

  const handleGraduationConfirm = (summary: string) => {
    setShowGraduationModal(false);
    if (summary) {
      const noteId = addClientNote(client.id, `Graduation Summary:\n${summary}`);
      togglePinNote(client.id, noteId);
    }
    updateLifecycleStage(client.id, 'active-client');
    updateStatus(client.id, 'completed');
    const daysToGraduate = Math.round((Date.now() - new Date(client.createdAt).getTime()) / 86400000);
    const hasOverdue = client.checklist.some(i => !i.completed && i.dueDate && new Date(i.dueDate) < new Date());
    gamification?.trackClientGraduated(client.id, {
      perfect: !hasOverdue,
      daysToGraduate,
      checklistSize: client.checklist.length,
      clientName: client.name,
    });
    gamification?.awardXP(75);
  };

  const handleUpdate = (data: ClientFormData) => {
    updateClient(client.id, data);
  };

  const handleDelete = () => {
    deleteClient(client.id);
    onBack();
  };

  const handleArchive = () => {
    archiveClient(client.id);
    onBack();
  };

  const handleRestore = () => {
    restoreClient(client.id);
  };

  const handleDuplicate = () => {
    const newClient = duplicateClient(client.id);
    if (newClient) {
      onBack();
    }
  };

  const handleCopyPortalUrl = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#portal/${client.id}`;
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    showToast('Portal URL copied to clipboard', 'success');
  }, [client.id, showToast]);

  const completedTasks = client.checklist.filter((t) => t.completed).length;
  const totalTasks = client.checklist.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const blockedTaskCount = client.checklist.filter((t) => t.isBlocked && !t.completed).length;
  const clientPendingCount = client.checklist.filter((t) => t.ownerType === 'client' && !t.completed).length;

  const goLiveDaysLeft = client.targetGoLiveDate
    ? Math.ceil((new Date(client.targetGoLiveDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const goLiveChipClass =
    goLiveDaysLeft === null
      ? ''
      : goLiveDaysLeft < 0
        ? 'bg-red-500/20 text-red-400'
        : goLiveDaysLeft < 7
          ? 'bg-red-500/20 text-red-400'
          : goLiveDaysLeft < 14
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-emerald-500/20 text-emerald-400';

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors glass-subtle px-4 py-2 rounded-xl"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Clients
      </button>

      <div className="glass-card">
        <div className="p-6 border-b border-white/20 dark:border-white/10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold gradient-text">
                  {client.name}
                </h1>
                <button
                  onClick={() => toggleFavorite(client.id)}
                  className={`p-1 rounded-lg transition-all ${
                    isClientFavorite
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-gray-400 hover:text-amber-500'
                  }`}
                  title={isClientFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isClientFavorite ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    />
                  </svg>
                </button>
                {client.archived && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium glass-subtle text-gray-600 dark:text-gray-300">
                    Archived
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[client.status]}`}>
                  {client.status}
                </span>
                {client.priority && client.priority !== 'none' && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[client.priority]}`}>
                    {client.priority} priority
                  </span>
                )}
                {totalTasks > 0 && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium glass-subtle text-gray-700 dark:text-gray-300">
                    {progress}% complete
                  </span>
                )}
                {goLiveDaysLeft !== null && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${goLiveChipClass}`}>
                    {goLiveDaysLeft < 0
                      ? `${Math.abs(goLiveDaysLeft)}d overdue`
                      : goLiveDaysLeft === 0
                        ? 'Go-Live Today!'
                        : `${goLiveDaysLeft}d to go-live`}
                  </span>
                )}
                <HealthScoreBadge score={healthScore} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Added {formatDate(client.createdAt)}
                {client.communicationLog && client.communicationLog.length > 0 && (() => {
                  const last = [...client.communicationLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                  const days = Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000);
                  return (
                    <span className={`ml-2 text-xs ${days > 30 ? 'text-red-500 dark:text-red-400' : days > 14 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      · Last contact: {days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`}
                    </span>
                  );
                })()}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {client.lifecycleStage === 'onboarding' && (
                <Button variant="secondary" onClick={() => setShowKickoffPack(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Kickoff Pack
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowEmailComposer(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </Button>
              <div className="relative inline-block">
                <Button variant="secondary" onClick={() => setShowPortal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.867V16a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  Portal
                </Button>
                {(() => {
                  const lastView = getPortalLastView(client.id);
                  if (!lastView) return null;
                  return (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-cyan-500 text-white text-xs rounded-full font-bold leading-none whitespace-nowrap shadow">
                      viewed {formatRelativeTime(lastView)}
                    </span>
                  );
                })()}
              </div>
              <Button variant="secondary" onClick={handleCopyPortalUrl}>
                {urlCopied ? (
                  <>
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Portal
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={() => setShowPhaseManager(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Phases
              </Button>
              <Button variant="secondary" onClick={() => exportClientToPDF(client, tags)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </Button>
              <button
                onClick={() => exportClientStatusPDF(client)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-white/20 rounded-lg hover:bg-white/10 transition-all"
                title="Export client status as PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export PDF</span>
              </button>
              <Button variant="secondary" onClick={handleDuplicate}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
              {client.archived ? (
                <Button variant="secondary" onClick={handleRestore}>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setShowArchiveConfirm(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archive
                </Button>
              )}
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            </div>
          </div>

          {/* Phase Progress Strip */}
          {client.phases && client.phases.length > 0 && (
            <div className="mt-4">
              <PhaseProgress phases={client.phases} checklist={client.checklist} />
              <div className="mt-2 flex flex-wrap gap-2">
                {client.phases.map(phase => (
                  <PhaseGateButton
                    key={phase.id}
                    clientId={client.id}
                    phase={phase}
                    checklist={client.checklist}
                    onAdvance={completePhase}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Blocked alert banner */}
          {blockedTaskCount > 0 && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {blockedTaskCount} task{blockedTaskCount !== 1 ? 's' : ''} blocked
            </div>
          )}

          {/* Client items pending */}
          {clientPendingCount > 0 && (
            <div className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-sm font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {clientPendingCount} client action item{clientPendingCount !== 1 ? 's' : ''} pending
            </div>
          )}

          {/* Next Action Banner */}
          {nextAction && (
            <div className="mt-2">
              <NextActionBanner action={nextAction} />
            </div>
          )}

          {/* Go-Live Date Picker */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Target Go-Live
            </label>
            <input
              type="date"
              value={client.targetGoLiveDate || ''}
              onChange={(e) => updateClient(client.id, { targetGoLiveDate: e.target.value || undefined })}
              className="px-3 py-1.5 rounded-xl border bg-white/50 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-gray-100 border-white/30 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
            {client.targetGoLiveDate && (
              <button
                onClick={() => updateClient(client.id, { targetGoLiveDate: undefined })}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Clear go-live date"
              >
                Clear
              </button>
            )}
          </div>

          {/* Client Contacts Section */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Client Contacts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.contacts && client.contacts.length > 0 ? (
                client.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`glass-subtle p-4 rounded-xl ${
                      contact.isPrimary ? 'ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {contact.name}
                          </p>
                          {contact.isPrimary && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.title && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contact.title}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{contact.email}</span>
                          </a>
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{formatPhone(contact.phone)}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Fallback for legacy clients without contacts array
                <div className="glass-subtle p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Primary Contact</p>
                      <div className="mt-2 space-y-1">
                        <a
                          href={`mailto:${client.email}`}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{client.email}</span>
                        </a>
                        {client.phone && (
                          <a
                            href={`tel:${client.phone}`}
                            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{formatPhone(client.phone)}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* AI Health Pulse + Risk Brief */}
          <div className="mb-6 space-y-2">
            <HealthPulsePanel client={client} slaStatuses={slaStatuses} />
            <AIRiskBrief client={client} slaStatuses={slaStatuses} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <TagManager clientId={client.id} clientTags={client.tags || []} />
              <MilestoneManager clientId={client.id} milestones={client.milestones} />
              <ServiceManager clientId={client.id} services={client.services} />
              {/* Task View Toggle */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Tasks
                  </h3>
                  <div className="flex items-center gap-1 p-1 bg-white/30 dark:bg-white/10 rounded-lg">
                    <button
                      onClick={() => setTaskViewMode('list')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        taskViewMode === 'list'
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setTaskViewMode('tables')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        taskViewMode === 'tables'
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setTaskViewMode('board')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        taskViewMode === 'board'
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Kanban Board"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setTaskViewMode('time')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        taskViewMode === 'time'
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Time Report"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {client.checklist.some(t => t.dependsOn?.length) && (
                      <button
                        onClick={() => setTaskViewMode('graph')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          taskViewMode === 'graph'
                            ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Dependency Map"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h4v4H4zM16 4h4v4h-4zM10 18h4v4h-4zM6 8l4 5M18 8l-4 5M12 13v5" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {taskViewMode === 'list' ? (
                  <Checklist clientId={client.id} client={client} items={client.checklist} phases={client.phases} />
                ) : taskViewMode === 'tables' ? (
                  <TaskTableView client={client} />
                ) : taskViewMode === 'board' ? (
                  <ClientTaskKanban client={client} />
                ) : taskViewMode === 'time' ? (
                  <ClientTimeReport client={client} />
                ) : (
                  <DependencyGraph
                    tasks={client.checklist}
                    onNodeClick={(_taskId) => {
                      setTaskViewMode('list');
                    }}
                  />
                )}
              </div>
              <AttachmentManager clientId={client.id} attachments={client.attachments} />
            </div>
            <div className="space-y-6">
              <CustomFieldRenderer clientId={client.id} customFields={client.customFields} />
              <NotesSection
                clientId={client.id}
                clientNotes={client.clientNotes}
                notes={client.notes || ''}
              />
              <AccountSection clientId={client.id} lifecycleStage={client.lifecycleStage} account={client.account} />
              <ContactsSection clientId={client.id} contacts={client.contacts ?? []} />
              <CommunicationLog clientId={client.id} entries={client.communicationLog} />

              {/* Activity Section with Timeline/List Toggle */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activity
                  </h3>
                  <div className="flex items-center gap-1 p-1 bg-white/30 dark:bg-white/10 rounded-lg">
                    <button
                      onClick={() => setActivityViewMode('timeline')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        activityViewMode === 'timeline'
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Timeline View"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setActivityViewMode('list')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        activityViewMode === 'list'
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="List View"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {activityViewMode === 'timeline' ? (
                  <ClientTimeline client={client} maxItems={15} />
                ) : (
                  <ActivityLog entries={client.activityLog || []} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClientForm
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSubmit={handleUpdate}
        initialData={client}
      />

      <EmailComposer
        client={client}
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
      />

      {showPortal && (
        <PortalModal client={client} onClose={() => setShowPortal(false)} />
      )}

      {showPhaseManager && (
        <PhaseManager
          clientId={client.id}
          phases={client.phases || []}
          onClose={() => setShowPhaseManager(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative glass-strong rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-white/30 dark:border-white/10">
              <h3 className="text-lg font-semibold gradient-text mb-2">
                Delete Client?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete {client.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowArchiveConfirm(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative glass-strong rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-white/30 dark:border-white/10">
              <h3 className="text-lg font-semibold gradient-text mb-2">
                Archive Client?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Archive {client.name}? You can restore archived clients anytime from the archive view.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowArchiveConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleArchive}>
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGraduationModal && (
        <GraduationModal
          client={client}
          onConfirm={handleGraduationConfirm}
          onDismiss={() => setShowGraduationModal(false)}
        />
      )}

      {showKickoffPack && (
        <KickoffPackModal
          client={client}
          onClose={() => setShowKickoffPack(false)}
        />
      )}
    </div>
  );
}
