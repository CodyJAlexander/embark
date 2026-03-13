import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const tagRoutes = new Hono<AppEnv>();
