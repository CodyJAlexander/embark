import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const serviceRoutes = new Hono<AppEnv>();
