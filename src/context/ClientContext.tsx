import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useToast } from '../components/UI/Toast';
import { useClients } from '../hooks/useClients';
import { useTemplates } from '../hooks/useTemplates';
import { useTags } from '../hooks/useTags';
import { useAutomations } from '../hooks/useAutomations';
import { useCustomFields } from '../hooks/useCustomFields';
import { useNotesTemplates } from '../hooks/useNotesTemplates';
import { useNotifications } from '../hooks/useNotifications';
import { useGamification } from '../hooks/useGamification';
import { GamificationContext } from './GamificationContext';
import { useAuth } from './AuthContext';
import type { Client, ClientFormData, ChecklistItem, Service, ChecklistTemplate, Priority, Tag, Subtask, AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction, Milestone, CommunicationLogEntry, FileAttachment, CustomFieldDefinition, NotesTemplate, TaskGroup, ClientContact, LifecycleStage, AccountInfo, OnboardingPhase } from '../types';
import { emit } from '../events/appEvents';
import { fire as fireWebhook } from '../services/webhooks';

interface ClientContextType {
  clients: Client[];
  addClient: (data: ClientFormData) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  duplicateClient: (id: string) => Client | null;
  updateStatus: (clientId: string, status: Client['status']) => void;
  updatePriority: (clientId: string, priority: Priority) => void;
  addClientTag: (clientId: string, tagId: string, tagName: string) => void;
  removeClientTag: (clientId: string, tagId: string, tagName: string) => void;
  addService: (clientId: string, serviceName: string) => void;
  updateService: (clientId: string, serviceId: string, name: string) => void;
  removeService: (clientId: string, serviceId: string) => void;
  reorderServices: (clientId: string, services: Service[]) => void;
  addChecklistItem: (clientId: string, title: string, dueDate?: string, startDate?: string, groupId?: string) => void;
  addChecklistItemWithData: (clientId: string, data: Omit<ChecklistItem, 'id' | 'order'>) => void;
  updateChecklistItem: (clientId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
  toggleChecklistItem: (clientId: string, itemId: string) => void;
  removeChecklistItem: (clientId: string, itemId: string) => void;
  reorderChecklist: (clientId: string, checklist: ChecklistItem[]) => void;
  applyTemplate: (clientId: string, template: ChecklistTemplate) => void;
  updateNotes: (clientId: string, notes: string) => void;
  addSubtask: (clientId: string, itemId: string, title: string) => void;
  updateSubtask: (clientId: string, itemId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  toggleSubtask: (clientId: string, itemId: string, subtaskId: string) => void;
  removeSubtask: (clientId: string, itemId: string, subtaskId: string) => void;
  addComment: (clientId: string, itemId: string, text: string, author: string) => void;
  updateComment: (clientId: string, itemId: string, commentId: string, text: string) => void;
  deleteComment: (clientId: string, itemId: string, commentId: string) => void;
  // Custom fields operations
  updateCustomField: (clientId: string, fieldId: string, value: unknown) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  addFieldDefinition: (field: Omit<CustomFieldDefinition, 'id' | 'createdAt' | 'order'>) => CustomFieldDefinition;
  updateFieldDefinition: (id: string, updates: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => void;
  deleteFieldDefinition: (id: string) => void;
  reorderFieldDefinitions: (fields: CustomFieldDefinition[]) => void;
  // Milestone operations
  addMilestone: (clientId: string, milestone: Omit<Milestone, 'id' | 'order'>) => void;
  updateMilestone: (clientId: string, milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>) => void;
  completeMilestone: (clientId: string, milestoneId: string) => void;
  removeMilestone: (clientId: string, milestoneId: string) => void;
  reorderMilestones: (clientId: string, milestones: Milestone[]) => void;
  // Contact operations
  addContact: (clientId: string, contact: Omit<ClientContact, 'id' | 'createdAt'>) => void;
  updateContact: (clientId: string, contactId: string, updates: Partial<Omit<ClientContact, 'id' | 'createdAt'>>) => void;
  removeContact: (clientId: string, contactId: string) => void;
  // Communication log operations
  addCommunication: (clientId: string, entry: Omit<CommunicationLogEntry, 'id' | 'timestamp'>) => void;
  updateCommunication: (clientId: string, entryId: string, updates: Partial<Omit<CommunicationLogEntry, 'id' | 'timestamp'>>) => void;
  deleteCommunication: (clientId: string, entryId: string) => void;
  // Attachment operations
  addAttachment: (clientId: string, file: Omit<FileAttachment, 'id' | 'uploadedAt'>) => void;
  removeAttachment: (clientId: string, attachmentId: string) => void;
  // Client note operations
  updateClientNote: (clientId: string, noteId: string, updates: Partial<{ content: string; isPinned: boolean; linkedDate: string }>) => void;
  deleteClientNote: (clientId: string, noteId: string) => void;
  togglePinNote: (clientId: string, noteId: string) => void;
  // Task group operations
  addTaskGroup: (clientId: string, name: string, color?: string) => void;
  updateTaskGroup: (clientId: string, groupId: string, updates: Partial<Omit<TaskGroup, 'id'>>) => void;
  removeTaskGroup: (clientId: string, groupId: string) => void;
  reorderTaskGroups: (clientId: string, taskGroups: TaskGroup[]) => void;
  moveTaskToGroup: (clientId: string, taskId: string, groupId: string | undefined) => void;
  bulkUpdateStatus: (clientIds: string[], status: Client['status']) => void;
  bulkUpdatePriority: (clientIds: string[], priority: Priority) => void;
  bulkArchive: (clientIds: string[]) => void;
  bulkDelete: (clientIds: string[]) => void;
  bulkRestore: (clientIds: string[]) => void;
  importClients: (clients: ClientFormData[]) => number;
  restoreBackup: (clients: Client[], merge?: boolean) => number;
  setClientsDirectly: (clients: Client[]) => void;
  updateChecklistItemStatus: (clientId: string, itemId: string, status: import('../types').TaskStatus) => void;
  addTimeEntry: (clientId: string, taskId: string, entry: import('../types').TimeEntry) => void;
  templates: ChecklistTemplate[];
  addTemplate: (name: string, items: { title: string; dueOffsetDays?: number }[]) => ChecklistTemplate;
  updateTemplate: (id: string, data: Partial<Omit<ChecklistTemplate, 'id' | 'createdAt'>>) => void;
  deleteTemplate: (id: string) => void;
  tags: Tag[];
  addTag: (name: string, color?: string) => Tag;
  updateTag: (id: string, data: Partial<Omit<Tag, 'id'>>) => void;
  deleteTag: (id: string) => void;
  getTagById: (id: string) => Tag | undefined;
  // Automation operations
  automationRules: AutomationRule[];
  addAutomationRule: (name: string, trigger: AutomationTrigger, conditions: AutomationCondition[], action: AutomationAction) => AutomationRule;
  updateAutomationRule: (id: string, updates: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>) => void;
  deleteAutomationRule: (id: string) => void;
  toggleAutomationRule: (id: string) => void;
  executeAutomation: (trigger: AutomationTrigger, client: Client) => void;
  // Notes template operations
  notesTemplates: NotesTemplate[];
  addNotesTemplate: (template: Omit<NotesTemplate, 'id' | 'createdAt'>) => NotesTemplate;
  updateNotesTemplate: (id: string, updates: Partial<Omit<NotesTemplate, 'id' | 'createdAt'>>) => void;
  deleteNotesTemplate: (id: string) => void;
  applyNotesTemplate: (template: NotesTemplate, variables: Record<string, string>) => string;
  // CRM operations
  updateLifecycleStage: (clientId: string, stage: LifecycleStage) => void;
  updateAccountInfo: (clientId: string, info: Partial<AccountInfo>) => void;
  // Phase operations
  addPhase: (clientId: string, phase: Omit<OnboardingPhase, 'id' | 'order'>) => void;
  updatePhase: (clientId: string, phaseId: string, updates: Partial<Omit<OnboardingPhase, 'id'>>) => void;
  deletePhase: (clientId: string, phaseId: string) => void;
  reorderPhases: (clientId: string, phases: OnboardingPhase[]) => void;
  completePhase: (clientId: string, phaseId: string) => void;
  // Note operations override (returns ID)
  addClientNote: (clientId: string, content: string, linkedDate?: string) => string;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const clientOperations = useClients();
  const templateOperations = useTemplates();
  const tagOperations = useTags();
  const automationOperations = useAutomations();
  const customFieldOperations = useCustomFields();
  const notesTemplateOperations = useNotesTemplates();
  const {
    notifications,
    preferences: notificationPreferences,
    notifyTaskDueSoon,
    notifyTaskOverdue,
    notifyTaskCompleted,
    notifyMilestoneReached,
    notifyClientCompleted,
    notifyAutomation,
    notifyContractRenewal,
  } = useNotifications();
  const gamification = useGamification();
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  // Sync characterClass from user profile to gamification store on mount
  const classInitialized = useRef(false);
  useEffect(() => {
    if (classInitialized.current) return;
    if (currentUser?.characterClass) {
      gamification.selectClass(currentUser.characterClass);
      classInitialized.current = true;
    }
  }, [currentUser?.characterClass]); // eslint-disable-line react-hooks/exhaustive-deps

  // Execute automation actions based on triggers
  const executeAutomation = useCallback((trigger: AutomationTrigger, client: Client) => {
    const matchingRules = automationOperations.getRulesForTrigger(trigger);

    matchingRules.forEach((rule) => {
      if (!automationOperations.checkConditions(rule.conditions, client)) return;

      let actionDescription = '';
      let success = true;

      switch (rule.action.type) {
        case 'change_status':
          clientOperations.updateStatus(client.id, rule.action.value as Client['status']);
          actionDescription = `Changed status to ${rule.action.value}`;
          break;
        case 'change_priority':
          clientOperations.updatePriority(client.id, rule.action.value as Priority);
          actionDescription = `Changed priority to ${rule.action.value}`;
          break;
        case 'add_tag': {
          const tag = tagOperations.getTagById(rule.action.value);
          if (tag) {
            clientOperations.addTag(client.id, tag.id, tag.name);
            actionDescription = `Added tag "${tag.name}"`;
          } else {
            success = false;
            actionDescription = `Tag not found: ${rule.action.value}`;
          }
          break;
        }
        case 'add_task':
          clientOperations.addChecklistItem(client.id, rule.action.value);
          actionDescription = `Added task "${rule.action.value}"`;
          break;
        case 'apply_template': {
          const template = templateOperations.templates.find(t => t.id === rule.action.value);
          if (template) {
            clientOperations.applyTemplate(client.id, template);
            actionDescription = `Applied template "${template.name}"`;
          } else {
            success = false;
            actionDescription = `Template not found: ${rule.action.value}`;
          }
          break;
        }
        case 'send_notification':
          notifyAutomation(rule.name, rule.action.value as string, client.id);
          actionDescription = `Sent notification: ${rule.action.value}`;
          break;
      }

      automationOperations.logExecution({
        automationId: rule.id,
        automationName: rule.name,
        trigger,
        action: actionDescription,
        clientId: client.id,
        clientName: client.name,
        success,
      });
    });
  }, [automationOperations, clientOperations, tagOperations, templateOperations.templates, notifyAutomation]);

  // Wrappers that fire notifications and automations

  const addClient = useCallback((data: ClientFormData): Client => {
    const newClient = clientOperations.addClient(data);
    const clientCreatedPayload = { clientId: newClient.id, clientName: newClient.name, timestamp: new Date().toISOString() };
    emit({ type: 'client_created', ...clientCreatedPayload });
    fireWebhook('client_created', clientCreatedPayload);
    executeAutomation('client_created', newClient);
    const activeCount = clientOperations.clients.filter(c => !c.archived && c.status === 'active').length + 1;
    gamification.trackClientAdded(newClient.id, activeCount);
    gamification.awardXP(10);
    gamification.trackDailyActivity();
    showToast(`Client added: ${newClient.name}`, 'success');
    return newClient;
  }, [clientOperations, executeAutomation, gamification, showToast]);

  const updateStatus = useCallback((clientId: string, status: Client['status']) => {
    const client = clientOperations.clients.find(c => c.id === clientId);
    clientOperations.updateStatus(clientId, status);
    if (client) {
      const statusPayload = { clientId, clientName: client.name, oldStatus: client.status, newStatus: status, timestamp: new Date().toISOString() };
      emit({ type: 'client_status_changed', ...statusPayload });
      fireWebhook('client_status_changed', statusPayload);
      executeAutomation('status_changed', { ...client, status });
    }
  }, [clientOperations, executeAutomation]);

  const updatePriority = useCallback((clientId: string, priority: Priority) => {
    clientOperations.updatePriority(clientId, priority);
    const client = clientOperations.clients.find(c => c.id === clientId);
    if (client) {
      executeAutomation('priority_changed', { ...client, priority });
    }
  }, [clientOperations, executeAutomation]);

  const addClientTag = useCallback((clientId: string, tagId: string, tagName: string) => {
    clientOperations.addTag(clientId, tagId, tagName);
    const client = clientOperations.clients.find(c => c.id === clientId);
    if (client && !client.tags.includes(tagId)) {
      executeAutomation('tag_added', { ...client, tags: [...client.tags, tagId] });
    }
  }, [clientOperations, executeAutomation]);

  const completePhase = useCallback((clientId: string, phaseId: string) => {
    const client = clientOperations.clients.find(c => c.id === clientId);
    const phase = client?.phases?.find(p => p.id === phaseId);
    clientOperations.completePhase(clientId, phaseId);
    if (client && phase) {
      gamification.awardXP(30);
      emit({ type: 'phase_advanced', clientId, phaseName: phase.name, timestamp: new Date().toISOString() });
      showToast(`Phase "${phase.name}" completed!`, 'success');
    }
  }, [clientOperations, gamification, showToast]);

  const toggleChecklistItem = useCallback((clientId: string, itemId: string) => {
    const client = clientOperations.clients.find(c => c.id === clientId);
    const item = client?.checklist.find(i => i.id === itemId);
    const isCompleting = item ? !item.completed : false;

    // Dependency enforcement: block completion if unmet dependencies exist
    if (isCompleting && item?.dependsOn?.length) {
      const blockers = client!.checklist.filter(
        (t) => item.dependsOn!.includes(t.id) && !t.completed
      );
      if (blockers.length > 0) {
        const names = blockers.map((b) => `"${b.title}"`).join(', ');
        showToast(`Blocked by: ${names}`, 'info');
        return;
      }
    }

    // Phase gate guard: block tasks in phases with incomplete prior phases
    if (isCompleting && item?.phaseId && client?.phases) {
      const phases = [...client.phases].sort((a, b) => a.order - b.order);
      const itemPhaseIndex = phases.findIndex(p => p.id === item.phaseId);
      if (itemPhaseIndex > 0) {
        const priorPhases = phases.slice(0, itemPhaseIndex);
        const incompletePrior = priorPhases.find(p => !p.completedAt);
        if (incompletePrior) {
          showToast(`Phase "${incompletePrior.name}" must be completed first`, 'info');
          return;
        }
      }
    }

    clientOperations.toggleChecklistItem(clientId, itemId);

    if (!client || !item || !isCompleting) return;

    showToast(`Task completed: ${item.title}`, 'success');
    const taskPayload = { clientId, clientName: client.name, taskId: itemId, taskTitle: item.title, timestamp: new Date().toISOString() };
    emit({ type: 'task_completed', ...taskPayload });
    fireWebhook('task_completed', taskPayload);
    notifyTaskCompleted(item.title, client.name, 'You', clientId, itemId);

    const updatedChecklist = client.checklist.map(i =>
      i.id === itemId ? { ...i, completed: true } : i
    );
    const updatedClient = { ...client, checklist: updatedChecklist };

    executeAutomation('task_completed', updatedClient);

    const isOnTime = item.dueDate ? new Date(item.dueDate) >= new Date() : false;
    gamification.awardXP(isOnTime ? 15 : 10);
    gamification.trackTaskCompleted({
      onTime: isOnTime,
      clientId,
      completedAt: new Date().toISOString(),
    });
    gamification.trackDailyActivity();

    const allDone = updatedChecklist.every(i => i.completed);
    if (allDone && updatedChecklist.length > 0) {
      // Check if already graduated
      const alreadyGraduated = client.activityLog.some(e => e.type === 'client_graduated');
      if (!alreadyGraduated) {
        emit({ type: 'graduation_ready', clientId, clientName: client.name, timestamp: new Date().toISOString() });
      } else {
        emit({ type: 'client_completed', clientId, clientName: client.name, timestamp: new Date().toISOString() });
        notifyClientCompleted(client.name, clientId);
        executeAutomation('all_tasks_completed', updatedClient);
      }
    }
  }, [clientOperations, executeAutomation, notifyTaskCompleted, notifyClientCompleted, gamification, showToast]);

  const completeMilestone = useCallback((clientId: string, milestoneId: string) => {
    const client = clientOperations.clients.find(c => c.id === clientId);
    const milestone = client?.milestones?.find(m => m.id === milestoneId);
    const isCompleting = milestone ? !milestone.completedAt : false;

    clientOperations.completeMilestone(clientId, milestoneId);

    if (isCompleting && milestone && client) {
      const milestonePayload = { clientId, clientName: client.name, milestoneId, milestoneTitle: milestone.title, timestamp: new Date().toISOString() };
      emit({ type: 'milestone_reached', ...milestonePayload });
      fireWebhook('milestone_reached', milestonePayload);
      notifyMilestoneReached(milestone.title, client.name, clientId);
      gamification.awardXP(25);
      gamification.trackMilestoneCompleted();
      gamification.trackDailyActivity();
    }
  }, [clientOperations, notifyMilestoneReached, gamification]);

  const toggleSubtask = useCallback((clientId: string, itemId: string, subtaskId: string) => {
    const client = clientOperations.clients.find(c => c.id === clientId);
    const item = client?.checklist.find(i => i.id === itemId);
    clientOperations.toggleSubtask(clientId, itemId, subtaskId);
    // After toggling, check if all subtasks are now complete
    if (item && !item.completed) {
      const subtasks = item.subtasks ?? [];
      const toggled = subtasks.find(s => s.id === subtaskId);
      if (toggled && !toggled.completed) {
        // We just completed this subtask — count how many are now done
        const nowComplete = subtasks.filter(s => s.id === subtaskId ? true : s.completed).length;
        if (nowComplete === subtasks.length && subtasks.length > 0) {
          showToast(`All subtasks done! Mark "${item.title}" complete?`, 'info');
        }
      }
    }
  }, [clientOperations, showToast]);

  const deleteClient = useCallback((id: string) => {
    const client = clientOperations.clients.find(c => c.id === id);
    const prevClients = [...clientOperations.clients];
    clientOperations.deleteClient(id);
    if (client) {
      showToast(`Deleted ${client.name}`, 'undo', {
        label: 'Undo',
        onClick: () => clientOperations.setClientsDirectly(prevClients),
      });
    }
  }, [clientOperations, showToast]);

  const archiveClient = useCallback((id: string) => {
    const client = clientOperations.clients.find(c => c.id === id);
    const prevClients = [...clientOperations.clients];
    clientOperations.archiveClient(id);
    if (client) {
      showToast(`Archived ${client.name}`, 'undo', {
        label: 'Undo',
        onClick: () => clientOperations.setClientsDirectly(prevClients),
      });
    }
  }, [clientOperations, showToast]);

  const restoreClient = useCallback((id: string) => {
    const client = clientOperations.clients.find(c => c.id === id);
    clientOperations.restoreClient(id);
    if (client) {
      showToast(`Restored ${client.name}`, 'success');
    }
  }, [clientOperations, showToast]);

  const duplicateClient = useCallback((id: string): Client | null => {
    const original = clientOperations.clients.find(c => c.id === id);
    const duplicate = clientOperations.duplicateClient(id);
    if (duplicate && original) {
      showToast(`Duplicated ${original.name}`, 'success');
    }
    return duplicate;
  }, [clientOperations, showToast]);

  const applyTemplate = useCallback((clientId: string, template: ChecklistTemplate) => {
    clientOperations.applyTemplate(clientId, template);
    showToast(`Template applied: ${template.name}`, 'success');
  }, [clientOperations, showToast]);

  const bulkArchive = useCallback((clientIds: string[]) => {
    const prevClients = [...clientOperations.clients];
    clientOperations.bulkArchive(clientIds);
    showToast(`Archived ${clientIds.length} client${clientIds.length > 1 ? 's' : ''}`, 'undo', {
      label: 'Undo',
      onClick: () => clientOperations.setClientsDirectly(prevClients),
    });
  }, [clientOperations, showToast]);

  const bulkDelete = useCallback((clientIds: string[]) => {
    const prevClients = [...clientOperations.clients];
    clientOperations.bulkDelete(clientIds);
    showToast(`Deleted ${clientIds.length} client${clientIds.length > 1 ? 's' : ''}`, 'undo', {
      label: 'Undo',
      onClick: () => clientOperations.setClientsDirectly(prevClients),
    });
  }, [clientOperations, showToast]);

  const bulkRestore = useCallback((clientIds: string[]) => {
    clientOperations.bulkRestore(clientIds);
    showToast(`Restored ${clientIds.length} client${clientIds.length > 1 ? 's' : ''}`, 'success');
  }, [clientOperations, showToast]);

  const bulkUpdateStatus = useCallback((clientIds: string[], status: Client['status']) => {
    clientOperations.bulkUpdateStatus(clientIds, status);
    showToast(`Updated status for ${clientIds.length} client${clientIds.length > 1 ? 's' : ''}`, 'success');
  }, [clientOperations, showToast]);

  const bulkUpdatePriority = useCallback((clientIds: string[], priority: Priority) => {
    clientOperations.bulkUpdatePriority(clientIds, priority);
    showToast(`Updated priority for ${clientIds.length} client${clientIds.length > 1 ? 's' : ''}`, 'success');
  }, [clientOperations, showToast]);

  const addCommunication = useCallback((clientId: string, entry: Omit<CommunicationLogEntry, 'id' | 'timestamp'>) => {
    clientOperations.addCommunication(clientId, entry);
    gamification.awardXP(5);
    gamification.trackCommunicationLogged();
    gamification.trackDailyActivity();
  }, [clientOperations, gamification]);

  const updateCustomField = useCallback((clientId: string, fieldId: string, value: unknown) => {
    clientOperations.updateCustomField(clientId, fieldId, value);
    gamification.trackCustomFieldFilled();
  }, [clientOperations, gamification]);

  const addAutomationRule = useCallback((
    name: string,
    trigger: AutomationTrigger,
    conditions: AutomationCondition[],
    action: AutomationAction
  ): AutomationRule => {
    const rule = automationOperations.addRule(name, trigger, conditions, action);
    gamification.trackAutomationCreated();
    return rule;
  }, [automationOperations, gamification]);

  // Check for due-soon and overdue tasks on mount
  useEffect(() => {
    if (!notificationPreferences.enabled) return;

    const now = new Date();
    const dueSoonDays = notificationPreferences.taskDueSoonDays || 3;

    // Build a set of keys for notifications already sent in the last 24h to avoid duplicates
    const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
    const recentKeys = new Set(
      notifications
        .filter(n => new Date(n.createdAt).getTime() > cutoff)
        .map(n => `${n.type}-${n.clientId}-${n.taskId}`)
    );

    clientOperations.clients.forEach(client => {
      if (client.archived) return;
      client.checklist.forEach(item => {
        if (item.completed || !item.dueDate) return;
        const dueDate = new Date(item.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          const key = `task_overdue-${client.id}-${item.id}`;
          if (!recentKeys.has(key)) {
            notifyTaskOverdue(item.title, client.name, item.dueDate, client.id, item.id);
          }
        } else if (daysUntilDue <= dueSoonDays) {
          const key = `task_due_soon-${client.id}-${item.id}`;
          if (!recentKeys.has(key)) {
            notifyTaskDueSoon(item.title, client.name, item.dueDate, client.id, item.id);
          }
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for upcoming contract renewals on mount
  useEffect(() => {
    if (!notificationPreferences.enabled) return;
    if (!notificationPreferences.contractRenewal) return;

    const thresholds = notificationPreferences.contractRenewalDays ?? [30];
    const now = new Date();

    // Build set of already-fired renewal keys (lifetime dedup, not time-bounded)
    // Key format: `${clientId}-renewal-${renewalDate}-threshold-${threshold}`
    const firedKeys = new Set(
      notifications
        .filter(n => n.type === 'contract_renewal')
        .map(n => `${n.clientId}-${n.triggeredBy}`)
    );

    clientOperations.clients.forEach(client => {
      if (client.archived || !client.account?.renewalDate) return;

      const renewalDate = client.account.renewalDate;
      const daysToRenewal = Math.floor(
        (new Date(renewalDate).getTime() - now.getTime()) / 86400000
      );
      if (daysToRenewal < 0) return; // already past renewal

      thresholds.forEach(threshold => {
        if (daysToRenewal > threshold) return;
        const key = `${client.id}-renewal-${renewalDate}-threshold-${threshold}`;
        if (!firedKeys.has(key)) {
          notifyContractRenewal(client.name, renewalDate, daysToRenewal, client.id, threshold);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: ClientContextType = {
    ...clientOperations,
    // Override with notification/automation/gamification/toast-wired versions
    addClient,
    deleteClient,
    archiveClient,
    restoreClient,
    duplicateClient,
    applyTemplate,
    bulkArchive,
    bulkDelete,
    bulkRestore,
    bulkUpdateStatus,
    bulkUpdatePriority,
    updateStatus,
    updatePriority,
    toggleChecklistItem,
    completeMilestone,
    addContact: clientOperations.addContact,
    updateContact: clientOperations.updateContact,
    removeContact: clientOperations.removeContact,
    toggleSubtask,
    addCommunication,
    updateCustomField,
    ...templateOperations,
    ...tagOperations,
    ...customFieldOperations,
    addClientTag,
    removeClientTag: clientOperations.removeTag,
    automationRules: automationOperations.rules,
    addAutomationRule,
    updateAutomationRule: automationOperations.updateRule,
    deleteAutomationRule: automationOperations.deleteRule,
    toggleAutomationRule: automationOperations.toggleRule,
    executeAutomation,
    notesTemplates: notesTemplateOperations.notesTemplates,
    addNotesTemplate: notesTemplateOperations.addTemplate,
    updateNotesTemplate: notesTemplateOperations.updateTemplate,
    deleteNotesTemplate: notesTemplateOperations.deleteTemplate,
    applyNotesTemplate: notesTemplateOperations.applyTemplate,
    updateLifecycleStage: clientOperations.updateLifecycleStage,
    updateAccountInfo: clientOperations.updateAccountInfo,
    addPhase: clientOperations.addPhase,
    updatePhase: clientOperations.updatePhase,
    deletePhase: clientOperations.deletePhase,
    reorderPhases: clientOperations.reorderPhases,
    completePhase,
    addClientNote: clientOperations.addClientNote,
    updateChecklistItemStatus: clientOperations.updateChecklistItemStatus,
    addTimeEntry: clientOperations.addTimeEntry,
  };

  return (
    <GamificationContext.Provider value={gamification}>
      <ClientContext.Provider value={value}>
        {children}
      </ClientContext.Provider>
    </GamificationContext.Provider>
  );
}

export function useClientContext() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
}
