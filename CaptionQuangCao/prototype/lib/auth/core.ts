import { HISTORY_KEY } from '../history.ts';

export const validUserId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function safeNext(value: unknown) { return typeof value === 'string' && ['/create', '/history', '/account'].includes(value) ? value : '/account'; }
export function historyScope(id: string | null): string {
  if (id === null) return HISTORY_KEY;
  if (!validUserId(id)) throw new Error('INVALID_IDENTITY');
  return `${HISTORY_KEY}:user:${id}`;
}
export function authSettings(env: Record<string, string | undefined>) {
  try {
    const url = new URL(env.SUPABASE_URL || ''), site = new URL(env.AUTH_SITE_URL || 'http://127.0.0.1:3000');
    const key = env.SUPABASE_PUBLISHABLE_KEY || '';
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || url.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) || url.href !== `${url.origin}/` ||
      site.username || site.password || site.pathname !== '/' || site.search || site.hash || (site.protocol !== 'https:' && !(site.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(site.hostname)))) return null;
    return { origin: site.origin, url: url.origin, key, googleEnabled: env.AUTH_GOOGLE_ENABLED === 'true' };
  } catch { return null; }
}
export function sameOrigin(request: Request, origin: string) { return request.headers.get('origin') === origin && request.headers.get('sec-fetch-site') !== 'cross-site'; }
export type IdentityLease = { id: string | null; revision: number };
export class IdentityFence {
  revision = 0;
  private id: string | null | undefined;
  private ready = false;
  verify(id: string | null) { if (id !== null && !validUserId(id)) throw new Error('INVALID_IDENTITY'); if (id !== this.id) this.revision++; this.id = id; this.ready = true; }
  suspend() { this.ready = false; }
  fail() { this.ready = false; this.revision++; }
  capture(): IdentityLease { if (!this.ready || this.id === undefined) throw new Error('IDENTITY_UNVERIFIED'); return { id: this.id, revision: this.revision }; }
  current(lease: IdentityLease) { return this.ready && lease.id === this.id && lease.revision === this.revision; }
}
