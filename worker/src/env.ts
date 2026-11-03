export interface Env {
  DB: D1Database;
  /** `production` or `dev`; dev enables the `?token=` dashboard fallback. */
  ENVIRONMENT: string;
  /** Comma-separated allowlist of browser origins. */
  ALLOWED_ORIGINS: string;
  /** Comma-separated Access identities allowed into /admin. Empty means any Access user. */
  ADMIN_EMAILS: string;
  /** Accept the Access-injected email header. Keep false until Access fronts the hostname. */
  TRUST_ACCESS_HEADER: string;
  /** Optional bearer token for curl and local dashboard access. Store as a secret. */
  ADMIN_TOKEN?: string;
}
