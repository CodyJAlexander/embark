import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { AppEnv } from '../types.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ data: null, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Runtime validation of required claims
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return c.json({ data: null, error: 'Invalid token claims', code: 'UNAUTHORIZED' }, 401);
    }

    c.set('userId',    payload.sub);
    c.set('userEmail', payload.email as string);
    c.set('userRole',  payload.role as string);
    await next();
  } catch {
    return c.json({ data: null, error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401);
  }
});
