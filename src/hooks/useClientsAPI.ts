import { useState, useEffect, useCallback, useRef } from 'react';
import type { Client, ClientFormData, Service, ChecklistItem, ChecklistTemplate, Priority, ActivityLogEntry, Subtask, Comment, Milestone, CommunicationLogEntry, FileAttachment, TaskGroup, ClientNote, ClientContact, LifecycleStage, AccountInfo, OnboardingPhase } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { generateId } from '../utils/helpers';

function createLogEntry(type: ActivityLogEntry['type'], description: string, metadata?: Record<string, unknown>): ActivityLogEntry {
  return { id: generateId(), type, description, timestamp: new Date().toISOString(), metadata };
}

function createDefaultTaskGroups(): TaskGroup[] {
  return [
    { id: generateId(), name: 'To Do', order: 0, color: '#6366f1', isDefault: true },
    { id: generateId(), name: 'In Progress', order: 1, color: '#f59e0b', isDefault: false },
    { id: generateId(), name: 'Done', order: 2, color: '#10b981', isDefault: false },
  ];
}

interface ApiClientRow {
  id: string;
  name: string;
  status: string;
  lifecycleStage: string;
  industry: string | null;
  website: string | null;
  createdAt: string;
  clientData: Partial<Client> | null;
}

function apiRowToClient(row: ApiClientRow): Client {
  return {
    services: [], checklist: [], notes: '', priority: 'none' as Priority,
    tags: [], activityLog: [], taskGroups: createDefaultTaskGroups(), archived: false,
    ...(row.clientData ?? {}),
    id: row.id,
    name: row.name,
    status: row.status as Client['status'],
    lifecycleStage: (row.lifecycleStage ?? 'onboarding') as Client['lifecycleStage'],
    industry: row.industry ?? undefined,
    website: row.website ?? undefined,
    createdAt: row.createdAt,
  } as Client;
}

export function useClientsAPI() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref keeps the latest clients for debounced sync without stale closure
  const clientsRef = useRef<Client[]>([]);
  useEffect(() => { clientsRef.current = clients; }, [clients]);

  // Per-client debounced PATCH — sends full clientData blob
  const syncTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scheduleSync = useCallback((clientId: string) => {
    clearTimeout(syncTimeouts.current.get(clientId));
    syncTimeouts.current.set(clientId, setTimeout(() => {
      const client = clientsRef.current.find(c => c.id === clientId);
      if (!client) return;
      api.patch(`/api/v1/clients/${clientId}`, {
        name: client.name, status: client.status,
        lifecycleStage: client.lifecycleStage,
        industry: client.account?.industry, website: client.account?.website,
        clientData: client,
      });
    }, 800));
  }, []);

  // Load all clients on mount
  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    api.get<ApiClientRow[]>('/api/v1/clients?limit=500')
      .then(res => { if (res.data) setClients(res.data.map(apiRowToClient)); })
      .finally(() => setLoading(false));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Core CRUD ──────────────────────────────────────────────────────────────

  const addClient = useCallback((data: ClientFormData): Client => {
    const id = generateId();
    const defaultGroups = createDefaultTaskGroups();
    const newClient: Client = {
      ...data, id, createdAt: new Date().toISOString(),
      services: [], checklist: [], notes: '',
      priority: data.priority || 'none', tags: [],
      activityLog: [createLogEntry('created', 'Client created')],
      taskGroups: defaultGroups,
    };
    setClients(prev => [...prev, newClient]);
    api.post('/api/v1/clients', {
      id, name: data.name, status: data.status,
      lifecycleStage: data.lifecycleStage,
      industry: data.account?.industry, website: data.account?.website,
      clientData: newClient,
    });
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    scheduleSync(id);
  }, [scheduleSync]);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    api.delete(`/api/v1/clients/${id}`);
  }, []);

  const archiveClient = useCallback((id: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, archived: true, archivedAt: new Date().toISOString(), activityLog: [...c.activityLog, createLogEntry('archived', 'Client archived')] };
      scheduleSync(id);
      return updated;
    }));
  }, [scheduleSync]);

  const restoreClient = useCallback((id: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, archived: false, archivedAt: undefined, activityLog: [...c.activityLog, createLogEntry('restored', 'Client restored from archive')] };
      scheduleSync(id);
      return updated;
    }));
  }, [scheduleSync]);

  const duplicateClient = useCallback((id: string): Client | null => {
    const src = clients.find(c => c.id === id);
    if (!src) return null;
    const newId = generateId();
    const newClient: Client = {
      ...src, id: newId, name: `${src.name} (Copy)`,
      createdAt: new Date().toISOString(), status: 'active',
      archived: false, archivedAt: undefined,
      checklist: src.checklist.map(item => ({ ...item, id: generateId(), completed: false })),
      services: src.services.map(s => ({ ...s, id: generateId() })),
      activityLog: [createLogEntry('duplicated', `Duplicated from "${src.name}"`)],
    };
    setClients(prev => [...prev, newClient]);
    api.post('/api/v1/clients', {
      id: newId, name: newClient.name, status: newClient.status,
      lifecycleStage: newClient.lifecycleStage,
      clientData: newClient,
    });
    return newClient;
  }, [clients]);

  // ─── Status / Priority ──────────────────────────────────────────────────────

  const updateStatus = useCallback((clientId: string, status: Client['status']) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, status, activityLog: [...c.activityLog, createLogEntry('status_changed', `Status changed to ${status}`, { oldStatus: c.status, newStatus: status })] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const updatePriority = useCallback((clientId: string, priority: Priority) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, priority, activityLog: [...c.activityLog, createLogEntry('priority_changed', `Priority changed to ${priority}`, { oldPriority: c.priority, newPriority: priority })] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  // ─── Tags ───────────────────────────────────────────────────────────────────

  const addTag = useCallback((clientId: string, tagId: string, tagName: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId || c.tags.includes(tagId)) return c;
      const updated = { ...c, tags: [...c.tags, tagId], activityLog: [...c.activityLog, createLogEntry('tag_added', `Tag "${tagName}" added`)] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const removeTag = useCallback((clientId: string, tagId: string, tagName: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, tags: c.tags.filter(t => t !== tagId), activityLog: [...c.activityLog, createLogEntry('tag_removed', `Tag "${tagName}" removed`)] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  // ─── Services ───────────────────────────────────────────────────────────────

  const addService = useCallback((clientId: string, serviceName: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newService: Service = { id: generateId(), name: serviceName, order: c.services.length };
      const updated = { ...c, services: [...c.services, newService] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const updateService = useCallback((clientId: string, serviceId: string, name: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, services: c.services.map(s => s.id === serviceId ? { ...s, name } : s) };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const removeService = useCallback((clientId: string, serviceId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, services: c.services.filter(s => s.id !== serviceId) };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const reorderServices = useCallback((clientId: string, services: Service[]) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, services: services.map((s, i) => ({ ...s, order: i })) };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  // ─── Checklist ──────────────────────────────────────────────────────────────

  const addChecklistItem = useCallback((clientId: string, title: string, dueDate?: string, startDate?: string, groupId?: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const defaultGroup = c.taskGroups?.find(g => g.isDefault) || c.taskGroups?.[0];
      const newItem: ChecklistItem = { id: generateId(), title, completed: false, dueDate, startDate, order: c.checklist.length, groupId: groupId ?? defaultGroup?.id };
      const updated = { ...c, checklist: [...c.checklist, newItem], activityLog: [...c.activityLog, createLogEntry('task_added', `Task "${title}" added`)] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const addChecklistItemWithData = useCallback((clientId: string, data: Omit<ChecklistItem, 'id' | 'order'>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const defaultGroup = c.taskGroups?.find(g => g.isDefault) || c.taskGroups?.[0];
      const newItem: ChecklistItem = { ...data, id: generateId(), order: c.checklist.length, groupId: data.groupId ?? defaultGroup?.id };
      const updated = { ...c, checklist: [...c.checklist, newItem], activityLog: [...c.activityLog, createLogEntry('task_added', `Task "${data.title}" added`)] };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const updateChecklistItem = useCallback((clientId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const item = c.checklist.find(i => i.id === itemId);
      const updatedChecklist = c.checklist.map(i => i.id === itemId ? { ...i, ...updates } : i);
      let activityLog = c.activityLog;
      if (item && 'isBlocked' in updates) {
        if (updates.isBlocked && !item.isBlocked) activityLog = [...activityLog, createLogEntry('task_blocked', `Task "${item.title}" blocked`)];
        else if (!updates.isBlocked && item.isBlocked) activityLog = [...activityLog, createLogEntry('task_unblocked', `Task "${item.title}" unblocked`)];
      }
      scheduleSync(clientId);
      return { ...c, checklist: updatedChecklist, activityLog };
    }));
  }, [scheduleSync]);

  const updateChecklistItemStatus = useCallback((clientId: string, itemId: string, status: import('../types').TaskStatus) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, status, completed: status === 'done', isBlocked: status === 'blocked' }) };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const addTimeEntry = useCallback((clientId: string, taskId: string, entry: import('../types').TimeEntry) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updated = { ...c, checklist: c.checklist.map(i => i.id !== taskId ? i : { ...i, timeEntries: [...(i.timeEntries ?? []), entry] }) };
      scheduleSync(clientId);
      return updated;
    }));
  }, [scheduleSync]);

  const toggleChecklistItem = useCallback((clientId: string, itemId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const item = c.checklist.find(i => i.id === itemId);
      if (!item) return c;
      const newCompleted = !item.completed;
      const logEntry = createLogEntry('task_completed', `Task "${item.title}" ${newCompleted ? 'completed' : 'marked incomplete'}`);
      const doneGroup = c.taskGroups?.find(g => g.name.toLowerCase() === 'done');
      const todoGroup = c.taskGroups?.find(g => g.isDefault) || c.taskGroups?.[0];
      let newGroupId = item.groupId;
      if (newCompleted && doneGroup) newGroupId = doneGroup.id;
      else if (!newCompleted && todoGroup) newGroupId = todoGroup.id;

      let updatedChecklist = c.checklist.map(i => i.id === itemId ? { ...i, completed: newCompleted, groupId: newGroupId } : i);

      if (!newCompleted && item.recurrence) {
        const orphan = updatedChecklist.find(t => t.id !== itemId && t.title === item.title && !t.completed && t.recurrence === item.recurrence);
        if (orphan) updatedChecklist = updatedChecklist.filter(t => t.id !== orphan.id);
      }

      if (newCompleted && item.recurrence && item.dueDate) {
        const cur = new Date(item.dueDate);
        let next: Date;
        switch (item.recurrence) {
          case 'daily': next = new Date(cur.getTime() + 86400000); break;
          case 'weekly': next = new Date(cur.getTime() + 7 * 86400000); break;
          case 'biweekly': next = new Date(cur.getTime() + 14 * 86400000); break;
          case 'monthly': {
            next = new Date(cur); next.setDate(1); next.setMonth(next.getMonth() + 1);
            const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            next.setDate(Math.min(cur.getDate(), lastDay)); break;
          }
          default: next = cur;
        }
        if (!item.recurrenceEndDate || next <= new Date(item.recurrenceEndDate)) {
          const maxOrder = Math.max(...c.checklist.map(i => i.order ?? 0), 0);
          const defaultGroup = c.taskGroups?.find(g => g.isDefault) ?? c.taskGroups?.[0];
          updatedChecklist = [...updatedChecklist, { id: generateId(), title: item.title, completed: false, dueDate: next.toISOString().split('T')[0], order: maxOrder + 1, groupId: defaultGroup?.id, recurrence: item.recurrence, recurrenceEndDate: item.recurrenceEndDate, dependsOn: undefined }];
        }
      }
      scheduleSync(clientId);
      return { ...c, checklist: updatedChecklist, activityLog: [...c.activityLog, logEntry] };
    }));
  }, [scheduleSync]);

  const removeChecklistItem = useCallback((clientId: string, itemId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.filter(i => i.id !== itemId) };
    }));
  }, [scheduleSync]);

  const reorderChecklist = useCallback((clientId: string, checklist: ChecklistItem[]) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: checklist.map((item, i) => ({ ...item, order: i })) };
    }));
  }, [scheduleSync]);

  const applyTemplate = useCallback((clientId: string, template: ChecklistTemplate) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const now = new Date();
      const defaultGroup = c.taskGroups?.find(g => g.isDefault) || c.taskGroups?.[0];
      const newItems: ChecklistItem[] = template.items.map((item, index) => ({
        id: generateId(), title: item.title, completed: false,
        dueDate: item.dueOffsetDays ? new Date(now.getTime() + item.dueOffsetDays * 86400000).toISOString().split('T')[0] : undefined,
        order: c.checklist.length + index, groupId: defaultGroup?.id,
      }));
      scheduleSync(clientId);
      return { ...c, checklist: [...c.checklist, ...newItems], activityLog: [...c.activityLog, createLogEntry('task_added', `Applied template "${template.name}" (${template.items.length} tasks)`)] };
    }));
  }, [scheduleSync]);

  const updateNotes = useCallback((clientId: string, notes: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const hadNotes = c.notes.length > 0;
      const hasNotes = notes.length > 0;
      const logEntry = !hadNotes && hasNotes ? createLogEntry('note_updated', 'Notes added') : null;
      scheduleSync(clientId);
      return { ...c, notes, activityLog: logEntry ? [...c.activityLog, logEntry] : c.activityLog };
    }));
  }, [scheduleSync]);

  // ─── Subtasks ───────────────────────────────────────────────────────────────

  const addSubtask = useCallback((clientId: string, itemId: string, title: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, subtasks: [...(i.subtasks || []), { id: generateId(), title, completed: false } as Subtask] }) };
    }));
  }, [scheduleSync]);

  const updateSubtask = useCallback((clientId: string, itemId: string, subtaskId: string, updates: Partial<Subtask>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, subtasks: (i.subtasks || []).map(s => s.id === subtaskId ? { ...s, ...updates } : s) }) };
    }));
  }, [scheduleSync]);

  const toggleSubtask = useCallback((clientId: string, itemId: string, subtaskId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, subtasks: (i.subtasks || []).map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) }) };
    }));
  }, [scheduleSync]);

  const removeSubtask = useCallback((clientId: string, itemId: string, subtaskId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, subtasks: (i.subtasks || []).filter(s => s.id !== subtaskId) }) };
    }));
  }, [scheduleSync]);

  // ─── Comments ───────────────────────────────────────────────────────────────

  const addComment = useCallback((clientId: string, itemId: string, text: string, author: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newComment: Comment = { id: generateId(), text, author, createdAt: new Date().toISOString() };
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, comments: [...(i.comments || []), newComment] }) };
    }));
  }, [scheduleSync]);

  const updateComment = useCallback((clientId: string, itemId: string, commentId: string, text: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, comments: (i.comments || []).map(comment => comment.id === commentId ? { ...comment, text, editedAt: new Date().toISOString() } : comment) }) };
    }));
  }, [scheduleSync]);

  const deleteComment = useCallback((clientId: string, itemId: string, commentId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(i => i.id !== itemId ? i : { ...i, comments: (i.comments || []).filter(comment => comment.id !== commentId) }) };
    }));
  }, [scheduleSync]);

  // ─── Bulk operations ────────────────────────────────────────────────────────

  const bulkUpdateStatus = useCallback((clientIds: string[], status: Client['status']) => {
    setClients(prev => prev.map(c => {
      if (!clientIds.includes(c.id)) return c;
      scheduleSync(c.id);
      return { ...c, status, activityLog: [...c.activityLog, createLogEntry('status_changed', `Status changed to ${status} (bulk action)`)] };
    }));
  }, [scheduleSync]);

  const bulkUpdatePriority = useCallback((clientIds: string[], priority: Priority) => {
    setClients(prev => prev.map(c => {
      if (!clientIds.includes(c.id)) return c;
      scheduleSync(c.id);
      return { ...c, priority, activityLog: [...c.activityLog, createLogEntry('priority_changed', `Priority changed to ${priority} (bulk action)`)] };
    }));
  }, [scheduleSync]);

  const bulkArchive = useCallback((clientIds: string[]) => {
    setClients(prev => prev.map(c => {
      if (!clientIds.includes(c.id)) return c;
      scheduleSync(c.id);
      return { ...c, archived: true, archivedAt: new Date().toISOString(), activityLog: [...c.activityLog, createLogEntry('archived', 'Client archived (bulk action)')] };
    }));
  }, [scheduleSync]);

  const bulkDelete = useCallback((clientIds: string[]) => {
    setClients(prev => prev.filter(c => !clientIds.includes(c.id)));
    clientIds.forEach(id => api.delete(`/api/v1/clients/${id}`));
  }, []);

  const bulkRestore = useCallback((clientIds: string[]) => {
    setClients(prev => prev.map(c => {
      if (!clientIds.includes(c.id)) return c;
      scheduleSync(c.id);
      return { ...c, archived: false, archivedAt: undefined, activityLog: [...c.activityLog, createLogEntry('restored', 'Client restored (bulk action)')] };
    }));
  }, [scheduleSync]);

  // ─── Import / Backup ────────────────────────────────────────────────────────

  const importClients = useCallback((clientsToImport: ClientFormData[]): number => {
    const newClients: Client[] = clientsToImport.map(data => {
      const id = generateId();
      const c: Client = { ...data, id, createdAt: new Date().toISOString(), services: [], checklist: [], notes: '', priority: data.priority || 'none', tags: [], activityLog: [createLogEntry('created', 'Client imported from CSV')], taskGroups: createDefaultTaskGroups() };
      api.post('/api/v1/clients', { id, name: data.name, status: data.status, lifecycleStage: data.lifecycleStage, clientData: c });
      return c;
    });
    setClients(prev => [...prev, ...newClients]);
    return newClients.length;
  }, []);

  const restoreBackup = useCallback((backupClients: Client[], merge = false): number => {
    if (merge) {
      let added = 0;
      setClients(prev => {
        const newOnes = backupClients.filter(c => !prev.some(e => e.id === c.id));
        added = newOnes.length;
        newOnes.forEach(c => api.post('/api/v1/clients', { id: c.id, name: c.name, status: c.status, clientData: c }));
        return [...prev, ...newOnes];
      });
      return added;
    }
    setClients(backupClients);
    backupClients.forEach(c => api.post('/api/v1/clients', { id: c.id, name: c.name, status: c.status, clientData: c }).catch(() => scheduleSync(c.id)));
    return backupClients.length;
  }, [scheduleSync]);

  // ─── Custom fields ──────────────────────────────────────────────────────────

  const updateCustomField = useCallback((clientId: string, fieldId: string, value: unknown) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, customFields: { ...(c.customFields || {}), [fieldId]: value }, activityLog: [...c.activityLog, createLogEntry('custom_field_updated', 'Custom field updated')] };
    }));
  }, [scheduleSync]);

  // ─── Milestones ─────────────────────────────────────────────────────────────

  const addMilestone = useCallback((clientId: string, milestone: Omit<Milestone, 'id' | 'order'>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newMilestone: Milestone = { id: generateId(), ...milestone, order: (c.milestones?.length || 0) };
      scheduleSync(clientId);
      return { ...c, milestones: [...(c.milestones || []), newMilestone], activityLog: [...c.activityLog, createLogEntry('milestone_added', `Milestone "${milestone.title}" added`)] };
    }));
  }, [scheduleSync]);

  const updateMilestone = useCallback((clientId: string, milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, milestones: (c.milestones || []).map(m => m.id === milestoneId ? { ...m, ...updates } : m), activityLog: [...c.activityLog, createLogEntry('milestone_updated', 'Milestone updated')] };
    }));
  }, [scheduleSync]);

  const completeMilestone = useCallback((clientId: string, milestoneId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const milestone = c.milestones?.find(m => m.id === milestoneId);
      const isCompleting = !milestone?.completedAt;
      scheduleSync(clientId);
      return { ...c, milestones: (c.milestones || []).map(m => m.id === milestoneId ? { ...m, completedAt: isCompleting ? new Date().toISOString() : undefined } : m), activityLog: [...c.activityLog, createLogEntry('milestone_completed', isCompleting ? `Milestone "${milestone?.title}" completed` : `Milestone "${milestone?.title}" uncompleted`)] };
    }));
  }, [scheduleSync]);

  const removeMilestone = useCallback((clientId: string, milestoneId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const milestone = c.milestones?.find(m => m.id === milestoneId);
      scheduleSync(clientId);
      return { ...c, milestones: (c.milestones || []).filter(m => m.id !== milestoneId), activityLog: [...c.activityLog, createLogEntry('milestone_updated', `Milestone "${milestone?.title}" removed`)] };
    }));
  }, [scheduleSync]);

  const reorderMilestones = useCallback((clientId: string, milestones: Milestone[]) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, milestones: milestones.map((m, i) => ({ ...m, order: i })) };
    }));
  }, [scheduleSync]);

  // ─── Phases ─────────────────────────────────────────────────────────────────

  const addPhase = useCallback((clientId: string, phase: Omit<OnboardingPhase, 'id' | 'order'>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newPhase: OnboardingPhase = { id: generateId(), ...phase, order: (c.phases?.length || 0) };
      scheduleSync(clientId);
      return { ...c, phases: [...(c.phases || []), newPhase] };
    }));
  }, [scheduleSync]);

  const updatePhase = useCallback((clientId: string, phaseId: string, updates: Partial<Omit<OnboardingPhase, 'id'>>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, phases: (c.phases || []).map(p => p.id === phaseId ? { ...p, ...updates } : p) };
    }));
  }, [scheduleSync]);

  const deletePhase = useCallback((clientId: string, phaseId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, phases: (c.phases || []).filter(p => p.id !== phaseId), checklist: c.checklist.map(item => item.phaseId === phaseId ? { ...item, phaseId: undefined } : item) };
    }));
  }, [scheduleSync]);

  const reorderPhases = useCallback((clientId: string, phases: OnboardingPhase[]) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, phases: phases.map((p, i) => ({ ...p, order: i })) };
    }));
  }, [scheduleSync]);

  const completePhase = useCallback((clientId: string, phaseId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const phase = c.phases?.find(p => p.id === phaseId);
      if (!phase) return c;
      const phaseTasks = c.checklist.filter(t => t.phaseId === phaseId);
      if (!phaseTasks.every(t => t.completed)) return c;
      scheduleSync(clientId);
      return { ...c, phases: (c.phases ?? []).map(p => p.id === phaseId ? { ...p, completedAt: new Date().toISOString() } : p), activityLog: [...c.activityLog, createLogEntry('phase_advanced', `Phase "${phase.name}" advanced`, { phaseId, actor: 'You' })] };
    }));
  }, [scheduleSync]);

  // ─── Contacts ───────────────────────────────────────────────────────────────

  const addContact = useCallback((clientId: string, contact: Omit<ClientContact, 'id' | 'createdAt'>) => {
    const newContact: ClientContact = { ...contact, id: generateId(), createdAt: new Date().toISOString() };
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, contacts: [...(c.contacts ?? []), newContact] };
    }));
  }, [scheduleSync]);

  const updateContact = useCallback((clientId: string, contactId: string, updates: Partial<Omit<ClientContact, 'id' | 'createdAt'>>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, contacts: (c.contacts ?? []).map(ct => ct.id === contactId ? { ...ct, ...updates } : ct) };
    }));
  }, [scheduleSync]);

  const removeContact = useCallback((clientId: string, contactId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, contacts: (c.contacts ?? []).filter(ct => ct.id !== contactId) };
    }));
  }, [scheduleSync]);

  // ─── Lifecycle / Account ────────────────────────────────────────────────────

  const updateLifecycleStage = useCallback((clientId: string, stage: LifecycleStage) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, lifecycleStage: stage, activityLog: [...c.activityLog, { id: generateId(), type: 'status_changed' as const, description: `Lifecycle stage changed to ${stage}`, timestamp: new Date().toISOString() }] };
    }));
  }, [scheduleSync]);

  const updateAccountInfo = useCallback((clientId: string, info: Partial<AccountInfo>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, account: { ...c.account, ...info } };
    }));
  }, [scheduleSync]);

  // ─── Communication log ──────────────────────────────────────────────────────

  const addCommunication = useCallback((clientId: string, entry: Omit<CommunicationLogEntry, 'id' | 'timestamp'>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newEntry: CommunicationLogEntry = { id: generateId(), ...entry, timestamp: new Date().toISOString() };
      scheduleSync(clientId);
      return { ...c, communicationLog: [...(c.communicationLog || []), newEntry], activityLog: [...c.activityLog, createLogEntry('communication_logged', `${entry.type}: ${entry.subject}`)] };
    }));
  }, [scheduleSync]);

  const updateCommunication = useCallback((clientId: string, entryId: string, updates: Partial<Omit<CommunicationLogEntry, 'id' | 'timestamp'>>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, communicationLog: (c.communicationLog || []).map(e => e.id === entryId ? { ...e, ...updates } : e) };
    }));
  }, [scheduleSync]);

  const deleteCommunication = useCallback((clientId: string, entryId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, communicationLog: (c.communicationLog || []).filter(e => e.id !== entryId) };
    }));
  }, [scheduleSync]);

  // ─── Attachments ────────────────────────────────────────────────────────────

  const addAttachment = useCallback((clientId: string, file: Omit<FileAttachment, 'id' | 'uploadedAt'>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newAttachment: FileAttachment = { id: generateId(), ...file, uploadedAt: new Date().toISOString() };
      scheduleSync(clientId);
      return { ...c, attachments: [...(c.attachments || []), newAttachment], activityLog: [...c.activityLog, createLogEntry('attachment_added', `File "${file.name}" attached`)] };
    }));
  }, [scheduleSync]);

  const removeAttachment = useCallback((clientId: string, attachmentId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const attachment = c.attachments?.find(a => a.id === attachmentId);
      scheduleSync(clientId);
      return { ...c, attachments: (c.attachments || []).filter(a => a.id !== attachmentId), activityLog: [...c.activityLog, createLogEntry('attachment_removed', `File "${attachment?.name}" removed`)] };
    }));
  }, [scheduleSync]);

  // ─── Client notes ───────────────────────────────────────────────────────────

  const addClientNote = useCallback((clientId: string, content: string, linkedDate?: string): string => {
    const noteId = generateId();
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newNote: ClientNote = { id: noteId, content, isPinned: false, linkedDate, createdAt: new Date().toISOString() };
      scheduleSync(clientId);
      return { ...c, clientNotes: [newNote, ...(c.clientNotes || [])], activityLog: [...c.activityLog, createLogEntry('note_updated', 'Note added')] };
    }));
    return noteId;
  }, [scheduleSync]);

  const updateClientNote = useCallback((clientId: string, noteId: string, updates: Partial<Omit<ClientNote, 'id' | 'createdAt'>>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, clientNotes: (c.clientNotes || []).map(note => note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note) };
    }));
  }, [scheduleSync]);

  const deleteClientNote = useCallback((clientId: string, noteId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, clientNotes: (c.clientNotes || []).filter(note => note.id !== noteId) };
    }));
  }, [scheduleSync]);

  const togglePinNote = useCallback((clientId: string, noteId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, clientNotes: (c.clientNotes || []).map(note => note.id === noteId ? { ...note, isPinned: !note.isPinned } : note) };
    }));
  }, [scheduleSync]);

  // ─── Task groups ────────────────────────────────────────────────────────────

  const addTaskGroup = useCallback((clientId: string, name: string, color?: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const existingGroups = c.taskGroups || [];
      const newGroup: TaskGroup = { id: generateId(), name, order: existingGroups.length, color: color || '#6366f1', isDefault: false };
      scheduleSync(clientId);
      return { ...c, taskGroups: [...existingGroups, newGroup] };
    }));
  }, [scheduleSync]);

  const updateTaskGroup = useCallback((clientId: string, groupId: string, updates: Partial<Omit<TaskGroup, 'id'>>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, taskGroups: (c.taskGroups || []).map(g => g.id === groupId ? { ...g, ...updates } : g) };
    }));
  }, [scheduleSync]);

  const removeTaskGroup = useCallback((clientId: string, groupId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const group = c.taskGroups?.find(g => g.id === groupId);
      if (group?.isDefault) return c;
      const defaultGroup = c.taskGroups?.find(g => g.isDefault);
      scheduleSync(clientId);
      return { ...c, taskGroups: (c.taskGroups || []).filter(g => g.id !== groupId), checklist: c.checklist.map(item => item.groupId === groupId ? { ...item, groupId: defaultGroup?.id } : item) };
    }));
  }, [scheduleSync]);

  const reorderTaskGroups = useCallback((clientId: string, taskGroups: TaskGroup[]) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, taskGroups: taskGroups.map((g, i) => ({ ...g, order: i })) };
    }));
  }, [scheduleSync]);

  const moveTaskToGroup = useCallback((clientId: string, taskId: string, groupId: string | undefined) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      scheduleSync(clientId);
      return { ...c, checklist: c.checklist.map(item => item.id === taskId ? { ...item, groupId } : item) };
    }));
  }, [scheduleSync]);

  // ─── Direct setter (for undo/redo) ──────────────────────────────────────────

  const setClientsDirectly = useCallback((newClients: Client[]) => {
    setClients(newClients);
    // Sync all changed clients
    newClients.forEach(c => scheduleSync(c.id));
  }, [scheduleSync]);

  return {
    clients, loading,
    addClient, updateClient, deleteClient, archiveClient, restoreClient, duplicateClient,
    updateStatus, updatePriority,
    addTag, removeTag,
    addService, updateService, removeService, reorderServices,
    addChecklistItem, addChecklistItemWithData, updateChecklistItem, toggleChecklistItem,
    removeChecklistItem, reorderChecklist, applyTemplate, updateNotes,
    addSubtask, updateSubtask, toggleSubtask, removeSubtask,
    addComment, updateComment, deleteComment,
    bulkUpdateStatus, bulkUpdatePriority, bulkArchive, bulkDelete, bulkRestore,
    importClients, restoreBackup,
    updateCustomField,
    addMilestone, updateMilestone, completeMilestone, removeMilestone, reorderMilestones,
    addContact, updateContact, removeContact,
    addCommunication, updateCommunication, deleteCommunication,
    addAttachment, removeAttachment,
    addClientNote, updateClientNote, deleteClientNote, togglePinNote,
    addTaskGroup, updateTaskGroup, removeTaskGroup, reorderTaskGroups, moveTaskToGroup,
    updateLifecycleStage, updateAccountInfo,
    addPhase, updatePhase, deletePhase, reorderPhases, completePhase,
    setClientsDirectly,
    updateChecklistItemStatus, addTimeEntry,
  };
}
