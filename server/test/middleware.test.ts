import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth.js';

describe('authMiddleware', () => {
  it('returns 401 when no Authorization header', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed token', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer notavalidtoken' },
    });
    expect(res.status).toBe(401);
  });
});
