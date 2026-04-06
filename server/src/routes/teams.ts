import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teams, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

export const teamRoutes = new Hono<AppEnv>();

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function getTeamWithMembers(teamId: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return null;
  const members = await db
    .select({ id: users.id, username: users.username, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.teamId, teamId));
  return { ...team, members };
}

// POST /api/v1/teams — create a new team
teamRoutes.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ name: z.string().min(1).max(100) }).safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Team name is required' }, 422);

  // Ensure invite code is unique (retry on collision)
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const existing = await db.select({ id: teams.id }).from(teams).where(eq(teams.inviteCode, inviteCode)).limit(1);
    if (existing.length === 0) break;
    inviteCode = generateInviteCode();
  }

  const [team] = await db.insert(teams).values({
    name: parsed.data.name,
    inviteCode,
    createdBy: userId,
  }).returning();

  await db.update(users).set({ teamId: team.id }).where(eq(users.id, userId));

  const result = await getTeamWithMembers(team.id);
  return c.json({ data: result, error: null }, 201);
});

// POST /api/v1/teams/join — join by invite code
teamRoutes.post('/join', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ inviteCode: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: 'Invite code is required' }, 422);

  const [team] = await db.select().from(teams)
    .where(eq(teams.inviteCode, parsed.data.inviteCode.toUpperCase().trim()))
    .limit(1);
  if (!team) return c.json({ data: null, error: 'Invalid invite code', code: 'NOT_FOUND' }, 404);

  await db.update(users).set({ teamId: team.id }).where(eq(users.id, userId));

  const result = await getTeamWithMembers(team.id);
  return c.json({ data: result, error: null });
});

// GET /api/v1/teams/me — get current user's team + members
teamRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const [user] = await db.select({ teamId: users.teamId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.teamId) return c.json({ data: null, error: null });

  const result = await getTeamWithMembers(user.teamId);
  return c.json({ data: result, error: null });
});
