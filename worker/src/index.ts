import dashboardHtml from './dashboard.html';
import { getAdminIdentity, getLocalTokenIdentity } from './auth';
import { corsHeaders, isOriginAllowed } from './cors';
import { handleIngest, json } from './ingest';
import { getStats, pruneOldEvents } from './stats';
import type { Env } from './env';

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

const DASHBOARD_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

function withSecurity(headers: Headers): Headers {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return headers;
}

function html(body: string, status = 200): Response {
  const headers = withSecurity(new Headers());
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Security-Policy', DASHBOARD_CSP);
  return new Response(body, { status, headers });
}

function text(body: string, status: number): Response {
  const headers = withSecurity(new Headers());
  headers.set('Content-Type', 'text/plain; charset=utf-8');
  return new Response(body, { status, headers });
}

function authorized(request: Request, env: Env, url: URL) {
  return getAdminIdentity(request, env) ?? getLocalTokenIdentity(url, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/v1/events') {
      const cors = corsHeaders(request, env);

      if (request.method === 'OPTIONS') {
        if (!cors) return text('Origin not allowed', 403);
        return new Response(null, { status: 204, headers: cors });
      }

      if (request.method !== 'POST') {
        return text('Method not allowed', 405);
      }

      if (!isOriginAllowed(request, env)) {
        return text('Origin not allowed', 403);
      }

      const response = await handleIngest(request, env);
      if (cors) {
        cors.forEach((value, key) => response.headers.set(key, value));
      }
      return response;
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'polplay-analytics' }, 200, withSecurity(new Headers()));
    }

    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(url.origin + '/admin', 302);
    }

    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      const identity = authorized(request, env, url);
      if (!identity) {
        return text(
          'Not authorised. This page is protected by Cloudflare Access; sign in with an allowed account.',
          401
        );
      }
      return html(dashboardHtml);
    }

    if (url.pathname === '/admin/api/stats') {
      const identity = authorized(request, env, url);
      if (!identity) {
        return json({ error: 'unauthorized' }, 401, withSecurity(new Headers()));
      }

      const requested = Number(url.searchParams.get('days') ?? '30');
      const days = [7, 30, 90, 365].includes(requested) ? requested : 30;

      try {
        const stats = await getStats(env.DB, days);
        return json(stats, 200, withSecurity(new Headers()));
      } catch (error) {
        console.error('stats failed', error);
        return json({ error: 'stats failed' }, 500, withSecurity(new Headers()));
      }
    }

    return text('Not found', 404);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      pruneOldEvents(env.DB)
        .then((deleted) => console.log(`retention: deleted ${deleted} events`))
        .catch((error) => console.error('retention failed', error))
    );
  },
};
