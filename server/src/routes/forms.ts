import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

export const formRoutes = new Hono<AppEnv>();
