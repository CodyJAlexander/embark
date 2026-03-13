import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { gamificationState } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const gamificationRoutes = new Hono<AppEnv>();

gamificationRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const [row] = await db.select().from(gamificationState)
    .where(eq(gamificationState.userId, userId)).limit(1);
  if (!row) return c.json({ data: { xp: 0, level: 1, streak: 0, weeklyXp: 0, deeds: [] }, error: null });
  return c.json({ data: row, error: null });
});

gamificationRoutes.post('/deeds/:deedId', async (c) => {
  const userId = c.get('userId');
  const deedId = c.req.param('deedId');
  const body = await c.req.json().catch(() => ({}));
  const schema = z.object({
    xpReward: z.number().int().min(0).optional().default(10),
    label: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Validation failed' }, 422);

  const { xpReward, label } = parsed.data;
  const deed = { id: deedId, label: label ?? deedId, unlockedAt: new Date().toISOString() };

  // Get existing state
  const [existing] = await db.select().from(gamificationState)
    .where(eq(gamificationState.userId, userId)).limit(1);

  if (existing) {
    // Check if deed already unlocked
    const deeds = existing.deeds as Array<{ id: string }>;
    if (deeds.some((d) => d.id === deedId)) {
      return c.json({ data: existing, error: null }); // Idempotent
    }

    // Append deed and add XP atomically
    const newXp = existing.xp + xpReward;
    const newLevel = Math.floor(newXp / 100) + 1;
    const [updated] = await db.update(gamificationState).set({
      xp: newXp,
      level: newLevel,
      weeklyXp: existing.weeklyXp + xpReward,
      deeds: sql`deeds || ${JSON.stringify([deed])}::jsonb`,
      updatedAt: new Date(),
    }).where(eq(gamificationState.userId, userId)).returning();
    return c.json({ data: updated, error: null });
  } else {
    // Create new gamification state
    const [created] = await db.insert(gamificationState).values({
      userId,
      xp: xpReward,
      level: 1,
      weeklyXp: xpReward,
      deeds: [deed],
    }).returning();
    return c.json({ data: created, error: null }, 201);
  }
});
