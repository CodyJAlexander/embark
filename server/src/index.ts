import { serve } from '@hono/node-server';
import type { Server } from 'http';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppEnv } from './types.js';
import { authRoutes } from './routes/auth.js';
import { clientRoutes } from './routes/clients.js';
import { studioRoutes } from './routes/studio.js';
import { studioHistoryRoutes } from './routes/studioHistory.js';
import { studioCommentRoutes } from './routes/studioComments.js';
import { studioShareRoutes, studioPublicRoutes } from './routes/studioShare.js';
import { templateRoutes } from './routes/templates.js';
import { budRoutes } from './routes/buds.js';
import { automationRoutes } from './routes/automations.js';
import { webhookRoutes } from './routes/webhooks.js';
import { formRoutes } from './routes/forms.js';
import { userRoutes } from './routes/users.js';
import { teamRoutes } from './routes/teams.js';
import { gamificationRoutes } from './routes/gamification.js';
import { serviceRoutes } from './routes/services.js';
import { tagRoutes } from './routes/tags.js';
import { authMiddleware } from './middleware/auth.js';
import { cfAccessMiddleware } from './middleware/cfAccess.js';
import { attachYjsWebSocket } from './ws/yjsHandler.js';

const app = new Hono<AppEnv>();

// ─── Global middleware ────────────────────────────────
app.use('*', logger());
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',').map(o => o.trim()).filter(Boolean);

// Tauri v2 serves the frontend from http://tauri.localhost — always allow it
if (!allowedOrigins.includes('http://tauri.localhost')) {
  allowedOrigins.push('http://tauri.localhost');
}
if (!allowedOrigins.includes('https://tauri.localhost')) {
  allowedOrigins.push('https://tauri.localhost');
}

app.use('*', cors({
  origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
  credentials: true,
}));

// ─── Cloudflare Access (optional, no-op if header absent) ──
app.use('*', cfAccessMiddleware);

// ─── Public routes (no auth required) ────────────────
app.route('/api/v1/auth', authRoutes);
// Form responses are public — mounted before auth middleware
app.post('/api/v1/forms/:id/responses', (c) => formRoutes.fetch(c.req.raw));
// Public share route — mounted before authMiddleware
app.route('/api/v1', studioPublicRoutes);  // mounts at /api/v1/public/pages/:token

// ─── Protected routes ─────────────────────────────────
app.use('/api/v1/*', authMiddleware);
app.route('/api/v1/clients',      clientRoutes);
app.route('/api/v1/studio',       studioRoutes);
app.route('/api/v1/studio/pages', studioHistoryRoutes);
app.route('/api/v1/studio/pages', studioCommentRoutes);
app.route('/api/v1/studio/pages', studioShareRoutes);
app.route('/api/v1/templates',    templateRoutes);
app.route('/api/v1/buds',         budRoutes);
app.route('/api/v1/automations',  automationRoutes);
app.route('/api/v1/webhooks',     webhookRoutes);
app.route('/api/v1/forms',        formRoutes);
app.route('/api/v1/users',        userRoutes);
app.route('/api/v1/teams',        teamRoutes);
app.route('/api/v1/gamification', gamificationRoutes);
app.route('/api/v1/services',     serviceRoutes);
app.route('/api/v1/tags',         tagRoutes);

// ─── Health check ─────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok' }));

// ─── 404 handler ──────────────────────────────────────
app.notFound((c) => c.json({ data: null, error: 'Not found', code: 'NOT_FOUND' }, 404));

// ─── Error handler ────────────────────────────────────
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path}`, err);
  return c.json({ data: null, error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

const port = Number(process.env.PORT ?? 3001);
console.log(`API server running on port ${port}`);
const httpServer = serve({ fetch: app.fetch, port }) as unknown as Server;
attachYjsWebSocket(httpServer); // return value intentionally ignored in production

export default app;
