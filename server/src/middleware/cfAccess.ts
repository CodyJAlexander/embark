import { createMiddleware } from 'hono/factory';

export const cfAccessMiddleware = createMiddleware(async (_c, next) => {
  await next();
});
