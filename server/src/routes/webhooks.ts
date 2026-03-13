import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const webhookRoutes = new Hono<AppEnv>();
