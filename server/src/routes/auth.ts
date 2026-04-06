import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import { signToken } from '../lib/jwt.js';
import { createHash } from 'crypto';
import type { AppEnv } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRoutes = new Hono<AppEnv>();

const registerSchema = z.object({
  email:    z.string().email(),
  username: z.string().min(2).max(50),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email:    z.string().min(1),   // accepts username or email
  password: z.string(),
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

authRoutes.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR',
      details: parsed.error.flatten() }, 422);
  }

  const { email, username, password } = parsed.data;

  const existing = await db.select().from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  if (existing.length > 0) {
    return c.json({ data: null, error: 'Email or username already taken', code: 'CONFLICT' }, 422);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, username, passwordHash })
    .returning({ id: users.id, email: users.email, username: users.username, role: users.role });

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(token), expiresAt });

  return c.json({ data: { token, user }, error: null }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ data: null, error: 'Validation failed', code: 'VALIDATION_ERROR' }, 422);
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(users)
    .where(or(eq(users.email, email), eq(users.username, email)))
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ data: null, error: 'Invalid credentials', code: 'UNAUTHORIZED' }, 401);
  }

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(token), expiresAt });

  const { passwordHash: _, ...safeUser } = user;
  return c.json({ data: { token, user: safeUser }, error: null });
});

authRoutes.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.slice(7);
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  return c.json({ data: { ok: true }, error: null });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ data: null, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

  const [user] = await db.select({
    id: users.id, email: users.email, username: users.username,
    role: users.role, avatarUrl: users.avatarUrl, characterClass: users.characterClass,
    onboardingComplete: users.onboardingComplete, preferences: users.preferences,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user) return c.json({ data: null, error: 'User not found', code: 'NOT_FOUND' }, 404);
  return c.json({ data: user, error: null });
});
