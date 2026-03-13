import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const budRoutes = new Hono<AppEnv>();
