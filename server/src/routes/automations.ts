import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { automationRules } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const automationRoutes = new Hono<AppEnv>();

automationRoutes.get('/', async (c) => {
  const rows = await db.select().from(automationRules).orderBy(automationRules.createdAt);
  return c.json({ data: rows, error: null });
});

automationRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    trigger: z.string().min(1),
    conditions: z.record(z.unknown()).optional(),
    actions: z.array(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(automationRules)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

automationRoutes.get('/:id', async (c) => {
  const [row] = await db.select().from(automationRules)
    .where(eq(automationRules.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

automationRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    trigger: z.string().optional(),
    conditions: z.record(z.unknown()).optional(),
    actions: z.array(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(automationRules).set(parsed.data)
    .where(eq(automationRules.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

automationRoutes.delete('/:id', async (c) => {
  await db.delete(automationRules).where(eq(automationRules.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// Trigger automation manually (records execution timestamp + increments count)
automationRoutes.post('/:id/trigger', async (c) => {
  const [row] = await db.update(automationRules)
    .set({
      lastTriggeredAt: new Date(),
      triggerCount: sql`${automationRules.triggerCount} + 1`,
    })
    .where(eq(automationRules.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: { triggered: true, rule: row }, error: null });
});
