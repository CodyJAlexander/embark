import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const userRoutes = new Hono<AppEnv>();

userRoutes.get('/', async (c) => {
  const rows = await db.select({
    id: users.id, email: users.email, username: users.username,
    role: users.role, avatarUrl: users.avatarUrl, characterClass: users.characterClass,
    teamId: users.teamId, onboardingComplete: users.onboardingComplete,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt);
  return c.json({ data: rows, error: null });
});

userRoutes.get('/:id', async (c) => {
  const [row] = await db.select({
    id: users.id, email: users.email, username: users.username,
    role: users.role, avatarUrl: users.avatarUrl, characterClass: users.characterClass,
    teamId: users.teamId, onboardingComplete: users.onboardingComplete,
    preferences: users.preferences, createdAt: users.createdAt,
  }).from(users).where(eq(users.id, c.req.param('id'))).limit(1);
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});

userRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    username: z.string().min(2).max(50).optional(),
    avatarUrl: z.string().url().optional(),
    characterClass: z.string().optional(),
    preferences: z.record(z.unknown()).optional(),
    onboardingComplete: z.boolean().optional(),
    teamId: z.string().uuid().nullable().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed', details: parsed.error.flatten() }, 422);
  const [row] = await db.update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, c.req.param('id'))).returning({
      id: users.id, email: users.email, username: users.username,
      role: users.role, avatarUrl: users.avatarUrl, characterClass: users.characterClass,
      onboardingComplete: users.onboardingComplete, preferences: users.preferences,
      teamId: users.teamId,
    });
  if (!row) return c.json({ data: null, error: 'Not found' }, 404);
  return c.json({ data: row, error: null });
});
