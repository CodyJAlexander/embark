import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { emailTemplates, notesTemplates } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const templateRoutes = new Hono<AppEnv>();

// ─── Email templates ──────────────────────────────────
templateRoutes.get('/email', async (c) => {
  const rows = await db.select().from(emailTemplates).orderBy(emailTemplates.createdAt);
  return c.json({ data: rows, error: null });
});

templateRoutes.post('/email', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    variables: z.array(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(emailTemplates)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

templateRoutes.get('/email/:id', async (c) => {
  const [row] = await db.select().from(emailTemplates)
    .where(eq(emailTemplates.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

templateRoutes.patch('/email/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    variables: z.array(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(emailTemplates).set(parsed.data)
    .where(eq(emailTemplates.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

templateRoutes.delete('/email/:id', async (c) => {
  await db.delete(emailTemplates).where(eq(emailTemplates.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Notes templates ──────────────────────────────────
templateRoutes.get('/notes', async (c) => {
  const rows = await db.select().from(notesTemplates).orderBy(notesTemplates.createdAt);
  return c.json({ data: rows, error: null });
});

templateRoutes.post('/notes', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    content: z.string().min(1),
    variables: z.array(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(notesTemplates)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

templateRoutes.get('/notes/:id', async (c) => {
  const [row] = await db.select().from(notesTemplates)
    .where(eq(notesTemplates.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

templateRoutes.patch('/notes/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    content: z.string().optional(),
    variables: z.array(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(notesTemplates).set(parsed.data)
    .where(eq(notesTemplates.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

templateRoutes.delete('/notes/:id', async (c) => {
  await db.delete(notesTemplates).where(eq(notesTemplates.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});
