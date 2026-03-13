import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';

export const authMiddleware = createMiddleware<AppEnv>(async (_c, next) => {
  await next();
});
