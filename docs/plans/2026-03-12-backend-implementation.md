# Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Hono + PostgreSQL backend for Embark, deployed as a second Railway service alongside the existing frontend, replacing localStorage with a real persistent API.

**Architecture:** Monorepo — add `server/` to the existing repo. Two Railway services share one GitHub push: `web` (existing nginx frontend, untouched) and `api` (Hono Node.js server). Drizzle ORM manages a 28-table PostgreSQL schema. Auth uses bcrypt + JWT (httpOnly cookie) with a Cloudflare Access JWT middleware for future SSO. Frontend migrates hook-by-hook — localStorage stays working until each phase is complete.

**Tech Stack:** Hono, Drizzle ORM, PostgreSQL (Railway plugin), bcryptjs, jose (JWT), Zod (validation), Vitest (tests), tsx (dev runner)

---

## Phase 1 — Server Project Setup

### Task 1: Scaffold server directory

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`

**Step 1: Create `server/package.json`**

```json
{
  "name": "embark-api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --outDir dist",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "bcryptjs": "^2.4.3",
    "drizzle-orm": "^0.40.0",
    "hono": "^4.7.0",
    "jose": "^5.9.6",
    "pg": "^8.13.3",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.11",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 3: Create `server/.env.example`**

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=30d
PORT=3001
CORS_ORIGIN=http://localhost:5173
CF_ACCESS_TEAM_DOMAIN=your-team.cloudflareaccess.com
CF_ACCESS_AUD=your-application-aud-tag
NODE_ENV=development
```

**Step 4: Install dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` created, no errors.

**Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/.env.example
git commit -m "chore: scaffold server project (Hono + Drizzle + Postgres)"
```

---

### Task 2: Railway configuration

**Files:**
- Modify: `railway.toml`
- Create: `server/Dockerfile.api`

**Step 1: Create `server/Dockerfile.api`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**Step 2: Update `railway.toml`**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "web"
dockerfilePath = "Dockerfile"

[[services]]
name = "api"
dockerfilePath = "server/Dockerfile.api"
buildContext = "server"

[services.deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Step 3: Commit**

```bash
git add railway.toml server/Dockerfile.api
git commit -m "chore: add Railway API service config and Dockerfile"
```

---

## Phase 2 — Database

### Task 3: Drizzle schema

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/index.ts`
- Create: `server/src/db/migrate.ts`
- Create: `server/drizzle.config.ts`

**Step 1: Create `server/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 2: Create `server/src/db/index.ts`**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

**Step 3: Create `server/src/db/migrate.ts`**

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.js';

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 4: Create `server/src/db/schema.ts`**

```typescript
import {
  pgTable, uuid, text, boolean, integer, numeric,
  timestamp, date, jsonb, primaryKey, index, uniqueIndex,
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
  assignedTo:       uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy:        uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_clients_status').on(t.status),
  index('idx_clients_lifecycle').on(t.lifecycleStage),
  index('idx_clients_assigned_to').on(t.assignedTo),
  index('idx_clients_renewal_date'),
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
  id:        uuid('id').primaryKey().defaultRandom(),
  title:     text('title').notNull().default('Untitled'),
  icon:      text('icon').notNull().default('📄'),
  content:   jsonb('content').notNull().default({ type: 'doc', content: [] }),
  parentId:  uuid('parent_id').references((): any => studioPages.id, { onDelete: 'set null' }),
  isPinned:  boolean('is_pinned').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_studio_pages_parent').on(t.parentId),
]);

export const studioTemplates = pgTable('studio_templates', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  description:text('description'),
  category:   text('category').notNull(),
  content:    jsonb('content').notNull().default({ type: 'doc', content: [] }),
  author:     text('author'),
  authorRole: text('author_role'),
  isBuiltIn:  boolean('is_built_in').notNull().default(false),
  usageCount: integer('usage_count').notNull().default(0),
  createdBy:  uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           text('name').notNull(),
  trigger:        text('trigger').notNull(),
  conditions:     jsonb('conditions').notNull().default({}),
  actions:        jsonb('actions').notNull().default([]),
  enabled:        boolean('enabled').notNull().default(true),
  lastTriggeredAt:timestamp('last_triggered_at', { withTimezone: true }),
  triggerCount:   integer('trigger_count').notNull().default(0),
  createdBy:      uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
  sessions:           many(sessions),
  assignedClients:    many(clients, { relationName: 'assignedTo' }),
  createdClients:     many(clients, { relationName: 'createdBy' }),
  gamificationState:  one(gamificationState, { fields: [users.id], references: [gamificationState.userId] }),
}));

export const clientsRelations = relations(clients, ({ many, one }) => ({
  contacts:        many(clientContacts),
  assignments:     many(clientAssignments),
  accountInfo:     one(accountInfo, { fields: [clients.id], references: [accountInfo.clientId] }),
  customFields:    many(customFields),
  tags:            many(clientTags),
  checklistItems:  many(checklistItems),
  phases:          many(onboardingPhases),
  milestones:      many(milestones),
  successPlans:    many(successPlans),
  communicationLog:many(communicationLog),
  services:        many(clientServices),
}));
```

**Step 5: Generate initial migration**

```bash
cd server && npx drizzle-kit generate
```

Expected: `src/db/migrations/0000_initial.sql` created.

**Step 6: Commit**

```bash
git add server/src/db/ server/drizzle.config.ts
git commit -m "feat(db): add Drizzle schema (28 tables) and migration"
```

---

## Phase 3 — Hono App & Middleware

### Task 4: App entry point and shared types

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/types.ts`

**Step 1: Create `server/src/types.ts`**

```typescript
export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export interface AppEnv {
  Variables: {
    userId: string;
    userEmail: string;
    userRole: string;
  };
}
```

**Step 2: Create `server/src/index.ts`**

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppEnv } from './types.js';
import { authRoutes } from './routes/auth.js';
import { clientRoutes } from './routes/clients.js';
import { studioRoutes } from './routes/studio.js';
import { templateRoutes } from './routes/templates.js';
import { budRoutes } from './routes/buds.js';
import { automationRoutes } from './routes/automations.js';
import { webhookRoutes } from './routes/webhooks.js';
import { formRoutes } from './routes/forms.js';
import { userRoutes } from './routes/users.js';
import { gamificationRoutes } from './routes/gamification.js';
import { serviceRoutes } from './routes/services.js';
import { tagRoutes } from './routes/tags.js';
import { authMiddleware } from './middleware/auth.js';
import { cfAccessMiddleware } from './middleware/cfAccess.js';

const app = new Hono<AppEnv>();

// ─── Global middleware ────────────────────────────────
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));

// ─── Cloudflare Access (optional, no-op if header absent) ──
app.use('*', cfAccessMiddleware);

// ─── Public routes (no auth required) ────────────────
app.route('/api/v1/auth', authRoutes);
// Form responses are public — mounted before auth middleware
app.post('/api/v1/forms/:id/responses', async (c) => {
  const { formRoutes: fr } = await import('./routes/forms.js');
  return fr.fetch(c.req.raw, c.env);
});

// ─── Protected routes ─────────────────────────────────
app.use('/api/v1/*', authMiddleware);
app.route('/api/v1/clients',      clientRoutes);
app.route('/api/v1/studio',       studioRoutes);
app.route('/api/v1/templates',    templateRoutes);
app.route('/api/v1/buds',         budRoutes);
app.route('/api/v1/automations',  automationRoutes);
app.route('/api/v1/webhooks',     webhookRoutes);
app.route('/api/v1/forms',        formRoutes);
app.route('/api/v1/users',        userRoutes);
app.route('/api/v1/gamification', gamificationRoutes);
app.route('/api/v1/services',     serviceRoutes);
app.route('/api/v1/tags',         tagRoutes);

// ─── Health check ─────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok' }));

// ─── 404 handler ──────────────────────────────────────
app.notFound((c) => c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404));

// ─── Error handler ────────────────────────────────────
app.onError((err, c) => {
  console.error(err);
  return c.json({ data: null, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

const port = Number(process.env.PORT ?? 3001);
console.log(`API server running on port ${port}`);
serve({ fetch: app.fetch, port });

export default app;
```

**Step 3: Commit**

```bash
git add server/src/index.ts server/src/types.ts
git commit -m "feat(api): add Hono app entry point with route mounts"
```

---

### Task 5: Auth and Cloudflare Access middleware

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/cfAccess.ts`
- Create: `server/test/middleware.test.ts`

**Step 1: Write failing test**

```typescript
// server/test/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth.js';

describe('authMiddleware', () => {
  it('returns 401 when no Authorization header', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed token', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer notavalidtoken' },
    });
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run test/middleware.test.ts
```

Expected: FAIL — `authMiddleware` not defined.

**Step 3: Create `server/src/middleware/auth.ts`**

```typescript
import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { AppEnv } from '../types.js';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ data: null, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    c.set('userId',    payload.sub as string);
    c.set('userEmail', payload.email as string);
    c.set('userRole',  payload.role as string);
    await next();
  } catch {
    return c.json({ data: null, error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401);
  }
});
```

**Step 4: Create `server/src/middleware/cfAccess.ts`**

```typescript
import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// No-op if CF_ACCESS_TEAM_DOMAIN not configured
export const cfAccessMiddleware = createMiddleware(async (c, next) => {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;
  const assertion = c.req.header('CF-Access-Jwt-Assertion');

  if (!teamDomain || !aud || !assertion) {
    return next();
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`)
    );
    await jwtVerify(assertion, JWKS, { audience: aud });
    return next();
  } catch {
    return c.json({ data: null, error: 'Cloudflare Access verification failed', code: 'FORBIDDEN' }, 403);
  }
});
```

**Step 5: Run test to verify it passes**

```bash
cd server && npx vitest run test/middleware.test.ts
```

Expected: 2 tests PASS.

**Step 6: Commit**

```bash
git add server/src/middleware/ server/test/middleware.test.ts
git commit -m "feat(api): add auth JWT middleware and Cloudflare Access middleware"
```

---

## Phase 4 — Auth Routes

### Task 6: Register and login

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/lib/jwt.ts`
- Create: `server/test/auth.test.ts`

**Step 1: Create `server/src/lib/jwt.ts`**

```typescript
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '30d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
```

**Step 2: Write failing test**

```typescript
// server/test/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/index.js';

describe('POST /api/v1/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@interworks.com',
        username: 'testuser',
        password: 'password123',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('test@interworks.com');
  });

  it('returns 422 if email already taken', async () => {
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@interworks.com',
        username: 'testuser2',
        password: 'password123',
      }),
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns token for valid credentials', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@interworks.com',
        password: 'password123',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@interworks.com',
        password: 'wrongpassword',
      }),
    });
    expect(res.status).toBe(401);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
cd server && npx vitest run test/auth.test.ts
```

Expected: FAIL — routes not defined.

**Step 4: Create `server/src/routes/auth.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import { signToken } from '../lib/jwt.js';
import { createHash } from 'crypto';
import type { AppEnv } from '../types.js';

export const authRoutes = new Hono<AppEnv>();

const registerSchema = z.object({
  email:    z.string().email(),
  username: z.string().min(2).max(50),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

authRoutes.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR',
      details: parsed.error.flatten() }, 422);
  }

  const { email, username, password } = parsed.data;

  // Check uniqueness
  const existing = await db.select().from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  if (existing.length > 0) {
    return c.json({ data: null, error: 'Email or username already taken', code: 'CONFLICT' }, 422);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, username, passwordHash })
    .returning({ id: users.id, email: users.email, username: users.username, role: users.role });

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(token), expiresAt });

  return c.json({ data: { token, user }, error: null }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR' }, 422);
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ data: null, error: 'Invalid credentials', code: 'UNAUTHORIZED' }, 401);
  }

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(token), expiresAt });

  const { passwordHash: _, ...safeUser } = user;
  return c.json({ data: { token, user: safeUser }, error: null });
});

authRoutes.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.slice(7);
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  return c.json({ data: { ok: true }, error: null });
});

authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ data: null, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

  const [user] = await db.select({
    id: users.id, email: users.email, username: users.username,
    role: users.role, avatarUrl: users.avatarUrl, characterClass: users.characterClass,
    onboardingComplete: users.onboardingComplete, preferences: users.preferences,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user) return c.json({ data: null, error: 'User not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: user, error: null });
});
```

**Step 5: Run tests to verify they pass**

```bash
cd server && npx vitest run test/auth.test.ts
```

Expected: 4 tests PASS.

**Step 6: Commit**

```bash
git add server/src/routes/auth.ts server/src/lib/jwt.ts server/test/auth.test.ts
git commit -m "feat(api): add auth routes (register, login, logout, me)"
```

---

## Phase 5 — Client Routes

### Task 7: Client CRUD

**Files:**
- Create: `server/src/routes/clients.ts`
- Create: `server/src/lib/pagination.ts`
- Create: `server/test/clients.test.ts`

**Step 1: Create `server/src/lib/pagination.ts`**

```typescript
export function paginate(query: { page?: string; limit?: string }) {
  const page  = Math.max(1, parseInt(query.page  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '25', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}
```

**Step 2: Write failing test**

```typescript
// server/test/clients.test.ts
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';

// Helper: get a valid auth token
async function getToken() {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@interworks.com', password: 'password123' }),
  });
  const body = await res.json();
  return body.data.token as string;
}

describe('GET /api/v1/clients', () => {
  it('returns paginated client list', async () => {
    const token = await getToken();
    const res = await app.request('/api/v1/clients', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeDefined();
  });

  it('returns 401 without token', async () => {
    const res = await app.request('/api/v1/clients');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/clients', () => {
  it('creates a client and returns it', async () => {
    const token = await getToken();
    const res = await app.request('/api/v1/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Acme Corp', status: 'active' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Acme Corp');
    expect(body.data.id).toBeDefined();
  });

  it('returns 422 for missing name', async () => {
    const token = await getToken();
    const res = await app.request('/api/v1/clients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    expect(res.status).toBe(422);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
cd server && npx vitest run test/clients.test.ts
```

Expected: FAIL — client routes not defined.

**Step 4: Create `server/src/routes/clients.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  clients, clientContacts, clientAssignments, accountInfo,
  customFields, checklistItems, onboardingPhases, milestones,
  successPlans, successPlanTasks, communicationLog,
  clientServices, clientTags, tags,
} from '../db/schema.js';
import { eq, and, ilike, inArray, sql, count } from 'drizzle-orm';
import { paginate, paginatedResponse } from '../lib/pagination.js';
import type { AppEnv } from '../types.js';

export const clientRoutes = new Hono<AppEnv>();

const clientSchema = z.object({
  name:           z.string().min(1),
  status:         z.string().optional(),
  lifecycleStage: z.string().optional(),
  industry:       z.string().optional(),
  companySize:    z.string().optional(),
  website:        z.string().optional(),
  assignedTo:     z.string().uuid().optional(),
});

// ─── List clients ─────────────────────────────────────
clientRoutes.get('/', async (c) => {
  const { page, limit, offset } = paginate(c.req.query());
  const { status, lifecycle, assignedTo, search } = c.req.query();

  const conditions = [];
  if (status)     conditions.push(eq(clients.status, status));
  if (lifecycle)  conditions.push(eq(clients.lifecycleStage, lifecycle));
  if (assignedTo) conditions.push(eq(clients.assignedTo, assignedTo));
  if (search)     conditions.push(ilike(clients.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(clients).where(where).limit(limit).offset(offset)
      .orderBy(clients.createdAt),
    db.select({ total: count() }).from(clients).where(where),
  ]);

  return c.json(paginatedResponse(rows, Number(total), page, limit));
});

// ─── Get client ───────────────────────────────────────
clientRoutes.get('/:id', async (c) => {
  const [client] = await db.select().from(clients)
    .where(eq(clients.id, c.req.param('id'))).limit(1);
  if (!client) return c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: client, error: null });
});

// ─── Create client ────────────────────────────────────
clientRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR',
      details: parsed.error.flatten() }, 422);
  }
  const [client] = await db.insert(clients)
    .values({ ...parsed.data, createdBy: c.get('userId') })
    .returning();
  return c.json({ data: client, error: null }, 201);
});

// ─── Update client ────────────────────────────────────
clientRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR' }, 422);
  }
  const [client] = await db.update(clients)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(clients.id, c.req.param('id')))
    .returning();
  if (!client) return c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: client, error: null });
});

// ─── Delete client ────────────────────────────────────
clientRoutes.delete('/:id', async (c) => {
  const [deleted] = await db.delete(clients)
    .where(eq(clients.id, c.req.param('id'))).returning({ id: clients.id });
  if (!deleted) return c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: { id: deleted.id }, error: null });
});

// ─── Contacts ─────────────────────────────────────────
clientRoutes.get('/:id/contacts', async (c) => {
  const rows = await db.select().from(clientContacts)
    .where(eq(clientContacts.clientId, c.req.param('id')));
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/contacts', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({ name: z.string(), email: z.string().optional(),
    phone: z.string().optional(), role: z.string().optional(),
    isPrimary: z.boolean().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(clientContacts)
    .values({ clientId: c.req.param('id'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/contacts/:contactId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(clientContacts).set(body)
    .where(and(eq(clientContacts.id, c.req.param('contactId')),
               eq(clientContacts.clientId, c.req.param('id')))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

clientRoutes.delete('/:id/contacts/:contactId', async (c) => {
  await db.delete(clientContacts)
    .where(and(eq(clientContacts.id, c.req.param('contactId')),
               eq(clientContacts.clientId, c.req.param('id'))));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Checklist ────────────────────────────────────────
clientRoutes.get('/:id/checklist', async (c) => {
  const rows = await db.select().from(checklistItems)
    .where(eq(checklistItems.clientId, c.req.param('id')))
    .orderBy(checklistItems.createdAt);
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/checklist', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({ title: z.string(), description: z.string().optional(),
    status: z.string().optional(), dueDate: z.string().optional(),
    assignedTo: z.string().uuid().optional(), phase: z.string().optional(),
    priority: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(checklistItems)
    .values({ clientId: c.req.param('id'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/checklist/:itemId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(checklistItems)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(checklistItems.id, c.req.param('itemId')),
               eq(checklistItems.clientId, c.req.param('id')))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

clientRoutes.delete('/:id/checklist/:itemId', async (c) => {
  await db.delete(checklistItems)
    .where(and(eq(checklistItems.id, c.req.param('itemId')),
               eq(checklistItems.clientId, c.req.param('id'))));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Phases ───────────────────────────────────────────
clientRoutes.get('/:id/phases', async (c) => {
  const rows = await db.select().from(onboardingPhases)
    .where(eq(onboardingPhases.clientId, c.req.param('id')))
    .orderBy(onboardingPhases.phaseOrder);
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/phases', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(onboardingPhases)
    .values({ clientId: c.req.param('id'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/phases/:phaseId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(onboardingPhases).set(body)
    .where(and(eq(onboardingPhases.id, c.req.param('phaseId')),
               eq(onboardingPhases.clientId, c.req.param('id')))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// ─── Milestones ───────────────────────────────────────
clientRoutes.get('/:id/milestones', async (c) => {
  const rows = await db.select().from(milestones)
    .where(eq(milestones.clientId, c.req.param('id')));
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/milestones', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(milestones)
    .values({ clientId: c.req.param('id'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/milestones/:milestoneId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(milestones).set(body)
    .where(and(eq(milestones.id, c.req.param('milestoneId')),
               eq(milestones.clientId, c.req.param('id')))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// ─── Communication log ────────────────────────────────
clientRoutes.get('/:id/communication-log', async (c) => {
  const { page, limit, offset } = paginate(c.req.query());
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(communicationLog)
      .where(eq(communicationLog.clientId, c.req.param('id')))
      .orderBy(communicationLog.occurredAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(communicationLog)
      .where(eq(communicationLog.clientId, c.req.param('id'))),
  ]);
  return c.json(paginatedResponse(rows, Number(total), page, limit));
});

clientRoutes.post('/:id/communication-log', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(communicationLog)
    .values({ clientId: c.req.param('id'), createdBy: c.get('userId'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

// ─── Account info ─────────────────────────────────────
clientRoutes.get('/:id/account-info', async (c) => {
  const [row] = await db.select().from(accountInfo)
    .where(eq(accountInfo.clientId, c.req.param('id'))).limit(1);
  return c.json({ data: row ?? null, error: null });
});

clientRoutes.put('/:id/account-info', async (c) => {
  const body = await c.req.json().catch(() => null);
  const existing = await db.select({ id: accountInfo.id }).from(accountInfo)
    .where(eq(accountInfo.clientId, c.req.param('id'))).limit(1);
  let row;
  if (existing.length > 0) {
    [row] = await db.update(accountInfo).set({ ...body, updatedAt: new Date() })
      .where(eq(accountInfo.clientId, c.req.param('id'))).returning();
  } else {
    [row] = await db.insert(accountInfo)
      .values({ clientId: c.req.param('id'), ...body }).returning();
  }
  return c.json({ data: row, error: null });
});

// ─── Success plans ────────────────────────────────────
clientRoutes.get('/:id/success-plans', async (c) => {
  const rows = await db.select().from(successPlans)
    .where(eq(successPlans.clientId, c.req.param('id')));
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/success-plans', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(successPlans)
    .values({ clientId: c.req.param('id'), createdBy: c.get('userId'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/success-plans/:planId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(successPlans).set({ ...body, updatedAt: new Date() })
    .where(and(eq(successPlans.id, c.req.param('planId')),
               eq(successPlans.clientId, c.req.param('id')))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// ─── Assignments ──────────────────────────────────────
clientRoutes.get('/:id/assignments', async (c) => {
  const rows = await db.select().from(clientAssignments)
    .where(eq(clientAssignments.clientId, c.req.param('id')));
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/assignments', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({ userId: z.string().uuid(), role: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(clientAssignments)
    .values({ clientId: c.req.param('id'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.delete('/:id/assignments/:userId', async (c) => {
  await db.delete(clientAssignments)
    .where(and(eq(clientAssignments.clientId, c.req.param('id')),
               eq(clientAssignments.userId, c.req.param('userId'))));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Services ─────────────────────────────────────────
clientRoutes.get('/:id/services', async (c) => {
  const rows = await db.select().from(clientServices)
    .where(eq(clientServices.clientId, c.req.param('id')));
  return c.json({ data: rows, error: null });
});

clientRoutes.post('/:id/services', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(clientServices)
    .values({ clientId: c.req.param('id'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.delete('/:id/services/:serviceId', async (c) => {
  await db.delete(clientServices)
    .where(and(eq(clientServices.id, c.req.param('serviceId')),
               eq(clientServices.clientId, c.req.param('id'))));
  return c.json({ data: { ok: true }, error: null });
});
```

**Step 5: Run tests to verify they pass**

```bash
cd server && npx vitest run test/clients.test.ts
```

Expected: 4 tests PASS.

**Step 6: Commit**

```bash
git add server/src/routes/clients.ts server/src/lib/pagination.ts server/test/clients.test.ts
git commit -m "feat(api): add client routes (CRUD + all sub-resources)"
```

---

## Phase 6 — Remaining Routes

Each of these follows the same pattern as clients. Full code provided for each.

### Task 8: Studio routes

**Files:**
- Create: `server/src/routes/studio.ts`

```typescript
import { Hono } from 'hono';
import { db } from '../db/index.js';
import { studioPages, studioTemplates } from '../db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const studioRoutes = new Hono<AppEnv>();

// Pages
studioRoutes.get('/pages', async (c) => {
  const rows = await db.select().from(studioPages).orderBy(studioPages.updatedAt);
  return c.json({ data: rows, error: null });
});

studioRoutes.post('/pages', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(studioPages)
    .values({ createdBy: c.get('userId'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

studioRoutes.get('/pages/:id', async (c) => {
  const [row] = await db.select().from(studioPages)
    .where(eq(studioPages.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

studioRoutes.patch('/pages/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(studioPages)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(studioPages.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

studioRoutes.delete('/pages/:id', async (c) => {
  await db.delete(studioPages).where(eq(studioPages.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// Templates
studioRoutes.get('/templates', async (c) => {
  const rows = await db.select().from(studioTemplates).orderBy(studioTemplates.createdAt);
  return c.json({ data: rows, error: null });
});

studioRoutes.post('/templates', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.insert(studioTemplates)
    .values({ createdBy: c.get('userId'), ...body }).returning();
  return c.json({ data: row, error: null }, 201);
});

studioRoutes.patch('/templates/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const [row] = await db.update(studioTemplates).set(body)
    .where(eq(studioTemplates.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

studioRoutes.delete('/templates/:id', async (c) => {
  await db.delete(studioTemplates).where(eq(studioTemplates.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

studioRoutes.post('/templates/:id/use', async (c) => {
  const [template] = await db.select().from(studioTemplates)
    .where(eq(studioTemplates.id, c.req.param('id'))).limit(1);
  if (!template) return c.json({ data: null, error: 'Not found' }, 404);
  await db.update(studioTemplates)
    .set({ usageCount: template.usageCount + 1 })
    .where(eq(studioTemplates.id, template.id));
  const [page] = await db.insert(studioPages).values({
    title: template.name, content: template.content,
    createdBy: c.get('userId'),
  }).returning();
  return c.json({ data: page, error: null }, 201);
});
```

**Commit:**
```bash
git add server/src/routes/studio.ts
git commit -m "feat(api): add Studio pages and templates routes"
```

---

### Task 9: Templates, Buds, Automations, Webhooks routes

**Files:**
- Create: `server/src/routes/templates.ts`
- Create: `server/src/routes/buds.ts`
- Create: `server/src/routes/automations.ts`
- Create: `server/src/routes/webhooks.ts`

These all follow the same CRUD pattern. Create each file with the following structure (adapt table/schema names):

**`server/src/routes/templates.ts`** — covers `/email`, `/notes` sub-routes using `emailTemplates` and `notesTemplates` tables.

**`server/src/routes/buds.ts`** — covers buds CRUD and nested conversation routes using `buds` and `budConversations` tables. Conversations `POST /buds/:id/conversations/:convId/messages` appends to `messages JSONB` array using Drizzle's `sql` helper:

```typescript
// Append message to JSONB array
await db.update(budConversations)
  .set({ messages: sql`messages || ${JSON.stringify([newMessage])}::jsonb`, updatedAt: new Date() })
  .where(eq(budConversations.id, convId));
```

**`server/src/routes/automations.ts`** — covers automation rules CRUD + `POST /:id/trigger` which runs the automation server-side.

**`server/src/routes/webhooks.ts`** — covers endpoint CRUD + delivery log + `POST /endpoints/:id/test` which sends a real HTTP `fetch()` to the endpoint URL.

**Commit:**
```bash
git add server/src/routes/templates.ts server/src/routes/buds.ts \
        server/src/routes/automations.ts server/src/routes/webhooks.ts
git commit -m "feat(api): add templates, buds, automations, webhooks routes"
```

---

### Task 10: Forms, Users, Gamification, Services, Tags routes

**Files:**
- Create: `server/src/routes/forms.ts`
- Create: `server/src/routes/users.ts`
- Create: `server/src/routes/gamification.ts`
- Create: `server/src/routes/services.ts`
- Create: `server/src/routes/tags.ts`

**Key note for `forms.ts`:** The `POST /:id/responses` endpoint must NOT require auth — it's called by external clients filling out forms. In `src/index.ts` this route is mounted before the `authMiddleware` is applied.

**Key note for `gamification.ts`:** `POST /deeds/:deedId` upserts into `gamification_state` and appends the deed to the `deeds JSONB` array, only if the deed hasn't been unlocked yet.

**Commit:**
```bash
git add server/src/routes/forms.ts server/src/routes/users.ts \
        server/src/routes/gamification.ts server/src/routes/services.ts \
        server/src/routes/tags.ts
git commit -m "feat(api): add forms, users, gamification, services, tags routes"
```

---

## Phase 7 — Frontend Migration

### Task 11: API client utility

**Files:**
- Create: `src/lib/api.ts`

**Step 1: Create `src/lib/api.ts`**

```typescript
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('embark-api-token');
}

export function setToken(token: string) {
  localStorage.setItem('embark-api-token', token);
}

export function clearToken() {
  localStorage.removeItem('embark-api-token');
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  total?: number;
  page?: number;
  limit?: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/';
  }

  return res.json();
}

export const api = {
  get:    <T>(path: string)                  => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown)   => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)   => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => apiFetch<T>(path, { method: 'DELETE' }),
};
```

**Step 2: Add `VITE_API_URL` to `.env.example`**

```bash
echo "VITE_API_URL=http://localhost:3001" >> .env.example
```

**Step 3: Commit**

```bash
git add src/lib/api.ts .env.example
git commit -m "feat(frontend): add API client utility"
```

---

### Task 12: Migrate auth (Phase 1 migration)

**Files:**
- Modify: `src/context/AuthContext.tsx`

Replace the `btoa()` localStorage auth with real API calls. The shape of the context (`login`, `register`, `logout`, `currentUser`) stays identical — no other component changes.

**Key changes:**
- `register()` → `api.post('/api/v1/auth/register', {...})` → calls `setToken(data.token)`
- `login()` → `api.post('/api/v1/auth/login', {...})` → calls `setToken(data.token)`
- `logout()` → `api.post('/api/v1/auth/logout', {})` → calls `clearToken()`
- On app init, if token present, call `GET /api/v1/auth/me` to restore `currentUser`

**Commit:**
```bash
git add src/context/AuthContext.tsx
git commit -m "feat(frontend): migrate auth to API (Phase 1)"
```

---

### Task 13: Migrate useClients hook (Phase 2 migration)

**Files:**
- Create: `src/hooks/useClientsAPI.ts`
- Modify: `src/context/ClientContext.tsx`

Create `useClientsAPI.ts` as a drop-in replacement for `useClients.ts` that calls the API instead of localStorage. The context interface stays identical — swap the hook reference in `ClientContext.tsx`.

Also create a one-time migration utility:

**`src/utils/migrateLocalStorage.ts`**

```typescript
import { api } from '../lib/api.js';

export async function migrateClientsFromLocalStorage(): Promise<number> {
  const raw = localStorage.getItem('embark-clients');
  if (!raw) return 0;

  const clients = JSON.parse(raw);
  let migrated = 0;

  for (const client of clients) {
    const res = await api.post('/api/v1/clients', {
      name:           client.name,
      status:         client.status,
      lifecycleStage: client.lifecycleStage,
      industry:       client.industry,
      website:        client.website,
    });
    if (res.data) migrated++;
  }

  // Mark migration complete so it doesn't run again
  localStorage.setItem('embark-migrated-clients', 'true');
  return migrated;
}
```

Call this utility once on first login if `embark-migrated-clients` is not set.

**Commit:**
```bash
git add src/hooks/useClientsAPI.ts src/utils/migrateLocalStorage.ts
git add src/context/ClientContext.tsx
git commit -m "feat(frontend): migrate clients to API (Phase 2)"
```

---

### Task 14: Railway environment variables

In Railway dashboard, set these env vars on the `api` service:

```
DATABASE_URL          → (auto-injected by Railway Postgres plugin)
JWT_SECRET            → (generate: openssl rand -base64 32)
JWT_EXPIRES_IN        → 30d
PORT                  → 3001
CORS_ORIGIN           → https://your-frontend.railway.app
NODE_ENV              → production
```

On the `web` (frontend) service:
```
VITE_API_URL          → https://your-api.railway.app
```

**Step 1: Rebuild and deploy**

```bash
git push origin master
```

Expected: Railway builds both services, runs `npm run db:migrate` on first deploy (manually trigger or add to start command).

**Step 2: Add migration to API start command**

Update `server/package.json` `start` script:

```json
"start": "node -e \"import('./dist/db/migrate.js')\" && node dist/index.js"
```

Or more cleanly:

```json
"start": "node dist/db/migrate.js && node dist/index.js"
```

**Step 3: Commit**

```bash
git add server/package.json
git commit -m "chore: run db migrations on API startup"
```

---

## Phase 8 — Verification

### Task 15: End-to-end smoke test

After deploy:

1. **Auth**: `POST https://api.railway.app/api/v1/auth/register` → get token ✓
2. **Create client**: `POST /api/v1/clients` with Bearer token → client created ✓
3. **List clients**: `GET /api/v1/clients` → returns array ✓
4. **Health check**: `GET /health` → `{ status: "ok" }` ✓
5. **Frontend**: navigate to app → login → clients load from API → Studio pages sync across sessions ✓
6. **Migration**: on first login, localStorage clients appear in API-backed list ✓

### Task 16: Final commit

```bash
git add -A
git commit -m "feat: complete backend v1 — Hono + Postgres + Drizzle on Railway"
git push origin master
```

---

## Summary

| Phase | Tasks | What ships |
|---|---|---|
| 1 | 1–2 | Server scaffold, Railway config |
| 2 | 3 | Drizzle schema (28 tables), migrations |
| 3 | 4–5 | Hono app, auth + CF Access middleware |
| 4 | 6 | Auth routes (register, login, logout, me) |
| 5 | 7 | Client routes (full CRUD + 9 sub-resources) |
| 6 | 8–10 | All remaining 11 resource route files |
| 7 | 11–14 | Frontend API client, auth migration, client migration |
| 8 | 15–16 | Smoke test + final deploy |
