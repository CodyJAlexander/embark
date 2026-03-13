import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  clients, clientContacts, clientAssignments, accountInfo,
  customFields, checklistItems, onboardingPhases, milestones,
  successPlans, successPlanTasks, communicationLog,
  clientServices, clientTags, tags,
} from '../db/schema.js';
import { eq, and, ilike, sql, count } from 'drizzle-orm';
import { paginate, paginatedResponse } from '../lib/pagination.js';
import type { AppEnv } from '../types.js';

export const clientRoutes = new Hono<AppEnv>();

const clientSchema = z.object({
  id:             z.string().uuid().optional(),   // client-generated UUID
  name:           z.string().min(1),
  status:         z.string().optional(),
  lifecycleStage: z.string().optional(),
  industry:       z.string().optional(),
  companySize:    z.string().optional(),
  website:        z.string().optional(),
  assignedTo:     z.string().uuid().optional(),
  clientData:     z.record(z.unknown()).optional(),
});

// ─── List clients ─────────────────────────────────────
clientRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const { page, limit, offset } = paginate(c.req.query());
  const { status, lifecycle, assignedTo, search } = c.req.query();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(clients.createdBy, userId)];
  if (status)     conditions.push(eq(clients.status, status));
  if (lifecycle)  conditions.push(eq(clients.lifecycleStage, lifecycle));
  if (assignedTo) conditions.push(eq(clients.assignedTo, assignedTo));
  if (search)     conditions.push(ilike(clients.name, `%${search}%`));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(clients).where(where).limit(limit).offset(offset)
      .orderBy(clients.createdAt),
    db.select({ total: count() }).from(clients).where(where),
  ]);

  const total = Number((countResult as Array<{ total: unknown }>)[0]?.total ?? 0);
  return c.json(paginatedResponse(rows as typeof rows, total, page, limit));
});

// ─── Get client ───────────────────────────────────────
clientRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const [client] = await db.select().from(clients)
    .where(and(eq(clients.id, c.req.param('id')), eq(clients.createdBy, userId))).limit(1);
  if (!client) return c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: client, error: null });
});

// ─── Create client ────────────────────────────────────
clientRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR',
      details: parsed.error.flatten() }, 422);
  }
  const { id, clientData, ...rest } = parsed.data;
  const [client] = await db.insert(clients)
    .values({ ...(id ? { id } : {}), ...rest, clientData: clientData ?? {}, createdBy: userId })
    .returning();
  return c.json({ data: client, error: null }, 201);
});

// ─── Update client ────────────────────────────────────
clientRoutes.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR' }, 422);
  }
  const { id: _id, ...rest } = parsed.data;
  const [client] = await db.update(clients)
    .set({ ...rest, updatedAt: new Date() })
    .where(and(eq(clients.id, c.req.param('id')), eq(clients.createdBy, userId)))
    .returning();
  if (!client) return c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: client, error: null });
});

// ─── Delete client ────────────────────────────────────
clientRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const [deleted] = await db.delete(clients)
    .where(and(eq(clients.id, c.req.param('id')), eq(clients.createdBy, userId)))
    .returning({ id: clients.id });
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
  const { dueDate, ...rest } = parsed.data;
  const [row] = await db.insert(checklistItems)
    .values({ clientId: c.req.param('id'), ...rest,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}) }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/checklist/:itemId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    dueDate: z.string().optional(),
    assignedTo: z.string().uuid().optional(),
    phase: z.string().optional(),
    priority: z.string().optional(),
    subtasks: z.array(z.unknown()).optional(),
    comments: z.array(z.unknown()).optional(),
    attachments: z.array(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const { dueDate, ...rest } = parsed.data;
  const [row] = await db.update(checklistItems)
    .set({ ...rest, ...(dueDate ? { dueDate: new Date(dueDate) } : {}), updatedAt: new Date() })
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
  const schema = z.object({
    name: z.string().min(1),
    phaseOrder: z.number().int(),
    status: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    gateCriteria: z.record(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const { startedAt, completedAt, ...rest } = parsed.data;
  const [row] = await db.insert(onboardingPhases)
    .values({ clientId: c.req.param('id'), ...rest,
      ...(startedAt ? { startedAt: new Date(startedAt) } : {}),
      ...(completedAt ? { completedAt: new Date(completedAt) } : {}) }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/phases/:phaseId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    phaseOrder: z.number().int().optional(),
    status: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    gateCriteria: z.record(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const { startedAt, completedAt, ...rest } = parsed.data;
  const [row] = await db.update(onboardingPhases)
    .set({ ...rest,
      ...(startedAt ? { startedAt: new Date(startedAt) } : {}),
      ...(completedAt ? { completedAt: new Date(completedAt) } : {}) })
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
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    completedAt: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const { completedAt, ...rest } = parsed.data;
  const [row] = await db.insert(milestones)
    .values({ clientId: c.req.param('id'), ...rest,
      ...(completedAt ? { completedAt: new Date(completedAt) } : {}) }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/milestones/:milestoneId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    completedAt: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const { completedAt, ...rest } = parsed.data;
  const [row] = await db.update(milestones)
    .set({ ...rest, ...(completedAt ? { completedAt: new Date(completedAt) } : {}) })
    .where(and(eq(milestones.id, c.req.param('milestoneId')),
               eq(milestones.clientId, c.req.param('id')))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// ─── Communication log ────────────────────────────────
clientRoutes.get('/:id/communication-log', async (c) => {
  const { page, limit, offset } = paginate(c.req.query());
  const [rows, countResult] = await Promise.all([
    db.select().from(communicationLog)
      .where(eq(communicationLog.clientId, c.req.param('id')))
      .orderBy(communicationLog.occurredAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(communicationLog)
      .where(eq(communicationLog.clientId, c.req.param('id'))),
  ]);
  const total = Number((countResult as Array<{ total: unknown }>)[0]?.total ?? 0);
  return c.json(paginatedResponse(rows as typeof rows, total, page, limit));
});

clientRoutes.post('/:id/communication-log', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    type: z.string().min(1),
    subject: z.string().optional(),
    content: z.string().optional(),
    occurredAt: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const { occurredAt, ...rest } = parsed.data;
  const [row] = await db.insert(communicationLog)
    .values({ clientId: c.req.param('id'), createdBy: c.get('userId'), ...rest,
      ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}) }).returning();
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
  const schema = z.object({
    mrr: z.string().optional(),
    arr: z.string().optional(),
    contractValue: z.string().optional(),
    contractStart: z.string().optional(),
    contractEnd: z.string().optional(),
    renewalDate: z.string().optional(),
    npsScore: z.number().int().optional(),
    paymentStatus: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const existing = await db.select({ id: accountInfo.id }).from(accountInfo)
    .where(eq(accountInfo.clientId, c.req.param('id'))).limit(1);
  let row;
  if (existing.length > 0) {
    [row] = await db.update(accountInfo).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(accountInfo.clientId, c.req.param('id'))).returning();
  } else {
    [row] = await db.insert(accountInfo)
      .values({ clientId: c.req.param('id'), ...parsed.data }).returning();
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
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(successPlans)
    .values({ clientId: c.req.param('id'), createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.patch('/:id/success-plans/:planId', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(successPlans)
    .set({ ...parsed.data, updatedAt: new Date() })
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
  const schema = z.object({
    serviceId: z.string().uuid(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    customPrice: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(clientServices)
    .values({ clientId: c.req.param('id'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

clientRoutes.delete('/:id/services/:serviceId', async (c) => {
  await db.delete(clientServices)
    .where(and(eq(clientServices.id, c.req.param('serviceId')),
               eq(clientServices.clientId, c.req.param('id'))));
  return c.json({ data: { ok: true }, error: null });
});
