import type { Env } from './env';

const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';
const MAX_AGE = '86400';

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Return the CORS headers for a request, or null when the browser origin is
 * not allowlisted. Requests without an Origin header (curl, server-to-server)
 * are not blocked by CORS; the endpoint still validates every payload.
 */
export function corsHeaders(request: Request, env: Env): Headers | null {
  const headers = new Headers();
  headers.set('Vary', 'Origin');

  const origin = request.headers.get('Origin');
  if (!origin) return headers;

  const normalized = origin.replace(/\/+$/, '');
  if (!allowedOrigins(env).includes(normalized)) return null;

  headers.set('Access-Control-Allow-Origin', normalized);
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  headers.set('Access-Control-Max-Age', MAX_AGE);
  return headers;
}

export function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  return !origin || allowedOrigins(env).includes(origin.replace(/\/+$/, ''));
}
