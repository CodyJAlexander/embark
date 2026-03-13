import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { studioComments, studioPages } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const studioCommentRoutes = new Hono<AppEnv>();

// Assert page ownership helper
async function assertPageOwner(pageId: string, userId: string): Promise<boolean> {
  const [p] = await db.select({ id: studioPages.id }).from(studioPages)
    .where(and(eq(studioPages.id, pageId), eq(studioPages.createdBy, userId))).limit(1);
  return !!p;
}

// List open comments for a page
studioCommentRoutes.get('/:pageId/comments', async (c) => {
  if (!(await assertPageOwner(c.req.param('pageId'), c.get('userId'))))
    return c.json({ data: null, error: 'Not found' }, 404);

  const rows = await db.select().from(studioComments)
    .where(and(eq(studioComments.pageId, c.req.param('pageId')), isNull(studioComments.resolvedAt)))
    .orderBy(studioComments.createdAt);
  return c.json({ data: rows, error: null });
});

// Add a comment
studioCommentRoutes.post('/:pageId/comments', async (c) => {
  if (!(await assertPageOwner(c.req.param('pageId'), c.get('userId'))))
    return c.json({ data: null, error: 'Not found' }, 404);

  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    commentId: z.string().min(1),  // the mark ID
    body:      z.string().min(1),
    parentId:  z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);

  const [row] = await db.insert(studioComments).values({
    pageId:    c.req.param('pageId'),
    userId:    c.get('userId'),
    commentId: parsed.data.commentId,
    body:      parsed.data.body,
    parentId:  parsed.data.parentId ?? null,
  }).returning();
  return c.json({ data: row, error: null }, 201);
});

// Resolve a comment
studioCommentRoutes.patch('/:pageId/comments/:id/resolve', async (c) => {
  if (!(await assertPageOwner(c.req.param('pageId'), c.get('userId'))))
    return c.json({ data: null, error: 'Not found' }, 404);

  const [row] = await db.update(studioComments)
    .set({ resolvedAt: new Date() })
    .where(and(eq(studioComments.id, c.req.param('id')), eq(studioComments.pageId, c.req.param('pageId'))))
    .returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// Delete a comment
studioCommentRoutes.delete('/:pageId/comments/:id', async (c) => {
  if (!(await assertPageOwner(c.req.param('pageId'), c.get('userId'))))
    return c.json({ data: null, error: 'Not found' }, 404);
  await db.delete(studioComments)
    .where(and(eq(studioComments.id, c.req.param('id')), eq(studioComments.pageId, c.req.param('pageId'))));
  return c.json({ data: { ok: true }, error: null });
});
