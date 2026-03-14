import { Hono } from 'hono';
import { db } from '../db/index.js';
import { studioPages } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { assertPageOwner } from './_pageAuth.js';

export const studioShareRoutes = new Hono<AppEnv>();
export const studioPublicRoutes = new Hono(); // no auth env needed

// POST /:id/share — generate share token (requires auth)
studioShareRoutes.post('/:id/share', async (c) => {
  const pageId = c.req.param('id');
  if (!(await assertPageOwner(pageId, c.get('userId'))))
    return c.json({ data: null, error: 'Not found' }, 404);

  // Generate a UUID token
  const { randomUUID } = await import('crypto');
  const shareToken = randomUUID();

  const [row] = await db.update(studioPages)
    .set({ shareToken })
    .where(eq(studioPages.id, pageId))
    .returning({ id: studioPages.id, shareToken: studioPages.shareToken });

  return c.json({ data: row, error: null });
});

// DELETE /:id/share — revoke share token (requires auth)
studioShareRoutes.delete('/:id/share', async (c) => {
  const pageId = c.req.param('id');
  if (!(await assertPageOwner(pageId, c.get('userId'))))
    return c.json({ data: null, error: 'Not found' }, 404);

  await db.update(studioPages)
    .set({ shareToken: null })
    .where(eq(studioPages.id, pageId));

  return c.json({ data: { ok: true }, error: null });
});

// GET /public/pages/:token — unprotected, returns page content
studioPublicRoutes.get('/public/pages/:token', async (c) => {
  const [row] = await db.select({
    id:      studioPages.id,
    title:   studioPages.title,
    icon:    studioPages.icon,
    content: studioPages.content,
  }).from(studioPages)
    .where(eq(studioPages.shareToken, c.req.param('token')))
    .limit(1);

  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});
