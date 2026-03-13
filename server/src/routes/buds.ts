import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { buds, budConversations } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const budRoutes = new Hono<AppEnv>();

// ─── Buds CRUD ────────────────────────────────────────
budRoutes.get('/', async (c) => {
  const rows = await db.select().from(buds).orderBy(buds.createdAt);
  return c.json({ data: rows, error: null });
});

budRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    systemPrompt: z.string().min(1),
    icon: z.string().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(buds)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

budRoutes.get('/:id', async (c) => {
  const [row] = await db.select().from(buds)
    .where(eq(buds.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

budRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    systemPrompt: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(buds).set(parsed.data)
    .where(eq(buds.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

budRoutes.delete('/:id', async (c) => {
  await db.delete(buds).where(eq(buds.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Conversations ────────────────────────────────────
budRoutes.get('/:id/conversations', async (c) => {
  const rows = await db.select().from(budConversations)
    .where(and(
      eq(budConversations.budId, c.req.param('id')),
      eq(budConversations.userId, c.get('userId')),
    )).orderBy(budConversations.updatedAt);
  return c.json({ data: rows, error: null });
});

budRoutes.post('/:id/conversations', async (c) => {
  const [row] = await db.insert(budConversations).values({
    budId: c.req.param('id'),
    userId: c.get('userId'),
  }).returning();
  return c.json({ data: row, error: null }, 201);
});

budRoutes.get('/:id/conversations/:convId', async (c) => {
  const [row] = await db.select().from(budConversations)
    .where(and(
      eq(budConversations.id, c.req.param('convId')),
      eq(budConversations.budId, c.req.param('id')),
    )).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

budRoutes.post('/:id/conversations/:convId/messages', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);

  const newMessage = { ...parsed.data, createdAt: new Date().toISOString() };

  const [row] = await db.update(budConversations)
    .set({
      messages: sql`messages || ${JSON.stringify([newMessage])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(budConversations.id, c.req.param('convId')),
      eq(budConversations.budId, c.req.param('id')),
    )).returning();

  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null }, 201);
});
