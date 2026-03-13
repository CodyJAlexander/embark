import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock the db module before importing routes
vi.mock('../src/db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{
      id: 'test-uuid-123',
      email: 'test@interworks.com',
      username: 'testuser',
      role: 'member',
    }]),
    delete: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../src/db/schema.js', () => ({
  users: {},
  sessions: {},
}));

import { authRoutes } from '../src/routes/auth.js';

describe('POST /register', () => {
  it('returns 422 for invalid body', async () => {
    const app = new Hono();
    app.route('/', authRoutes);
    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /login', () => {
  it('returns 422 for missing fields', async () => {
    const app = new Hono();
    app.route('/', authRoutes);
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });
});
