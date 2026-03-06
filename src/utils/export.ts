import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { Client, ClientFormData, ChecklistTemplate, Priority, Tag } from '../types';

// Export filter options
export interface ExportFilters {
  statuses?: Client['status'][];
  priorities?: Priority[];
  assignees?: string[];
  tags?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  includeArchived?: boolean;
}

export function filterClientsForExport(clients: Client[], filters: ExportFilters): Client[] {
  return clients.filter((client) => {
    // Filter by archived status
    if (!filters.includeArchived && client.archived) return false;

    // Filter by status
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(client.status)) return false;
    }

    // Filter by priority
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(client.priority)) return false;
    }

    // Filter by assignee
    if (filters.assignees && filters.assignees.length > 0) {
      if (!filters.assignees.includes(client.assignedTo)) return false;
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const clientTagIds = client.tags || [];
      if (!filters.tags.some((tagId) => clientTagIds.includes(tagId))) return false;
    }

    // Filter by date range
    if (filters.dateRange) {
      const clientDate = new Date(client.createdAt);
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        if (clientDate < startDate) return false;
      }
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (clientDate > endDate) return false;
      }
    }

    return true;
  });
}

export function exportClientsToCSV(clients: Client[], tags?: Tag[]): void {
  const tagLookup = new Map(tags?.map((t) => [t.id, t.name]) || []);

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Assigned To',
    'Status',
    'Priority',
    'Tags',
    'Services',
    'Total Tasks',
    'Completed Tasks',
    'Completion %',
    'Milestones',
    'Completed Milestones',
    'Notes',
    'Created At',
    'Archived',
  ];

  const rows = clients.map((client) => {
    const completedTasks = client.checklist.filter((t) => t.completed).length;
    const totalTasks = client.checklist.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const milestoneCount = client.milestones?.length || 0;
    const completedMilestones = client.milestones?.filter((m) => m.completedAt).length || 0;
    const tagNames = (client.tags || []).map((id) => tagLookup.get(id) || id).join(', ');

    return [
      escapeCSV(client.name),
      escapeCSV(client.email),
      escapeCSV(client.phone),
      escapeCSV(client.assignedTo),
      client.status,
      client.priority || 'none',
      escapeCSV(tagNames),
      escapeCSV(client.services.map((s) => s.name).join(', ')),
      totalTasks.toString(),
      completedTasks.toString(),
      `${completionRate}%`,
      milestoneCount.toString(),
      completedMilestones.toString(),
      escapeCSV(client.notes || ''),
      new Date(client.createdAt).toLocaleDateString(),
      client.archived ? 'Yes' : 'No',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `client-onboardings-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportClientsToExcel(clients: Client[], tags?: Tag[]): void {
  const tagLookup = new Map(tags?.map((t) => [t.id, t.name]) || []);
  const workbook = XLSX.utils.book_new();

  // Main clients sheet
  const clientsData = clients.map((client) => {
    const completedTasks = client.checklist.filter((t) => t.completed).length;
    const totalTasks = client.checklist.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const milestoneCount = client.milestones?.length || 0;
    const completedMilestones = client.milestones?.filter((m) => m.completedAt).length || 0;
    const tagNames = (client.tags || []).map((id) => tagLookup.get(id) || id).join(', ');

    return {
      Name: client.name,
      Email: client.email,
      Phone: client.phone,
      'Assigned To': client.assignedTo,
      Status: client.status,
      Priority: client.priority || 'none',
      Tags: tagNames,
      Services: client.services.map((s) => s.name).join(', '),
      'Total Tasks': totalTasks,
      'Completed Tasks': completedTasks,
      'Completion %': completionRate,
      Milestones: milestoneCount,
      'Completed Milestones': completedMilestones,
      Notes: client.notes || '',
      'Created At': new Date(client.createdAt).toLocaleDateString(),
      Archived: client.archived ? 'Yes' : 'No',
    };
  });

  const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
  XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clients');

  // Tasks sheet
  const tasksData: {
    Client: string;
    Task: string;
    Status: string;
    'Due Date': string;
    'Start Date': string;
  }[] = [];

  clients.forEach((client) => {
    client.checklist.forEach((task) => {
      tasksData.push({
        Client: client.name,
        Task: task.title,
        Status: task.completed ? 'Completed' : 'Pending',
        'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
        'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
      });
    });
  });

  if (tasksData.length > 0) {
    const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
  }

  // Milestones sheet
  const milestonesData: {
    Client: string;
    Milestone: string;
    Description: string;
    'Target Date': string;
    Status: string;
    'Completed At': string;
  }[] = [];

  clients.forEach((client) => {
    client.milestones?.forEach((milestone) => {
      milestonesData.push({
        Client: client.name,
        Milestone: milestone.title,
        Description: milestone.description || '',
        'Target Date': milestone.targetDate
          ? new Date(milestone.targetDate).toLocaleDateString()
          : '',
        Status: milestone.completedAt ? 'Completed' : 'Pending',
        'Completed At': milestone.completedAt
          ? new Date(milestone.completedAt).toLocaleDateString()
          : '',
      });
    });
  });

  if (milestonesData.length > 0) {
    const milestonesSheet = XLSX.utils.json_to_sheet(milestonesData);
    XLSX.utils.book_append_sheet(workbook, milestonesSheet, 'Milestones');
  }

  // Communication Log sheet
  const communicationData: {
    Client: string;
    Type: string;
    Subject: string;
    Content: string;
    Participants: string;
    Duration: string;
    Timestamp: string;
  }[] = [];

  clients.forEach((client) => {
    client.communicationLog?.forEach((entry) => {
      communicationData.push({
        Client: client.name,
        Type: entry.type,
        Subject: entry.subject,
        Content: entry.content,
        Participants: entry.participants?.join(', ') || '',
        Duration: entry.duration ? `${entry.duration} min` : '',
        Timestamp: new Date(entry.timestamp).toLocaleString(),
      });
    });
  });

  if (communicationData.length > 0) {
    const communicationSheet = XLSX.utils.json_to_sheet(communicationData);
    XLSX.utils.book_append_sheet(workbook, communicationSheet, 'Communications');
  }

  // Write to file
  XLSX.writeFile(
    workbook,
    `client-onboardings-${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// CSV Import
export interface CSVParseResult {
  success: boolean;
  clients: ClientFormData[];
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVClients(csvContent: string): CSVParseResult {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  const errors: string[] = [];
  const clients: ClientFormData[] = [];

  if (lines.length < 2) {
    return { success: false, clients: [], errors: ['CSV file is empty or has no data rows'] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const nameIndex = headers.findIndex((h) => h.includes('name') && !h.includes('assigned'));
  const emailIndex = headers.findIndex((h) => h.includes('email'));
  const phoneIndex = headers.findIndex((h) => h.includes('phone'));
  const assignedIndex = headers.findIndex((h) => h.includes('assigned'));
  const statusIndex = headers.findIndex((h) => h.includes('status'));
  const priorityIndex = headers.findIndex((h) => h.includes('priority'));

  if (nameIndex === -1) {
    return { success: false, clients: [], errors: ['CSV must have a "Name" column'] };
  }

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const name = values[nameIndex]?.trim();

    if (!name) {
      errors.push(`Row ${i + 1}: Missing name, skipped`);
      continue;
    }

    const email = emailIndex >= 0 ? values[emailIndex]?.trim() || '' : '';
    const phone = phoneIndex >= 0 ? values[phoneIndex]?.trim() || '' : '';
    const assignedTo = assignedIndex >= 0 ? values[assignedIndex]?.trim() || '' : '';

    let status: Client['status'] = 'active';
    if (statusIndex >= 0) {
      const statusVal = values[statusIndex]?.trim().toLowerCase();
      if (statusVal === 'completed') status = 'completed';
      else if (statusVal === 'on-hold' || statusVal === 'on hold') status = 'on-hold';
    }

    let priority: Client['priority'] = 'none';
    if (priorityIndex >= 0) {
      const priorityVal = values[priorityIndex]?.trim().toLowerCase();
      if (priorityVal === 'high') priority = 'high';
      else if (priorityVal === 'medium') priority = 'medium';
      else if (priorityVal === 'low') priority = 'low';
    }

    clients.push({
      name,
      email,
      phone,
      assignedTo,
      status,
      priority,
    });
  }

  return {
    success: clients.length > 0,
    clients,
    errors,
  };
}

// Full JSON Backup
export interface BackupData {
  version: string;
  exportedAt: string;
  clients: Client[];
  templates: ChecklistTemplate[];
}

// Complete App Backup - includes ALL localStorage data
export interface FullAppBackupData {
  version: string;
  exportedAt: string;
  appName: 'embark';
  data: Record<string, unknown>;
}

// All localStorage keys used by Embark
const EMBARK_STORAGE_KEYS = [
  'onboarding-clients',
  'checklist-templates',
  'embark-tags',
  'time-blocks',
  'embark-daily-entries',
  'calendar-connections',
  'calendar-events',
  'embark-team',
  'embark-notifications',
  'notification-preferences',
  'embark-automation-rules',
  'ai-settings',
  'embark-ai-conversations',
  'embark-bud-conversations',
  'embark-buds',
  'embark-custom-fields',
  'embark-notes-templates',
  'embark-email-templates',
  'embark-theme',
  'embark-color-theme',
  'embark-sidebar-collapsed',
  'embark-webhook-endpoints',
  'embark-webhook-deliveries',
  'embark-sla-definitions',
  'embark-report-dashboards',
] as const;

export function exportFullBackup(clients: Client[], templates: ChecklistTemplate[]): void {
  const backup: BackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    clients,
    templates,
  };

  const jsonContent = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `embark-backup-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCompleteAppBackup(): void {
  const data: Record<string, unknown> = {};

  EMBARK_STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });

  const backup: FullAppBackupData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    appName: 'embark',
    data,
  };

  const jsonContent = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `embark-complete-backup-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface FullAppRestoreResult {
  success: boolean;
  keysRestored: number;
  error?: string;
}

export function parseFullAppBackup(jsonContent: string): FullAppRestoreResult & { data?: Record<string, unknown> } {
  try {
    const backup = JSON.parse(jsonContent) as FullAppBackupData;

    // Check if it's a v2 complete backup
    if (backup.version === '2.0' && backup.appName === 'embark' && backup.data) {
      return {
        success: true,
        keysRestored: Object.keys(backup.data).length,
        data: backup.data,
      };
    }

    // Legacy v1 backup - still valid
    if (backup.version === '1.0') {
      return {
        success: false,
        keysRestored: 0,
        error: 'This is a legacy backup. Use "Restore Backup" instead of "Restore Complete Backup".',
      };
    }

    return {
      success: false,
      keysRestored: 0,
      error: 'Invalid backup file format',
    };
  } catch {
    return {
      success: false,
      keysRestored: 0,
      error: 'Failed to parse backup file',
    };
  }
}

export function exportOnboardingStatusReport(clients: Client[]): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ongoingClients = clients.filter(c => !c.archived && c.status !== 'completed');

  const workbook = XLSX.utils.book_new();

  // --- Sheet 1: Client Summary ---
  const summaryData = ongoingClients.map(client => {
    const totalTasks = client.checklist.length;
    const completedTasks = client.checklist.filter(t => t.completed).length;
    const pendingTasks = client.checklist.filter(t => !t.completed);
    const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const overdueTasks = pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d < today;
    });

    const dueSoonTasks = pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    });

    const nextTask = pendingTasks
      .filter(t => t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];

    const totalMilestones = client.milestones?.length || 0;
    const completedMilestones = client.milestones?.filter(m => m.completedAt).length || 0;

    return {
      'Client Name': client.name,
      'Status': client.status.charAt(0).toUpperCase() + client.status.slice(1),
      'Priority': client.priority && client.priority !== 'none'
        ? client.priority.charAt(0).toUpperCase() + client.priority.slice(1)
        : '-',
      'Assigned To': client.assignedTo || '-',
      'Tasks Completed': `${completedTasks} / ${totalTasks}`,
      'Progress': `${completionPct}%`,
      'Overdue Tasks': overdueTasks.length,
      'Due This Week': dueSoonTasks.length,
      'Next Task': nextTask?.title || '-',
      'Next Due Date': nextTask?.dueDate
        ? new Date(nextTask.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-',
      'Milestones': totalMilestones > 0 ? `${completedMilestones} / ${totalMilestones}` : '-',
      'Start Date': new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);

  // Set column widths for readability
  summarySheet['!cols'] = [
    { wch: 24 }, // Client Name
    { wch: 12 }, // Status
    { wch: 10 }, // Priority
    { wch: 20 }, // Assigned To
    { wch: 16 }, // Tasks Completed
    { wch: 10 }, // Progress
    { wch: 14 }, // Overdue Tasks
    { wch: 14 }, // Due This Week
    { wch: 30 }, // Next Task
    { wch: 16 }, // Next Due Date
    { wch: 14 }, // Milestones
    { wch: 14 }, // Start Date
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // --- Sheet 2: Pending Tasks ---
  const pendingRows: {
    Client: string;
    Task: string;
    'Due Date': string;
    'Days Remaining': string;
    Status: string;
  }[] = [];

  ongoingClients.forEach(client => {
    const pending = client.checklist.filter(t => !t.completed);
    pending.forEach(task => {
      let daysLabel = 'No due date';
      let statusLabel = 'Pending';
      if (task.dueDate) {
        const d = new Date(task.dueDate); d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          daysLabel = `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`;
          statusLabel = 'Overdue';
        } else if (diff === 0) {
          daysLabel = 'Due today';
          statusLabel = 'Due Today';
        } else if (diff <= 7) {
          daysLabel = `${diff} day${diff !== 1 ? 's' : ''} remaining`;
          statusLabel = 'Due Soon';
        } else {
          daysLabel = `${diff} days remaining`;
        }
      }

      pendingRows.push({
        Client: client.name,
        Task: task.title,
        'Due Date': task.dueDate
          ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '-',
        'Days Remaining': daysLabel,
        Status: statusLabel,
      });
    });
  });

  if (pendingRows.length > 0) {
    const pendingSheet = XLSX.utils.json_to_sheet(pendingRows);
    pendingSheet['!cols'] = [
      { wch: 24 }, // Client
      { wch: 36 }, // Task
      { wch: 14 }, // Due Date
      { wch: 20 }, // Days Remaining
      { wch: 12 }, // Status
    ];
    XLSX.utils.book_append_sheet(workbook, pendingSheet, 'Pending Tasks');
  }

  XLSX.writeFile(
    workbook,
    `onboarding-status-report-${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

export function exportContactEmails(clients: Client[]): void {
  const headers = ['Client Name', 'Contact Name', 'Email', 'Title', 'Is Primary', 'Phone'];

  const rows: string[][] = [];

  for (const client of clients) {
    if (client.contacts && client.contacts.length > 0) {
      for (const contact of client.contacts) {
        rows.push([
          escapeCSV(client.name),
          escapeCSV(contact.name),
          escapeCSV(contact.email),
          escapeCSV(contact.title || ''),
          contact.isPrimary ? 'Yes' : 'No',
          escapeCSV(contact.phone || ''),
        ]);
      }
    } else if (client.email) {
      // Fallback: use legacy email field
      rows.push([
        escapeCSV(client.name),
        escapeCSV(client.name),
        escapeCSV(client.email),
        '',
        'Yes',
        escapeCSV(client.phone || ''),
      ]);
    }
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `contact-emails-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function restoreFullAppBackup(data: Record<string, unknown>): number {
  let keysRestored = 0;

  Object.entries(data).forEach(([key, value]) => {
    if (EMBARK_STORAGE_KEYS.includes(key as typeof EMBARK_STORAGE_KEYS[number])) {
      localStorage.setItem(key, JSON.stringify(value));
      keysRestored++;
    }
  });

  return keysRestored;
}

export interface RestoreResult {
  success: boolean;
  clients: Client[];
  templates: ChecklistTemplate[];
  error?: string;
}

export function parseBackupFile(jsonContent: string): RestoreResult {
  try {
    const data = JSON.parse(jsonContent) as BackupData;

    if (!data.version || !Array.isArray(data.clients)) {
      return { success: false, clients: [], templates: [], error: 'Invalid backup file format' };
    }

    // Validate clients have required fields
    const validClients = data.clients.filter((c) => c.id && c.name);
    const validTemplates = data.templates?.filter((t) => t.id && t.name) || [];

    return {
      success: true,
      clients: validClients,
      templates: validTemplates,
    };
  } catch {
    return { success: false, clients: [], templates: [], error: 'Failed to parse backup file' };
  }
}

export function exportClientStatusPDF(client: Client): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const line = (text: string, size: number, style: 'normal' | 'bold' = 'normal', color = '#1f2937') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(color);
    doc.text(text, margin, y);
  };

  const newPage = () => { doc.addPage(); y = 20; };
  const bump = (n: number) => { y += n; };

  // Header
  line('Onboarding Status Report', 20, 'bold', '#4f46e5');
  bump(8);
  line(client.name, 16, 'bold');
  bump(6);
  const statusLabel = { active: 'In Progress', completed: 'Completed', 'on-hold': 'On Hold' }[client.status] ?? client.status;
  line(`Status: ${statusLabel}`, 11, 'normal', '#6b7280');
  bump(5);
  const completedTasks = client.checklist.filter(i => i.completed).length;
  const totalTasks = client.checklist.length;
  if (totalTasks > 0) {
    line(`Progress: ${completedTasks}/${totalTasks} tasks (${Math.round((completedTasks / totalTasks) * 100)}%)`, 11, 'normal', '#6b7280');
    bump(5);
  }
  bump(5);

  // Services
  if (client.services.length > 0) {
    line('Services', 13, 'bold');
    bump(5);
    for (const svc of client.services) {
      line(`• ${svc.name}`, 10);
      bump(4);
    }
    bump(4);
  }

  // Milestones
  if ((client.milestones?.length ?? 0) > 0) {
    line('Milestones', 13, 'bold');
    bump(5);
    for (const ms of client.milestones!) {
      const status = ms.completedAt ? '✓' : '○';
      const target = ms.targetDate
        ? ` (${new Date(ms.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
        : '';
      line(`${status} ${ms.title}${target}`, 10, 'normal', ms.completedAt ? '#059669' : '#374151');
      bump(5);
      if (y > 260) newPage();
    }
    bump(4);
  }

  // Completed tasks
  const done = client.checklist.filter(i => i.completed);
  if (done.length > 0) {
    if (y > 240) newPage();
    line('Completed Tasks', 13, 'bold');
    bump(5);
    for (const item of done) {
      const wrappedTitle = doc.splitTextToSize(`✓ ${item.title}`, pageWidth - margin * 2);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#059669');
      doc.text(wrappedTitle, margin, y);
      y += wrappedTitle.length * 4;
      if (y > 270) newPage();
    }
    bump(4);
  }

  // Upcoming tasks (next 5 pending with due dates)
  const upcoming = client.checklist
    .filter(i => !i.completed && i.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5);
  if (upcoming.length > 0) {
    if (y > 240) newPage();
    line('Next Steps', 13, 'bold');
    bump(5);
    for (const item of upcoming) {
      const formattedDue = new Date(item.dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const taskText = `○ ${item.title} — Due ${formattedDue}`;
      const wrappedTask = doc.splitTextToSize(taskText, pageWidth - margin * 2);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#1f2937');
      doc.text(wrappedTask, margin, y);
      y += wrappedTask.length * 4;
      if (y > 270) newPage();
    }
    bump(4);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor('#9ca3af');
  doc.text(`Generated by Embark · ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

  doc.save(`${client.name.replace(/[^a-z0-9]/gi, '-')}-onboarding-status.pdf`);
}
