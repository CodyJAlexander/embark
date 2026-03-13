import {
  pgTable, uuid, text, boolean, integer, numeric,
  timestamp, date, jsonb, primaryKey, index, uniqueIndex, AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── AUTH ────────────────────────────────────────────
export const users = pgTable('users', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  email:              text('email').unique().notNull(),
  username:           text('username').unique().notNull(),
  passwordHash:       text('password_hash').notNull(),
  role:               text('role').notNull().default('member'),
  avatarUrl:          text('avatar_url'),
  characterClass:     text('character_class'),
  teamId:             uuid('team_id'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  preferences:        jsonb('preferences').notNull().default({}),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_sessions_token_hash').on(t.tokenHash),
  index('idx_sessions_expires_at').on(t.expiresAt),
]);

// ─── CLIENTS ─────────────────────────────────────────
export const clients = pgTable('clients', {
  id:               uuid('id').primaryKey().defaultRandom(),
  name:             text('name').notNull(),
  status:           text('status').notNull().default('active'),
  lifecycleStage:   text('lifecycle_stage').notNull().default('onboarding'),
  industry:         text('industry'),
  companySize:      text('company_size'),
  website:          text('website'),
  healthScoreTotal: integer('health_score_total').notNull().default(0),
  clientData:       jsonb('client_data').notNull().default({}),
  assignedTo:       uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy:        uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_clients_status').on(t.status),
  index('idx_clients_lifecycle').on(t.lifecycleStage),
  index('idx_clients_assigned_to').on(t.assignedTo),
  index('idx_clients_health_score').on(t.healthScoreTotal),
]);

export const clientContacts = pgTable('client_contacts', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clientId:  uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  email:     text('email'),
  phone:     text('phone'),
  role:      text('role'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clientAssignments = pgTable('client_assignments', {
  id:         uuid('id').primaryKey().defaultRandom(),
  clientId:   uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:       text('role').notNull().default('member'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('uq_client_assignments').on(t.clientId, t.userId),
]);

export const accountInfo = pgTable('account_info', {
  id:            uuid('id').primaryKey().defaultRandom(),
  clientId:      uuid('client_id').unique().notNull().references(() => clients.id, { onDelete: 'cascade' }),
  mrr:           numeric('mrr', { precision: 12, scale: 2 }),
  arr:           numeric('arr', { precision: 12, scale: 2 }),
  contractValue: numeric('contract_value', { precision: 12, scale: 2 }),
  contractStart: date('contract_start'),
  contractEnd:   date('contract_end'),
  renewalDate:   date('renewal_date'),
  npsScore:      integer('nps_score'),
  paymentStatus: text('payment_status'),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customFields = pgTable('custom_fields', {
  id:       uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  key:      text('key').notNull(),
  value:    text('value'),
  type:     text('type').notNull().default('text'),
});

export const tags = pgTable('tags', {
  id:    uuid('id').primaryKey().defaultRandom(),
  name:  text('name').unique().notNull(),
  color: text('color'),
});

export const clientTags = pgTable('client_tags', {
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  tagId:    uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.clientId, t.tagId] }),
]);

// ─── TASKS & PROGRESS ────────────────────────────────
export const checklistItems = pgTable('checklist_items', {
  id:          uuid('id').primaryKey().defaultRandom(),
  clientId:    uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description'),
  status:      text('status').notNull().default('pending'),
  dueDate:     timestamp('due_date', { withTimezone: true }),
  assignedTo:  uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  phase:       text('phase'),
  priority:    text('priority').notNull().default('medium'),
  dependsOn:   uuid('depends_on').array(),
  recurrence:  jsonb('recurrence'),
  subtasks:    jsonb('subtasks').notNull().default([]),
  comments:    jsonb('comments').notNull().default([]),
  attachments: jsonb('attachments').notNull().default([]),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_checklist_client').on(t.clientId),
  index('idx_checklist_due_date').on(t.dueDate),
  index('idx_checklist_assigned_to').on(t.assignedTo),
  index('idx_checklist_status').on(t.status),
]);

export const onboardingPhases = pgTable('onboarding_phases', {
  id:           uuid('id').primaryKey().defaultRandom(),
  clientId:     uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name:         text('name').notNull(),
  phaseOrder:   integer('phase_order').notNull(),
  status:       text('status').notNull().default('pending'),
  startedAt:    timestamp('started_at', { withTimezone: true }),
  completedAt:  timestamp('completed_at', { withTimezone: true }),
  gateCriteria: jsonb('gate_criteria').notNull().default({}),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const milestones = pgTable('milestones', {
  id:          uuid('id').primaryKey().defaultRandom(),
  clientId:    uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description'),
  dueDate:     date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const successPlans = pgTable('success_plans', {
  id:          uuid('id').primaryKey().defaultRandom(),
  clientId:    uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description'),
  startDate:   date('start_date'),
  endDate:     date('end_date'),
  status:      text('status').notNull().default('active'),
  createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const successPlanTasks = pgTable('success_plan_tasks', {
  id:            uuid('id').primaryKey().defaultRandom(),
  successPlanId: uuid('success_plan_id').notNull().references(() => successPlans.id, { onDelete: 'cascade' }),
  title:         text('title').notNull(),
  status:        text('status').notNull().default('pending'),
  dueDate:       date('due_date'),
  assignedTo:    uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── COMMUNICATION ───────────────────────────────────
export const communicationLog = pgTable('communication_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  clientId:   uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  type:       text('type').notNull(),
  subject:    text('subject'),
  content:    text('content'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy:  uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  metadata:   jsonb('metadata').notNull().default({}),
}, (t) => [
  index('idx_comm_log_client').on(t.clientId),
  index('idx_comm_log_occurred_at').on(t.occurredAt),
]);

// ─── STUDIO ──────────────────────────────────────────
export const studioPages = pgTable('studio_pages', {
  id:         uuid('id').primaryKey().defaultRandom(),
  title:      text('title').notNull().default('Untitled'),
  icon:       text('icon').notNull().default('📄'),
  content:    jsonb('content').notNull().default({ type: 'doc', content: [] }),
  parentId:   uuid('parent_id').references((): AnyPgColumn => studioPages.id, { onDelete: 'set null' }),
  isPinned:   boolean('is_pinned').notNull().default(false),
  sortOrder:  integer('sort_order'),
  coverUrl:   text('cover_url'),
  shareToken: text('share_token').unique(),
  createdBy:  uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_studio_pages_parent').on(t.parentId),
]);

export const studioTemplates = pgTable('studio_templates', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  description: text('description'),
  category:    text('category').notNull(),
  content:     jsonb('content').notNull().default({ type: 'doc', content: [] }),
  author:      text('author'),
  authorRole:  text('author_role'),
  isBuiltIn:   boolean('is_built_in').notNull().default(false),
  usageCount:  integer('usage_count').notNull().default(0),
  createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── TEMPLATES ───────────────────────────────────────
export const emailTemplates = pgTable('email_templates', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  subject:   text('subject').notNull(),
  body:      text('body').notNull(),
  variables: jsonb('variables').notNull().default([]),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notesTemplates = pgTable('notes_templates', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  content:   text('content').notNull(),
  variables: jsonb('variables').notNull().default([]),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── FORMS ───────────────────────────────────────────
export const forms = pgTable('forms', {
  id:          uuid('id').primaryKey().defaultRandom(),
  title:       text('title').notNull(),
  description: text('description'),
  fields:      jsonb('fields').notNull().default([]),
  isActive:    boolean('is_active').notNull().default(true),
  createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const formResponses = pgTable('form_responses', {
  id:          uuid('id').primaryKey().defaultRandom(),
  formId:      uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  clientId:    uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  data:        jsonb('data').notNull().default({}),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── AI ──────────────────────────────────────────────
export const buds = pgTable('buds', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  icon:         text('icon'),
  color:        text('color'),
  type:         text('type').notNull().default('custom'),
  description:  text('description'),
  createdBy:    uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const budConversations = pgTable('bud_conversations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  budId:     uuid('bud_id').notNull().references(() => buds.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId:  uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  messages:  jsonb('messages').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_bud_conv_user').on(t.userId),
]);

// ─── AUTOMATIONS ─────────────────────────────────────
export const automationRules = pgTable('automation_rules', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  trigger:         text('trigger').notNull(),
  conditions:      jsonb('conditions').notNull().default({}),
  actions:         jsonb('actions').notNull().default([]),
  enabled:         boolean('enabled').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  triggerCount:    integer('trigger_count').notNull().default(0),
  createdBy:       uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── WEBHOOKS ────────────────────────────────────────
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id:         uuid('id').primaryKey().defaultRandom(),
  url:        text('url').notNull(),
  secretHash: text('secret_hash'),
  events:     jsonb('events').notNull().default([]),
  enabled:    boolean('enabled').notNull().default(true),
  createdBy:  uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id:              uuid('id').primaryKey().defaultRandom(),
  endpointId:      uuid('endpoint_id').notNull().references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
  eventType:       text('event_type').notNull(),
  payload:         jsonb('payload').notNull().default({}),
  status:          text('status').notNull().default('pending'),
  attempts:        integer('attempts').notNull().default(0),
  lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_webhook_del_status').on(t.status),
]);

// ─── GAMIFICATION ────────────────────────────────────
export const gamificationState = pgTable('gamification_state', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  xp:        integer('xp').notNull().default(0),
  level:     integer('level').notNull().default(1),
  streak:    integer('streak').notNull().default(0),
  weeklyXp:  integer('weekly_xp').notNull().default(0),
  deeds:     jsonb('deeds').notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── SERVICES ────────────────────────────────────────
export const services = pgTable('services', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  description: text('description'),
  price:       numeric('price', { precision: 12, scale: 2 }),
  category:    text('category'),
  createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clientServices = pgTable('client_services', {
  id:          uuid('id').primaryKey().defaultRandom(),
  clientId:    uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  serviceId:   uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  startDate:   date('start_date'),
  endDate:     date('end_date'),
  customPrice: numeric('custom_price', { precision: 12, scale: 2 }),
  notes:       text('notes'),
});

// ─── RELATIONS ───────────────────────────────────────
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions:          many(sessions),
  gamificationState: one(gamificationState, { fields: [users.id], references: [gamificationState.userId] }),
}));

export const clientsRelations = relations(clients, ({ many, one }) => ({
  contacts:         many(clientContacts),
  assignments:      many(clientAssignments),
  accountInfo:      one(accountInfo, { fields: [clients.id], references: [accountInfo.clientId] }),
  customFields:     many(customFields),
  tags:             many(clientTags),
  checklistItems:   many(checklistItems),
  phases:           many(onboardingPhases),
  milestones:       many(milestones),
  successPlans:     many(successPlans),
  communicationLog: many(communicationLog),
  services:         many(clientServices),
}));
