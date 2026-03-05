export interface Service {
  id: string;
  name: string;
  order: number;
}

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  editedAt?: string;
}

// File Attachments
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;        // Base64 for files <1MB
  externalUrl?: string;    // URL for larger files
  uploadedAt: string;
}

// Communication Log
export type CommunicationType = 'email' | 'call' | 'meeting' | 'note';

export interface CommunicationLogEntry {
  id: string;
  type: CommunicationType;
  subject: string;
  content: string;
  participants?: string[];
  duration?: number;       // Minutes
  timestamp: string;
  followUpDate?: string;   // ISO date for follow-up reminder
  linkedTaskId?: string;   // Links to a checklist item
  followUpResolved?: boolean; // Mark follow-up as done
  source?: 'internal' | 'client-portal';
}

// Milestones
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  completedAt?: string;
  order: number;
  color?: string;
}

// Custom Fields
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[];      // For select type
  required?: boolean;
  order: number;
  createdAt: string;
}

// Notes Templates
export interface NotesTemplate {
  id: string;
  name: string;
  content: string;         // Supports {{variable}} syntax
  category?: string;
  createdAt: string;
}

// Email Templates
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;            // Supports {{variable}} syntax
  category?: 'welcome' | 'followup' | 'update' | 'reminder' | 'custom';
  createdAt: string;
}

// AI Buds (Agents)
export type BudType = 'status-reporter' | 'project-manager' | 'standup-manager' | 'priorities-manager' | 'custom';

export interface Bud {
  id: string;
  name: string;
  type: BudType;
  description: string;
  systemPrompt: string;
  icon: string;            // Emoji or icon identifier
  color: string;           // Gradient or color
  assignedClientIds?: string[];  // Clients this Bud is assigned to
  createdAt: string;
}

export interface BudMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface BudConversation {
  id: string;
  budId: string;
  clientId?: string;       // Optional - for client-specific conversations
  messages: BudMessage[];
  createdAt: string;
  updatedAt: string;
}

// Task Groups (Custom Tables)
export interface TaskGroup {
  id: string;
  name: string;
  order: number;
  color?: string;
  isDefault?: boolean;     // Cannot be deleted
}

// Onboarding Phases
export interface OnboardingPhase {
  id: string;
  name: string;
  description?: string;
  color: string;        // tailwind bg color key e.g. 'bg-blue-500'
  order: number;
  completedAt?: string; // ISO — set when all tasks in phase are done
}

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export interface TimeEntry {
  id: string;
  userId: string;
  duration: number; // minutes
  note?: string;
  billable: boolean;
  loggedAt: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  order: number;
  startDate?: string;
  dependsOn?: string[]; // IDs of tasks this depends on
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: string;
  subtasks?: Subtask[];
  comments?: Comment[];
  groupId?: string;      // Task group this item belongs to
  phaseId?: string;      // Links item to an OnboardingPhase
  ownerType?: 'internal' | 'client';  // default: 'internal'
  isBlocked?: boolean;
  blockedBy?: 'client' | 'internal' | 'external';
  blockReason?: string;
  status?: TaskStatus;   // Explicit kanban status (derived via getEffectiveStatus when absent)
  timeEntries?: TimeEntry[];
  attachments?: FileAttachment[];
  priority?: Priority;
}

export type Priority = 'high' | 'medium' | 'low' | 'none';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ActivityLogEntry {
  id: string;
  type: 'created' | 'status_changed' | 'task_completed' | 'task_added' | 'note_updated'
      | 'priority_changed' | 'tag_added' | 'tag_removed' | 'archived' | 'restored' | 'duplicated'
      | 'attachment_added' | 'attachment_removed' | 'communication_logged'
      | 'milestone_added' | 'milestone_completed' | 'milestone_updated' | 'custom_field_updated'
      | 'phase_advanced' | 'client_graduated' | 'task_blocked' | 'task_unblocked';
  description: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

// Client Assignment - links team members to clients with specific roles
export interface ClientAssignment {
  memberId: string;          // Team member ID
  roleId: string;            // Assignment role ID (e.g., "delivery-lead")
  assignedAt: string;        // When they were assigned
  isPrimary?: boolean;       // Primary contact for this client
}

// Client Contact - individual people at the client organization
export interface ClientContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;            // e.g., "CTO", "Project Manager", "VP of Engineering"
  isPrimary?: boolean;       // Main point of contact
  notes?: string;
  createdAt: string;
}

// Client Note - timestamped note entries for clients
export interface ClientNote {
  id: string;
  content: string;
  isPinned?: boolean;
  linkedDate?: string;       // Optional link to a planner date (YYYY-MM-DD)
  createdAt: string;
  updatedAt?: string;
}

// Assignment Role - customizable roles for client assignments
export interface AssignmentRole {
  id: string;
  name: string;              // e.g., "Delivery Lead", "Account Manager"
  description?: string;
  color?: string;
  order: number;
  isDefault?: boolean;       // Show by default when creating clients
}

export type LifecycleStage = 'onboarding' | 'active-client' | 'at-risk' | 'churned';

export interface AccountInfo {
  mrr?: number;                // Monthly recurring revenue in cents (integer)
  contractValue?: number;      // Total contract value in cents
  contractStartDate?: string;  // ISO date
  renewalDate?: string;        // ISO date — drives renewal alerts
  billingCycle?: 'monthly' | 'quarterly' | 'annual';
  industry?: string;
  website?: string;
  npsScore?: number;           // 0–10
}

export interface Client {
  id: string;
  name: string;
  email: string;                         // Legacy field - kept for backwards compatibility
  phone: string;                         // Legacy field - kept for backwards compatibility
  contacts?: ClientContact[];            // New multi-contact system
  assignedTo: string;                    // Legacy field - kept for backwards compatibility
  assignments?: ClientAssignment[];      // New multi-assignee system
  services: Service[];
  checklist: ChecklistItem[];
  notes: string;                         // Legacy field - kept for backwards compatibility
  clientNotes?: ClientNote[];            // New timestamped notes system
  createdAt: string;
  status: 'active' | 'completed' | 'on-hold';
  priority: Priority;
  tags: string[]; // Tag IDs
  activityLog: ActivityLogEntry[];
  archived?: boolean;
  archivedAt?: string;
  // New feature fields
  attachments?: FileAttachment[];
  communicationLog?: CommunicationLogEntry[];
  milestones?: Milestone[];
  customFields?: Record<string, unknown>;
  taskGroups?: TaskGroup[];
  lifecycleStage?: LifecycleStage;
  account?: AccountInfo;
  phases?: OnboardingPhase[];
  targetGoLiveDate?: string; // ISO date YYYY-MM-DD
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: { title: string; dueOffsetDays?: number; phaseId?: string }[];
  createdAt: string;
}

export type ClientFormData = Omit<Client, 'id' | 'createdAt' | 'services' | 'checklist' | 'notes' | 'activityLog' | 'tags'> & {
  assignments?: ClientAssignment[];
  contacts?: ClientContact[];
};

export type View = 'dashboard' | 'clients' | 'templates' | 'tasks' | 'board' | 'planner' | 'notes' | 'ai' | 'marketplace' | 'team' | 'automations' | 'hall-of-heroes' | 'reports' | 'integrations' | 'focus' | 'forms';

// Calendar Integration
export type CalendarProvider = 'google' | 'microsoft';

export interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  email: string;
  connected: boolean;
  connectedAt: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  attendees?: string[];
  clientId?: string;        // Link to a client
  meetingNotes?: string;
  color?: string;
  provider: CalendarProvider;
  externalId?: string;      // ID from the calendar provider
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  clientId?: string;
  taskId?: string;
  color?: string;
  notes?: string;
  createdAt: string;
}

// Daily Planner Types
export interface DailyEntry {
  id: string;
  date: string;                    // YYYY-MM-DD format
  journalContent: string;          // Free-form notes
  dailyGoals: DailyGoal[];         // Day-specific checklist
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoal {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

// AI Chat (General)
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export type ClientView = 'cards' | 'table' | 'kanban' | 'timeline' | 'gantt' | 'calendar';

// Automation types
export type AutomationTrigger =
  | 'client_created'
  | 'status_changed'
  | 'task_completed'
  | 'all_tasks_completed'
  | 'priority_changed'
  | 'tag_added';

export type AutomationActionType =
  | 'change_status'
  | 'change_priority'
  | 'add_tag'
  | 'add_task'
  | 'apply_template'
  | 'send_notification';

export interface AutomationCondition {
  field: 'status' | 'priority' | 'has_tag' | 'task_count' | 'completed_percentage';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface AutomationAction {
  type: AutomationActionType;
  value: string; // The value depends on the action type
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  action: AutomationAction;
  createdAt: string;
}

// ============ TEAM COLLABORATION ============

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  color: string;
  jobTitle?: string;
  phone?: string;
  hourlyRate?: number;
  createdAt: string;
  lastActiveAt?: string;
}

export interface TeamSettings {
  teamName: string;
  members: TeamMember[];
}

// Multi-team support
export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: string;
}

// ============ NOTIFICATIONS ============

export type NotificationType =
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_assigned'
  | 'task_completed'
  | 'milestone_reached'
  | 'client_completed'
  | 'client_created'
  | 'mention'
  | 'automation'
  | 'system'
  | 'contract_renewal'
  | 'portal_task_completed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  expiresAt?: string;
  clientId?: string;
  taskId?: string;
  triggeredBy?: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  taskDueSoon: boolean;
  taskDueSoonDays: number;
  taskOverdue: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  milestoneReached: boolean;
  clientCompleted: boolean;
  mentions: boolean;
  automations: boolean;
  contractRenewal: boolean;
  contractRenewalDays: number[];
  playSound: boolean;
  showBadge: boolean;
}

// ============ AI PROVIDER ============

export type AIProvider = 'anthropic' | 'ollama';

export interface AISettings {
  provider: AIProvider;
  anthropicApiKey?: string;
  anthropicModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  enableTools: boolean;
  maxTokens: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

// ===== Gamification =====

export type CharacterClass = 'paladin' | 'wizard' | 'ranger' | 'rogue';

export type DeedId =
  | 'journey_begins' | 'first_blood' | 'milestone_maker' | 'quest_complete'
  | 'legendary' | 'ascended'
  | 'swift_justice' | 'dead_eye' | 'speed_runner' | 'triple_crown'
  | 'perfectionist' | 'dungeon_crawler'
  | 'on_a_roll' | 'centurion' | 'war_veteran' | 'dragon_slayer'
  | 'guild_master' | 'the_oracle'
  | 'iron_will' | 'unstoppable' | 'the_planner' | 'dawn_patrol' | 'night_owl'
  | 'fellowship' | 'the_tactician' | 'scribe' | 'town_crier' | 'lorekeeper';

export interface DeedDefinition {
  id: DeedId;
  name: string;
  icon: string;
  description: string;
  flavor: string;
  category: 'progression' | 'speed' | 'volume' | 'consistency' | 'teamwork';
}

export interface MemberGamificationStats {
  tasksCompleted: number;
  tasksOnTime: number;
  clientsGraduated: number;
  clientsGraduatedPerfect: number;
  clientFirstActiveDates: Record<string, string>;
  milestonesCompleted: number;
  communicationsLogged: number;
  customFieldsFilled: number;
  plannerDaysUsed: string[];
  taskCompletionDatetimes: string[];
  uniqueAssigneesUsed: string[];
  automationRulesCreated: number;
  peakActiveClientsCount: number;
  weeklyClientGraduations: Record<string, number>;
}

export interface MemberGamificationState {
  memberId: string;
  displayName: string;
  characterClass: CharacterClass | null;
  totalXP: number;
  weeklyXP: number;
  weekStartDate: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  unlockedDeeds: DeedId[];
  stats: MemberGamificationStats;
}

export interface GamificationEvent {
  id: string;
  type: 'xp_gained' | 'level_up' | 'deed_unlocked' | 'quest_complete';
  memberId: string;
  xpGained?: number;
  previousLevel?: number;
  newLevel?: number;
  newTitle?: string;
  deed?: DeedDefinition;
  clientName?: string;
  totalXP?: number;
  createdAt: string;
}

export interface GamificationStore {
  members: Record<string, MemberGamificationState>;
  currentPlayerId: string;
  pendingEvents: GamificationEvent[];
}

// ===== Auth =====

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  phone?: string;
  passwordHash: string;       // btoa(password) — obfuscation only; swap for bcrypt on backend
  avatarUrl?: string;         // base64 data URL
  teamId?: string;
  characterClass?: CharacterClass;
  dashboardConfig?: DashboardWidgetConfig;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  expiresAt: string;          // ISO date, 30 days from login
}

export interface DashboardWidgetConfig {
  visibleWidgets: DashboardWidgetId[];
}

export type DashboardWidgetId =
  | 'stats-bar' | 'client-health' | 'tasks-overview' | 'priority-breakdown'
  | 'team-workload' | 'activity-feed' | 'onboarding-trend' | 'renewals'
  | 'recent-clients' | 'sla-status' | 'crm-panel' | 'blocked-tasks' | 'go-live-dates'
  | 'ai-portfolio-brief' | 'time-report' | 'health-trends';

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = [
  'stats-bar', 'client-health', 'tasks-overview', 'activity-feed', 'recent-clients', 'renewals',
];

// ============ SMART INTAKE FORMS ============

export type FormFieldType = 'text' | 'email' | 'phone' | 'dropdown' | 'date' | 'textarea' | 'checkbox-group' | 'file';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
  mapsTo?: string;
  placeholder?: string;
  order: number;
  showIf?: { fieldId: string; value: string };
}

export interface OnboardingForm {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  linkedTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  clientId: string;
  submittedAt: string;
  data: Record<string, unknown>;
}
