import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const studioRoutes = new Hono<AppEnv>();
