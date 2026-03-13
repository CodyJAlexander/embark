import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../src/types.js';

// Mock db before importing routes
vi.mock('../src/db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'uuid-1', name: 'Acme', status: 'active' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../src/db/schema.js', () => ({
  clients: {}, clientContacts: {}, clientAssignments: {},
  accountInfo: {}, customFields: {}, checklistItems: {},
  onboardingPhases: {}, milestones: {}, successPlans: {},
  successPlanTasks: {}, communicationLog: {}, clientServices: {},
  clientTags: {}, tags: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), ilike: vi.fn(),
  inArray: vi.fn(), sql: vi.fn(), count: vi.fn().mockReturnValue('count'),
}));

import { clientRoutes } from '../src/routes/clients.js';

// Helper: create app with userId already set (simulates authMiddleware)
function makeApp() {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id');
    c.set('userEmail', 'test@test.com');
    c.set('userRole', 'member');
    await next();
  });
  app.route('/', clientRoutes);
  return app;
}

describe('GET /clients', () => {
  it('returns 200 with data array', async () => {
    const app = makeApp();
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });
});

describe('POST /clients', () => {
  it('returns 422 for missing name', async () => {
    const app = makeApp();
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    expect(res.status).toBe(422);
  });

  it('returns 201 for valid client', async () => {
    const app = makeApp();
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Acme Corp' }),
    });
    expect(res.status).toBe(201);
  });
});
