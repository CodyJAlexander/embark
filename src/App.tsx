import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGate } from './components/Auth/AuthGate';
import { FormRoute } from './components/Forms/FormRoute';
import { ClientProvider, useClientContext } from './context/ClientContext';
import { ToastProvider } from './components/UI/Toast';
import { UndoRedoProvider } from './context/UndoRedoContext';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { FloatingActionButton } from './components/UI/FloatingActionButton';
import { CommandPalette } from './components/UI/CommandPalette';
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard';
import { NewUserWizard } from './components/Onboarding/NewUserWizard';
import { useAuth } from './context/AuthContext';
import { GamificationOverlay } from './components/Gamification/GamificationOverlay';
import { usePreferences } from './hooks/usePreferences';
import { useWeeklyDigest } from './hooks/useWeeklyDigest';
import { useGamificationContext } from './context/GamificationContext';
import { WeeklyDigestModal } from './components/Dashboard/WeeklyDigestModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { MorningBriefing } from './components/Focus/MorningBriefing';
import { ClientPortalView } from './components/Portal/ClientPortalView';
import { NPSSurveyView } from './components/Survey/NPSSurveyView';
import type { View, Client } from './types';
import { useSLAStatuses } from './hooks/useSLA';
import { useAnomalyDetection } from './hooks/useAnomalyDetection';
import { emit } from './events/appEvents';
import { useWebhooks } from './hooks/useWebhooks';
import { initWebhookDelivery } from './services/webhookDelivery';

// Lazy-loaded views — only downloaded when first visited
const ClientList = lazy(() => import('./components/Clients/ClientList').then(m => ({ default: m.ClientList })));
const TemplateList = lazy(() => import('./components/Templates/TemplateList').then(m => ({ default: m.TemplateList })));
const TasksView = lazy(() => import('./components/Views/TasksView').then(m => ({ default: m.TasksView })));
const PlannerView = lazy(() => import('./components/Planner/PlannerView').then(m => ({ default: m.PlannerView })));
const NotesView = lazy(() => import('./components/Notes/NotesView').then(m => ({ default: m.NotesView })));
const AICenter = lazy(() => import('./components/AI/AICenter').then(m => ({ default: m.AICenter })));
const TeamManager = lazy(() => import('./components/Team/TeamManager').then(m => ({ default: m.TeamManager })));
const AutomationManager = lazy(() => import('./components/Automations/AutomationManager').then(m => ({ default: m.AutomationManager })));
const HallOfHeroes = lazy(() => import('./components/Gamification/HallOfHeroes').then(m => ({ default: m.HallOfHeroes })));
const ReportView = lazy(() => import('./components/Reports/ReportView').then(m => ({ default: m.ReportView })));
const IntegrationsView = lazy(() => import('./components/Integrations/IntegrationsView').then(m => ({ default: m.IntegrationsView })));
const FocusView = lazy(() => import('./components/Focus/FocusView').then(m => ({ default: m.FocusView })));
const GlobalTaskKanban = lazy(() => import('./components/Views/GlobalTaskKanban'));
const FormsView = lazy(() => import('./components/Forms/FormsView').then(m => ({ default: m.FormsView })));
const RenewalPipelineView = lazy(() => import('./components/Views/RenewalPipelineView').then(m => ({ default: m.RenewalPipelineView })));

function AnomalyDetector({ clients }: { clients: Client[] }) {
  useAnomalyDetection(clients);
  return null;
}

function SLAMonitor({ clients }: { clients: Client[] }) {
  const slaStatuses = useSLAStatuses(clients);
  const prevRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentBreached = new Set<string>();
    const currentWarning = new Set<string>();

    for (const s of slaStatuses) {
      const key = `${s.clientId}:${s.slaId}`;
      if (s.status === 'breached') currentBreached.add(key);
      if (s.status === 'warning') currentWarning.add(key);
    }

    // Only emit for newly breached (not already in previous snapshot)
    for (const s of slaStatuses) {
      const key = `${s.clientId}:${s.slaId}`;
      if (s.status === 'breached' && !prevRef.current.has(`breached:${key}`)) {
        const client = clients.find(c => c.id === s.clientId);
        if (client) {
          emit({ type: 'sla_breached', clientId: s.clientId, clientName: client.name, slaType: s.slaType, daysOverdue: s.daysOverdue, timestamp: new Date().toISOString() });
        }
      }
      if (s.status === 'warning' && !prevRef.current.has(`warning:${key}`)) {
        const client = clients.find(c => c.id === s.clientId);
        if (client) {
          emit({ type: 'sla_warning', clientId: s.clientId, clientName: client.name, slaType: s.slaType, percentUsed: s.percentUsed, timestamp: new Date().toISOString() });
        }
      }
    }

    // Update snapshot
    prevRef.current = new Set([
      ...Array.from(currentBreached).map(k => `breached:${k}`),
      ...Array.from(currentWarning).map(k => `warning:${k}`),
    ]);
  }, [slaStatuses, clients]);

  return null;
}

function WebhookServiceInit() {
  const { endpoints, logDelivery } = useWebhooks();
  const endpointsRef = useRef(endpoints);
  const logDeliveryRef = useRef(logDelivery);

  useEffect(() => { endpointsRef.current = endpoints; }, [endpoints]);
  useEffect(() => { logDeliveryRef.current = logDelivery; }, [logDelivery]);

  useEffect(() => {
    return initWebhookDelivery(
      () => endpointsRef.current,
      (d) => logDeliveryRef.current(d)
    );
  }, []);

  return null;
}

function SurveyRoute({ children }: { children: ReactNode }) {
  const [surveyClientId] = useState<string | null>(() => {
    const match = window.location.hash.match(/^#survey\/(.+)$/);
    return match ? match[1] : null;
  });

  if (surveyClientId) {
    return <NPSSurveyView clientId={surveyClientId} />;
  }
  return <>{children}</>;
}

function PortalRoute({ children }: { children: ReactNode }) {
  const [portalClientId] = useState<string | null>(() => {
    const match = window.location.hash.match(/^#portal\/(.+)$/);
    return match ? match[1] : null;
  });
  const { clients } = useClientContext();

  if (portalClientId) {
    const client = clients.find(c => c.id === portalClientId);
    if (client) return <ClientPortalView client={client} />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { clients, setClientsDirectly } = useClientContext();
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [triggerAddClient, setTriggerAddClient] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { preferences, setLastDigestShown } = usePreferences();
  const { getCurrentPlayerState } = useGamificationContext();
  const [digestOpen, setDigestOpen] = useState(false);

  const digest = useWeeklyDigest(clients, getCurrentPlayerState().weeklyXP);

  // Auto-show digest once per week (on first visit after 7 days since last shown)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastShown = preferences.lastDigestShown;
    if (!lastShown || (new Date(today).getTime() - new Date(lastShown).getTime()) >= 7 * 86400000) {
      const timer = setTimeout(() => setDigestOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []); // intentionally empty — only check on mount

  const handleCloseDigest = useCallback(() => {
    setDigestOpen(false);
    setLastDigestShown(new Date().toISOString().split('T')[0]);
  }, [setLastDigestShown]);

  // Keyboard shortcut for command palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'd', handler: () => setCurrentView('dashboard') },
    { key: 'c', handler: () => setCurrentView('clients') },
    { key: 't', handler: () => setCurrentView('tasks') },
    { key: 'b', handler: () => setCurrentView('board') },
    { key: 'p', handler: () => setCurrentView('planner') },
    { key: 'h', handler: () => setCurrentView('hall-of-heroes') },
    { key: 'r', handler: () => setCurrentView('reports') },
    { key: 'a', handler: () => setCurrentView('automations') },
    { key: 'n', shift: true, handler: () => setCurrentView('notes') },
    { key: 't', shift: true, handler: () => setCurrentView('team') },
  ]);

  // Listen for navigation events from deep components (e.g. EmailImportPanel)
  useEffect(() => {
    const handler = (e: Event) => {
      const view = (e as CustomEvent<{ view: View }>).detail?.view;
      if (view) setCurrentView(view);
    };
    window.addEventListener('embark:navigate', handler);
    return () => window.removeEventListener('embark:navigate', handler);
  }, []);

  const handleSelectClient = useCallback((client: Client) => {
    setSelectedClientId(client.id);
    setCurrentView('clients');
  }, []);

  const handleClearSelectedClient = useCallback(() => {
    setSelectedClientId(null);
  }, []);

  const handleAddClient = useCallback(() => {
    setTriggerAddClient(true);
    setCurrentView('clients');
  }, []);

  const handleAddClientTriggered = useCallback(() => {
    setTriggerAddClient(false);
  }, []);

  const handleNavigateToTemplates = useCallback(() => {
    setCurrentView('templates');
  }, []);

  return (
    <UndoRedoProvider clients={clients} onRestore={setClientsDirectly}>
      <Layout currentView={currentView} onViewChange={setCurrentView} onSelectClient={handleSelectClient}>
        {currentView === 'dashboard' && (
          <Dashboard onNavigate={setCurrentView} onOpenDigest={() => setDigestOpen(true)} onSelectClient={handleSelectClient} />
        )}
        <div key={currentView} className="animate-view-enter">
          <Suspense fallback={<ViewLoader />}>
            {currentView === 'clients' && (
              <ClientList
                initialSelectedClientId={selectedClientId}
                onClearInitialSelection={handleClearSelectedClient}
                triggerAddClient={triggerAddClient}
                onAddClientTriggered={handleAddClientTriggered}
              />
            )}
            {currentView === 'tasks' && <TasksView />}
            {currentView === 'board' && <GlobalTaskKanban />}
            {currentView === 'forms' && <FormsView />}
            {currentView === 'planner' && <PlannerView />}
            {currentView === 'notes' && <NotesView />}
            {currentView === 'templates' && <TemplateList />}
            {currentView === 'ai' && <AICenter />}
            {currentView === 'team' && <TeamManager />}
            {currentView === 'automations' && <AutomationManager />}
            {currentView === 'hall-of-heroes' && <HallOfHeroes />}
            {currentView === 'reports' && <ReportView />}
            {currentView === 'integrations' && <IntegrationsView />}
            {currentView === 'focus' && <FocusView onSelectClient={handleSelectClient} />}
            {currentView === 'renewals' && <RenewalPipelineView />}
          </Suspense>
        </div>
        <FloatingActionButton onAddClient={handleAddClient} />
      </Layout>
      <OnboardingWizard
        onComplete={() => {}}
        onAddClient={handleAddClient}
        onNavigateToTemplates={handleNavigateToTemplates}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setCurrentView}
        onSelectClient={handleSelectClient}
        onAddClient={handleAddClient}
      />
      <GamificationOverlay />
      {currentUser && !currentUser.onboardingComplete && <NewUserWizard />}
      {digestOpen && <WeeklyDigestModal digest={digest} onClose={handleCloseDigest} />}
      <SLAMonitor clients={clients} />
      <AnomalyDetector clients={clients} />
      <WebhookServiceInit />
      <MorningBriefing />
    </UndoRedoProvider>
  );
}

function ViewLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 bg-yellow-400 clip-burst deco-spin" />
      <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-display">
        Loading…
      </p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <ClientProvider>
              <FormRoute>
                <SurveyRoute>
                  <PortalRoute>
                    <AuthGate>
                      <AppContent />
                    </AuthGate>
                  </PortalRoute>
                </SurveyRoute>
              </FormRoute>
            </ClientProvider>
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
