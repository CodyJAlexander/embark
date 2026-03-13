import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { services } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const serviceRoutes = new Hono<AppEnv>();

serviceRoutes.get('/', async (c) => {
  const rows = await db.select().from(services).orderBy(services.createdAt);
  return c.json({ data: rows, error: null });
});

serviceRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal number').optional(),
    category: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.insert(services)
    .values({ createdBy: c.get('userId'), ...parsed.data }).returning();
  return c.json({ data: row, error: null }, 201);
});

serviceRoutes.get('/:id', async (c) => {
  const [row] = await db.select().from(services)
    .where(eq(services.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

serviceRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal number').optional(),
    category: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);
  const [row] = await db.update(services).set(parsed.data)
    .where(eq(services.id, c.req.param('id'))).returning();
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

serviceRoutes.delete('/:id', async (c) => {
  await db.delete(services).where(eq(services.id, c.req.param('id')));
  return c.json({ data: { ok: true }, error: null });
});
