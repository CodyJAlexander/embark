import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const clientRoutes = new Hono<AppEnv>();
