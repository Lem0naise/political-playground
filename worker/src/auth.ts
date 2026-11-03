import type { Env } from './env';

function adminEmails(env: Env): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export interface AdminIdentity {
  email: string;
  via: 'access' | 'token';
}

/**
 * Cloudflare Access injects `Cf-Access-Authenticated-User-Email` after it has
 * validated the request. Do not trust a client-supplied header on a hostname
 * that is not behind Access. ADMIN_TOKEN exists for curl and local dev.
 */
export function getAdminIdentity(request: Request, env: Env): AdminIdentity | null {
  const email = request.headers.get('cf-access-authenticated-user-email')?.trim().toLowerCase();
  if (email && env.TRUST_ACCESS_HEADER === 'true') {
    const allowed = adminEmails(env);
    if (allowed.length === 0 || allowed.includes(email)) {
      return { email, via: 'access' };
    }
    return null;
  }

  if (env.ADMIN_TOKEN) {
    const authorization = request.headers.get('Authorization');
    if (authorization === `Bearer ${env.ADMIN_TOKEN}`) {
      return { email: 'admin-token', via: 'token' };
    }
  }

  return null;
}

/**
 * Local-only convenience: wrangler dev has no Access in front of it, so the
 * dashboard may pass its token as a query parameter. This is disabled in
 * production.
 */
export function getLocalTokenIdentity(url: URL, env: Env): AdminIdentity | null {
  if (env.ENVIRONMENT !== 'dev' || !env.ADMIN_TOKEN) return null;
  return url.searchParams.get('token') === env.ADMIN_TOKEN
    ? { email: 'local-token', via: 'token' }
    : null;
}
