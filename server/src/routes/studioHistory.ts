import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { studioPageHistory } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const studioHistoryRoutes = new Hono<AppEnv>();

// List snapshots for a page (metadata only — no snapshot bytes)
studioHistoryRoutes.get('/:pageId/history', async (c) => {
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
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

// Save a new snapshot
studioHistoryRoutes.post('/:pageId/history', async (c) => {
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
  return c.json({ data: row, error: null }, 201);
});
