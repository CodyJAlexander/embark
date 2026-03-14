import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { studioPages, studioTemplates } from '../db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const studioRoutes = new Hono<AppEnv>();

// ─── Pages ────────────────────────────────────────────
studioRoutes.get('/pages', async (c) => {
  const rows = await db.select().from(studioPages).orderBy(sql`studio_pages.sort_order ASC NULLS LAST`, desc(studioPages.updatedAt));
  return c.json({ data: rows, error: null });
});

studioRoutes.post('/pages', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    title: z.string().optional(),
    icon: z.string().optional(),
    content: z.record(z.unknown()).optional(),
    parentId: z.string().uuid().optional(),
    isPinned: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    coverUrl: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(studioPages)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
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
  const schema = z.object({
    title: z.string().optional(),
    icon: z.string().optional(),
    content: z.record(z.unknown()).optional(),
    parentId: z.string().uuid().nullable().optional(),
    isPinned: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    coverUrl: z.string().nullable().optional(),
    shareToken: z.string().nullable().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(studioPages)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(studioPages.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

studioRoutes.delete('/pages/:id', async (c) => {
  await db.delete(studioPages).where(eq(studioPages.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// ─── Templates ────────────────────────────────────────
studioRoutes.get('/templates', async (c) => {
  const rows = await db.select().from(studioTemplates).orderBy(studioTemplates.createdAt);
  return c.json({ data: rows, error: null });
});

studioRoutes.post('/templates', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().min(1),
    content: z.record(z.unknown()).optional(),
    author: z.string().optional(),
    authorRole: z.string().optional(),
    isBuiltIn: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.insert(studioTemplates)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

studioRoutes.patch('/templates/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    content: z.record(z.unknown()).optional(),
    author: z.string().optional(),
    authorRole: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(studioTemplates).set(parsed.data)
    .where(eq(studioTemplates.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

studioRoutes.delete('/templates/:id', async (c) => {
  await db.delete(studioTemplates).where(eq(studioTemplates.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

studioRoutes.post('/templates/:id/use', async (c) => {
  const templateId = c.req.param('id');

  // Verify template exists before opening transaction
  const [template] = await db.select().from(studioTemplates)
    .where(eq(studioTemplates.id, templateId)).limit(1);
  if (!template) return c.json({ data: null, error: 'Not found' }, 404);

  const page = await db.transaction(async (tx) => {
    // Atomic SQL-level increment — no read-modify-write race
    await tx.update(studioTemplates)
      .set({ usageCount: sql`${studioTemplates.usageCount} + 1` })
      .where(eq(studioTemplates.id, templateId));

    const [newPage] = await tx.insert(studioPages).values({
      title: template.name,
      content: template.content as Record<string, unknown>,
      createdBy: c.get('userId'),
    }).returning();

    return newPage;
  });

  return c.json({ data: page, error: null }, 201);
});
