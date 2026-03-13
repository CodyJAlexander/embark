import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const automationRoutes = new Hono<AppEnv>();
