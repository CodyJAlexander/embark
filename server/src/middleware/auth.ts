import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { AppEnv } from '../types.js';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ data: null, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    c.set('userId',    payload.sub as string);
    c.set('userEmail', payload.email as string);
    c.set('userRole',  payload.role as string);
    await next();
  } catch {
    return c.json({ data: null, error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401);
  }
});
