import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { tags, clientTags } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const tagRoutes = new Hono<AppEnv>();

tagRoutes.get('/', async (c) => {
  const rows = await db.select().from(tags).orderBy(tags.name);
  return c.json({ data: rows, error: null });
});

tagRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(tags).values(parsed.data).returning();
  return c.json({ data: row, error: null }, 201);
});

tagRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    color: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(tags).set(parsed.data)
    .where(eq(tags.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

tagRoutes.delete('/:id', async (c) => {
  await db.delete(tags).where(eq(tags.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});

// Assign/remove tag on a client
tagRoutes.post('/clients/:clientId/tags/:tagId', async (c) => {
  const [row] = await db.insert(clientTags).values({
    clientId: c.req.param('clientId'),
    tagId: c.req.param('tagId'),
  }).returning();
  return c.json({ data: row, error: null }, 201);
});

tagRoutes.delete('/clients/:clientId/tags/:tagId', async (c) => {
  await db.delete(clientTags).where(
    eq(clientTags.clientId, c.req.param('clientId'))
  );
  return c.json({ data: { ok: true }, error: null });
});
