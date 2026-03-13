import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { webhookEndpoints, webhookDeliveries } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const webhookRoutes = new Hono<AppEnv>();

// ─── Endpoints CRUD ───────────────────────────────────
webhookRoutes.get('/', async (c) => {
  const rows = await db.select().from(webhookEndpoints).orderBy(webhookEndpoints.createdAt);
  return c.json({ data: rows, error: null });
});

webhookRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    url: z.string().url(),
    events: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(webhookEndpoints)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

webhookRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    url: z.string().url().optional(),
    events: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(webhookEndpoints).set(parsed.data)
    .where(eq(webhookEndpoints.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

webhookRoutes.delete('/:id', async (c) => {
  await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Delivery log ─────────────────────────────────────
webhookRoutes.get('/:id/deliveries', async (c) => {
  const rows = await db.select().from(webhookDeliveries)
    .where(eq(webhookDeliveries.endpointId, c.req.param('id')))
    .orderBy(webhookDeliveries.createdAt);
  return c.json({ data: rows, error: null });
});

// ─── Test endpoint ────────────────────────────────────
webhookRoutes.post('/:id/test', async (c) => {
  const [endpoint] = await db.select().from(webhookEndpoints)
    .where(eq(webhookEndpoints.id, c.req.param('id'))).limit(1);
  if (!endpoint) return c.json({ data: null, error: 'Not found' }, 404);

  const payload = { event: 'test', timestamp: new Date().toISOString(), source: 'embark' };
  let status = 'failed';
  let statusCode: number | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    statusCode = res.status;
    status = res.ok ? 'success' : 'failed';
  } catch {
    status = 'failed';
  }

  const [delivery] = await db.insert(webhookDeliveries).values({
    endpointId: endpoint.id,
    eventType: 'test',
    payload,
    status,
    attempts: 1,
    lastAttemptedAt: new Date(),
  }).returning();

  return c.json({ data: { delivery, statusCode }, error: null });
});
