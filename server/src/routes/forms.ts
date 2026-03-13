import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { forms, formResponses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const formRoutes = new Hono<AppEnv>();

formRoutes.get('/', async (c) => {
  const rows = await db.select().from(forms).orderBy(forms.createdAt);
  return c.json({ data: rows, error: null });
});

formRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    fields: z.array(z.unknown()).optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(forms)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

formRoutes.get('/:id', async (c) => {
  const [row] = await db.select().from(forms)
    .where(eq(forms.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

formRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(z.unknown()).optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(forms)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(forms.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

formRoutes.delete('/:id', async (c) => {
  await db.delete(forms).where(eq(forms.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// Public endpoint — no auth required (mounted before authMiddleware in index.ts)
formRoutes.post('/:id/responses', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    data: z.record(z.unknown()),
    clientId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(formResponses).values({
    formId: c.req.param('id'),
    clientId: parsed.data.clientId,
    data: parsed.data.data,
  }).returning();
  return c.json({ data: row, error: null }, 201);
});

formRoutes.get('/:id/responses', async (c) => {
  const rows = await db.select().from(formResponses)
    .where(eq(formResponses.formId, c.req.param('id')))
    .orderBy(formResponses.submittedAt);
  return c.json({ data: rows, error: null });
});
