import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Lazily initialized at first request — module-scoped so cache is reused
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
  }
  return JWKS;
}

// No-op if CF_ACCESS_TEAM_DOMAIN not configured
export const cfAccessMiddleware = createMiddleware(async (c, next) => {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;
  const assertion = c.req.header('CF-Access-Jwt-Assertion');

  if (!teamDomain || !aud || !assertion) {
    return next();
  }

  try {
    await jwtVerify(assertion, getJWKS(teamDomain), { audience: aud });
    return next();
  } catch {
    return c.json({ data: null, error: 'Cloudflare Access verification failed', code: 'FORBIDDEN' }, 403);
  }
});
