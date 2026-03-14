import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { studioPageHistory } from '../db/schema.js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { assertPageOwner } from './_pageAuth.js';

export const studioHistoryRoutes = new Hono<AppEnv>();

// Helper: prune snapshots beyond the 50 most recent for a page
async function pruneHistory(pageId: string): Promise<void> {
  const rows = await db
    .select({ id: studioPageHistory.id })
    .from(studioPageHistory)
    .where(eq(studioPageHistory.pageId, pageId))
    .orderBy(desc(studioPageHistory.createdAt))
    .offset(50);
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    await db.delete(studioPageHistory).where(inArray(studioPageHistory.id, ids));
  }
}

// List snapshots for a page (metadata only — no snapshot bytes)
studioHistoryRoutes.get('/:pageId/history', async (c) => {
  if (!(await assertPageOwner(c.req.param('pageId'), c.get('userId')))) {
    return c.json({ data: null, error: 'Not found' }, 404);
  }
  const rows = await db
    .select({
      id:        studioPageHistory.id,
      pageId:    studioPageHistory.pageId,
      userId:    studioPageHistory.userId,
      createdAt: studioPageHistory.createdAt,
    })
    .from(studioPageHistory)
    .where(eq(studioPageHistory.pageId, c.req.param('pageId')))
    .orderBy(desc(studioPageHistory.createdAt))
    .limit(50);
  return c.json({ data: rows, error: null });
});

// Get a specific snapshot (includes snapshot bytes for restore)
studioHistoryRoutes.get('/:pageId/history/:snapshotId', async (c) => {
  const [row] = await db
    .select()
    .from(studioPageHistory)
    .where(eq(studioPageHistory.id, c.req.param('snapshotId')))
    .limit(1);
  // After fetching the row, verify it belongs to the requested page
  if (!row || row.pageId !== c.req.param('pageId')) return c.json({ data: null, error: 'Not found' }, 404);
  // Then check ownership
  if (!(await assertPageOwner(row.pageId, c.get('userId')))) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// Save a new snapshot
studioHistoryRoutes.post('/:pageId/history', async (c) => {
  if (!(await assertPageOwner(c.req.param('pageId'), c.get('userId')))) {
    return c.json({ data: null, error: 'Forbidden' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    snapshot: z.string().min(1), // base64 Yjs state
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);

  const [row] = await db.insert(studioPageHistory).values({
    pageId:   c.req.param('pageId'),
    userId:   c.get('userId'),
    snapshot: parsed.data.snapshot,
  }).returning();

  try {
    await pruneHistory(c.req.param('pageId'));
  } catch (err) {
    console.error('Failed to prune history snapshots:', err);
  }

  return c.json({ data: row, error: null }, 201);
});
