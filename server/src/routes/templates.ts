import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const templateRoutes = new Hono<AppEnv>();
