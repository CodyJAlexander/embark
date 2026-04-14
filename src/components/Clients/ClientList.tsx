import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Client, ClientView, Priority, LifecycleStage } from '../../types';
import { useClientContext } from '../../context/ClientContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSavedViews } from '../../hooks/useSavedViews';
import type { SavedView } from '../../hooks/useSavedViews';
import { useSegments } from '../../hooks/useSegments';
import { ClientCard } from './ClientCard';
import { ClientDetail } from './ClientDetail';
import { IntakeWizard } from './IntakeWizard/IntakeWizard';
import { FilterBuilder, createEmptyFilterSet } from './FilterBuilder';
import type { FilterSet } from './FilterBuilder';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { BulkActionsBar } from '../UI/BulkActionsBar';
import { KeyboardShortcutsHelp } from '../UI/KeyboardShortcutsHelp';
import { SavedViewsManager } from '../UI/SavedViewsManager';
import { ViewSwitcher } from '../Views/ViewSwitcher';
import { TableView } from '../Views/TableView';
import { KanbanBoard } from '../Views/KanbanBoard';
import { TimelineView } from '../Views/TimelineView';
import { GanttView } from '../Views/GanttView';
import { CalendarView } from '../Views/CalendarView';
import { exportClientsToCSV, exportOnboardingStatusReport } from '../../utils/export';
import { filterClients } from '../../utils/filterClients';
import { useHealthHistory } from '../../hooks/useHealthHistory';
import { CSVImporter } from './CSVImporter';
import { useContextMenu } from '../../hooks/useContextMenu';
import { ContextMenu } from '../UI/ContextMenu';
import type { ContextMenuItem } from '../UI/ContextMenu';
import { generateId } from '../../utils/helpers';

// ---------------------------------------------------------------------------
// Quick segment presets
// ---------------------------------------------------------------------------
const QUICK_SEGMENTS: { label: string; title: string; filterSet: () => FilterSet }[] = [
  {
    label: 'At Risk Renewals',
    title: 'Health < 60 and renewal within 90 days',
    filterSet: () => ({
      id: generateId(),
      name: 'At Risk Renewals',
      logic: 'AND',
      conditions: [
        { id: generateId(), field: 'health', operator: 'less_than', value: '60' },
        { id: generateId(), field: 'goLiveProximity', operator: 'less_than', value: '90' },
      ],
    }),
  },
  {
    label: 'Stalled Onboardings',
    title: 'No activity for 14+ days and status is active',
    filterSet: () => ({
      id: generateId(),
      name: 'Stalled Onboardings',
      logic: 'AND',
      conditions: [
        { id: generateId(), field: 'lastContact', operator: 'greater_than', value: '14' },
        { id: generateId(), field: 'status', operator: 'equals', value: 'active' },
      ],
    }),
  },
  {
    label: 'High Value, Low Health',
    title: 'MRR > $1,000 and health score < 60',
    filterSet: () => ({
      id: generateId(),
      name: 'High Value, Low Health',
      logic: 'AND',
      conditions: [
        { id: generateId(), field: 'mrr', operator: 'greater_than', value: '1000' },
        { id: generateId(), field: 'health', operator: 'less_than', value: '60' },
      ],
    }),
  },
];

interface ClientListProps {
  initialSelectedClientId?: string | null;
  onClearInitialSelection?: () => void;
  triggerAddClient?: boolean;
  onAddClientTriggered?: () => void;
  lockedLifecycleFilter?: LifecycleStage;
  onNavigateAll?: () => void;
}

export function ClientList({
  initialSelectedClientId,
  onClearInitialSelection,
  triggerAddClient,
  onAddClientTriggered,
  lockedLifecycleFilter,
  onNavigateAll,
}: ClientListProps) {
  const { clients, bulkUpdateStatus, bulkUpdatePriority, bulkArchive, bulkDelete, bulkRestore, archiveClient, deleteClient, duplicateClient, updateStatus, updatePriority } = useClientContext();
  const { getHistory, getTrend, getDelta } = useHealthHistory(clients);
  const contextMenu = useContextMenu();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleStage | 'all'>(lockedLifecycleFilter ?? 'all');
  const [currentView, setCurrentView] = useState<ClientView>('cards');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterSet>(createEmptyFilterSet);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { savedViews, pinnedViews, defaultView, saveView, deleteView, pinView, setDefaultView } = useSavedViews();
  const { segments, saveSegment, deleteSegment: _deleteSegment } = useSegments();

  // Apply default view on first mount only
  useEffect(() => {
    if (defaultView) {
      setSearchQuery(defaultView.filters.searchQuery);
      setStatusFilter(defaultView.filters.statusFilter);
      setAssigneeFilter(defaultView.filters.assigneeFilter);
      setLifecycleFilter((defaultView.filters as { lifecycleFilter?: LifecycleStage | 'all' }).lifecycleFilter ?? 'all');
      setCurrentView(defaultView.view);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeClients = useMemo(() => clients.filter((c) => !c.archived), [clients]);
  const archivedClients = useMemo(() => clients.filter((c) => c.archived), [clients]);
  const displayClients = showArchived ? archivedClients : activeClients;

  // Handle initial selection from global search
  useEffect(() => {
    if (initialSelectedClientId) {
      const client = clients.find((c) => c.id === initialSelectedClientId);
      if (client) {
        setSelectedClient(client);
        onClearInitialSelection?.();
      }
    }
  }, [initialSelectedClientId, clients, onClearInitialSelection]);

  // Handle trigger to open add client form from FAB
  useEffect(() => {
    if (triggerAddClient) {
      setIsFormOpen(true);
      onAddClientTriggered?.();
    }
  }, [triggerAddClient, onAddClientTriggered]);

  const assignees = useMemo(() => {
    const unique = [...new Set(displayClients.map((c) => c.assignedTo))];
    return unique.sort();
  }, [displayClients]);

  const filteredClients = useMemo(() => {
    const baseFiltered = displayClients.filter((client) => {
      const matchesSearch =
        searchQuery === '' ||
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesAssignee = assigneeFilter === 'all' || client.assignedTo === assigneeFilter;
      const matchesLifecycle = lifecycleFilter === 'all' ||
        (client.lifecycleStage ?? 'onboarding') === lifecycleFilter;

      return matchesSearch && matchesStatus && matchesAssignee && matchesLifecycle;
    });
    return filterClients(baseFiltered, activeFilters);
  }, [displayClients, searchQuery, statusFilter, assigneeFilter, lifecycleFilter, activeFilters]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      handler: () => !showArchived && setIsFormOpen(true),
      description: 'Add new client',
    },
    {
      key: '/',
      handler: () => searchInputRef.current?.focus(),
      description: 'Focus search',
    },
    {
      key: 'Escape',
      handler: () => {
        if (isFormOpen) setIsFormOpen(false);
        else if (showShortcutsHelp) setShowShortcutsHelp(false);
        else if (selectedIds.size > 0) setSelectedIds(new Set());
      },
      description: 'Close modal / Cancel',
    },
    {
      key: '?',
      shift: true,
      handler: () => setShowShortcutsHelp(true),
      description: 'Show shortcuts help',
    },
    {
      key: 'a',
      ctrl: true,
      handler: () => setSelectedIds(new Set(filteredClients.map((c) => c.id))),
      description: 'Select all clients',
    },
    {
      key: '1',
      handler: () => setCurrentView('cards'),
      description: 'Card view',
    },
    {
      key: '2',
      handler: () => setCurrentView('table'),
      description: 'Table view',
    },
    {
      key: '3',
      handler: () => setCurrentView('kanban'),
      description: 'Board view',
    },
    {
      key: '4',
      handler: () => setCurrentView('timeline'),
      description: 'Timeline view',
    },
    {
      key: '5',
      handler: () => setCurrentView('gantt'),
      description: 'Gantt view',
    },
    {
      key: '6',
      handler: () => setCurrentView('calendar'),
      description: 'Calendar view',
    },
  ], !selectedClient);

  // Clear selection when filters change
  const handleFilterChange = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Selection handlers
  const toggleSelection = useCallback((clientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredClients.map((c) => c.id)));
  }, [filteredClients]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectClient = useCallback((client: Client) => {
    if (selectedIds.size > 0) {
      // In selection mode, toggle selection
      toggleSelection(client.id);
    } else {
      setSelectedClient(client);
    }
  }, [selectedIds, toggleSelection]);

  const handleCloseDetail = useCallback(() => {
    setSelectedClient(null);
  }, []);

  const handleExport = useCallback(() => {
    exportClientsToCSV(clients);
  }, [clients]);

  const handleStatusReport = useCallback(() => {
    exportOnboardingStatusReport(clients);
  }, [clients]);

  const buildContextMenuItems = (client: Client): ContextMenuItem[] => [
    {
      label: 'Open',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
      onClick: () => handleSelectClient(client),
    },
    {
      label: 'Copy Portal URL',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      onClick: () => {
        const url = `${window.location.origin}${window.location.pathname}#portal/${client.id}`;
        navigator.clipboard.writeText(url);
      },
    },
    {
      label: 'Duplicate',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>,
      onClick: () => duplicateClient(client.id),
      dividerBefore: true,
    },
    {
      label: client.status === 'active' ? 'Mark Completed' : 'Mark Active',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      onClick: () => updateStatus(client.id, client.status === 'active' ? 'completed' : 'active'),
    },
    {
      label: 'Set High Priority',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
      onClick: () => updatePriority(client.id, 'high'),
    },
    {
      label: 'Archive',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
      onClick: () => archiveClient(client.id),
      dividerBefore: true,
    },
    {
      label: 'Delete',
      icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
      onClick: () => deleteClient(client.id),
      danger: true,
    },
  ];

  // Bulk action handlers
  const handleBulkStatusChange = useCallback((status: Client['status']) => {
    bulkUpdateStatus(Array.from(selectedIds), status);
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdateStatus]);

  const handleBulkPriorityChange = useCallback((priority: Priority) => {
    bulkUpdatePriority(Array.from(selectedIds), priority);
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdatePriority]);

  const handleBulkArchive = useCallback(() => {
    if (showArchived) {
      bulkRestore(Array.from(selectedIds));
    } else {
      bulkArchive(Array.from(selectedIds));
    }
    setSelectedIds(new Set());
  }, [selectedIds, showArchived, bulkArchive, bulkRestore]);

  const handleBulkDelete = useCallback(() => {
    bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, bulkDelete]);

  // Saved views handlers
  const handleSaveView = useCallback((name: string, emoji?: string) => {
    saveView(name, { statusFilter, assigneeFilter, searchQuery, lifecycleFilter } as Parameters<typeof saveView>[1], currentView, emoji);
  }, [saveView, statusFilter, assigneeFilter, searchQuery, lifecycleFilter, currentView]);

  const handleLoadView = useCallback((view: SavedView) => {
    setStatusFilter(view.filters.statusFilter);
    setAssigneeFilter(view.filters.assigneeFilter);
    setSearchQuery(view.filters.searchQuery);
    setLifecycleFilter((view.filters as { lifecycleFilter?: LifecycleStage | 'all' }).lifecycleFilter ?? 'all');
    setCurrentView(view.view);
    setSelectedIds(new Set());
  }, []);

  const handleDeleteView = useCallback((id: string) => {
    deleteView(id);
  }, [deleteView]);

  if (selectedClient) {
    const currentClient = clients.find((c) => c.id === selectedClient.id);
    if (currentClient) {
      return <ClientDetail client={currentClient} onBack={handleCloseDetail} />;
    }
  }

  const renderView = () => {
    if (displayClients.length === 0) {
      if (showArchived) {
        return (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              No archived clients
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Archived clients will appear here.
            </p>
            <Button variant="secondary" onClick={() => setShowArchived(false)} className="mt-6">
              View Active Clients
            </Button>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative w-28 h-28 flex-shrink-0">
            <div className="absolute inset-0 bg-yellow-400 clip-burst deco-float" />
            <div className="absolute inset-[14px] bg-zinc-900 dark:bg-white clip-hex deco-float-1" />
            <div className="absolute inset-[28px] bg-yellow-400 clip-diamond" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display text-2xl font-black text-zinc-900 dark:text-white">No clients yet</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Your roster is empty. Let's fix that.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-2 bg-yellow-400 text-zinc-900 font-black text-sm rounded-[4px] border-2 border-zinc-900 shadow-[3px_3px_0_0_#18181b] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            + Add First Client
          </button>
        </div>
      );
    }

    if (filteredClients.length === 0) {
      return (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            No matching clients
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setAssigneeFilter('all');
              setLifecycleFilter('all');
              setActiveFilters(createEmptyFilterSet());
              setShowFilterBuilder(false);
              handleFilterChange();
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      );
    }

    switch (currentView) {
      case 'table':
        return (
          <TableView
            clients={filteredClients}
            onSelectClient={handleSelectClient}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            selectionMode={selectedIds.size > 0}
          />
        );
      case 'kanban':
        return <KanbanBoard clients={filteredClients} onSelectClient={handleSelectClient} />;
      case 'timeline':
        return <TimelineView clients={filteredClients} onSelectClient={handleSelectClient} />;
      case 'gantt':
        return <GanttView clients={filteredClients} onClientClick={handleSelectClient} />;
      case 'calendar':
        return <CalendarView clients={filteredClients} onClientClick={handleSelectClient} />;
      case 'cards':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onSelect={handleSelectClient}
                isSelected={selectedIds.has(client.id)}
                onToggleSelect={toggleSelection}
                selectionMode={selectedIds.size > 0}
                sparklineSnapshots={getHistory(client.id)}
                sparklineTrend={getTrend(client.id)}
                sparklineDelta={getDelta(client.id)}
                onContextMenu={(e, c) => contextMenu.open(e, c.id)}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display font-black text-gray-900 dark:text-gray-100">
              {showArchived ? 'Archived Clients' : lockedLifecycleFilter === 'onboarding' ? 'Onboarding Clients' : 'Client Onboardings'}
            </h2>
            {archivedClients.length > 0 && (
              <button
                onClick={() => { setShowArchived(!showArchived); handleFilterChange(); }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showArchived
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {showArchived ? 'View Active' : `Archive (${archivedClients.length})`}
              </button>
            )}
          </div>
          {onNavigateAll && (
            <button
              onClick={onNavigateAll}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1 mt-0.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Clients
            </button>
          )}
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredClients.length} of {displayClients.length} client{displayClients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {displayClients.length > 0 && <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />}
          {displayClients.length > 0 && (
            <>
              <Button variant="secondary" onClick={handleStatusReport} title="Export onboarding status report (Excel)">
                <svg className="w-5 h-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Status Report</span>
              </Button>
              <Button variant="secondary" onClick={handleExport} title="Export all clients to CSV">
                <svg className="w-5 h-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </Button>
            </>
          )}
          {!showArchived && (
            <>
              <Button variant="secondary" onClick={() => setShowImporter(true)} title="Import clients from CSV">
                <svg className="w-5 h-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button variant="success" tilt onClick={() => setIsFormOpen(true)}>
                <svg className="w-5 h-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {displayClients.length > 0 && (
        <>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }}
                placeholder="Search clients... (Press / to focus)"
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange(); }}
                className="appearance-none border-2 border-zinc-900 dark:border-zinc-600 shadow-[2px_2px_0_0_#18181b] rounded-[4px] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative">
              <select
                value={assigneeFilter}
                onChange={(e) => { setAssigneeFilter(e.target.value); handleFilterChange(); }}
                className="appearance-none border-2 border-zinc-900 dark:border-zinc-600 shadow-[2px_2px_0_0_#18181b] rounded-[4px] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Assignees</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {!lockedLifecycleFilter && (
              <div className="relative">
                <select
                  value={lifecycleFilter}
                  onChange={(e) => { setLifecycleFilter(e.target.value as LifecycleStage | 'all'); handleFilterChange(); }}
                  className="appearance-none border-2 border-zinc-900 dark:border-zinc-600 shadow-[2px_2px_0_0_#18181b] rounded-[4px] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="all">All Stages</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="active-client">Active Client</option>
                  <option value="at-risk">At Risk</option>
                  <option value="churned">Churned</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            )}
            <SavedViewsManager
              savedViews={savedViews}
              pinnedViews={pinnedViews}
              currentFilters={{ statusFilter, assigneeFilter, searchQuery }}
              onSaveView={handleSaveView}
              onLoadView={handleLoadView}
              onDeleteView={handleDeleteView}
              onPinView={pinView}
              onSetDefault={setDefaultView}
            />

            {/* Advanced Filter toggle */}
            <button
              onClick={() => setShowFilterBuilder((v) => !v)}
              title="Advanced filters"
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
                showFilterBuilder || activeFilters.conditions.length > 0
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <span className="hidden sm:inline">Filter</span>
              {activeFilters.conditions.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400 text-zinc-900 text-xs font-black leading-none">
                  {activeFilters.conditions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filter Builder panel */}
        {showFilterBuilder && (
          <div className="mt-3">
            <FilterBuilder
              filters={activeFilters}
              onChange={(updated) => { setActiveFilters(updated); handleFilterChange(); }}
              onSaveSegment={(name, fs) => { saveSegment(name, fs); }}
            />
          </div>
        )}

        {/* Quick Segments row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
            Quick:
          </span>
          {QUICK_SEGMENTS.map((qs) => (
            <button
              key={qs.label}
              onClick={() => {
                setActiveFilters(qs.filterSet());
                setShowFilterBuilder(true);
                handleFilterChange();
              }}
              title={qs.title}
              className={`px-3 py-1 text-xs font-bold border-2 rounded-[4px] transition-colors ${
                activeFilters.name === qs.label
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'border-zinc-300 dark:border-zinc-600 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {qs.label}
            </button>
          ))}
          {segments.length > 0 && (
            <>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-1">|</span>
              {segments.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => {
                    setActiveFilters(seg);
                    setShowFilterBuilder(true);
                    handleFilterChange();
                  }}
                  title={`Saved segment: ${seg.name}`}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold border-2 rounded-[4px] transition-colors ${
                    activeFilters.id === seg.id
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {seg.name}
                </button>
              ))}
            </>
          )}
          {activeFilters.conditions.length > 0 && (
            <button
              onClick={() => { setActiveFilters(createEmptyFilterSet()); handleFilterChange(); }}
              className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Clear advanced filters"
            >
              Clear
            </button>
          )}
        </div>

        {/* Saved view chips */}
        {savedViews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {savedViews.map((view) => (
              <button
                key={view.id}
                onClick={() => handleLoadView(view)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
              >
                {view.emoji && <span>{view.emoji}</span>}
                {view.name}
                {view.isDefault && <span className="text-yellow-500">★</span>}
              </button>
            ))}
          </div>
        )}
        </>
      )}

      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={filteredClients.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkPriorityChange={handleBulkPriorityChange}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {renderView()}

      <IntakeWizard
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Keyboard shortcuts hint */}
      <button
        onClick={() => setShowShortcutsHelp(true)}
        className="fixed bottom-4 right-4 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        title="Keyboard shortcuts"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="hidden sm:inline">Press</span>
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">?</kbd>
        <span className="hidden sm:inline">for shortcuts</span>
      </button>

      {showImporter && <CSVImporter onClose={() => setShowImporter(false)} />}

      {contextMenu.isOpen && contextMenu.position && contextMenu.targetId && (() => {
        const ctxClient = clients.find(c => c.id === contextMenu.targetId);
        return ctxClient ? (
          <ContextMenu
            position={contextMenu.position}
            items={buildContextMenuItems(ctxClient)}
            onClose={contextMenu.close}
          />
        ) : null;
      })()}
    </div>
  );
}
