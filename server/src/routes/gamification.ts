import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const gamificationRoutes = new Hono<AppEnv>();
