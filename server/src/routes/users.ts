import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const userRoutes = new Hono<AppEnv>();
