import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const authRoutes = new Hono<AppEnv>();
