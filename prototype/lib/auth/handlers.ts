import { authSettings, safeNext, sameOrigin } from './core.ts';
import { authCookie, privateHeaders, requestContext, verifiedUser } from './supabase.ts';
import type { Settings, AuthContext } from './supabase.ts';
import { readPasswordInput, passwordFailure } from './password.ts';

const failure = (status: number, code: string) => Response.json({ error: { code, message: 'Chưa xác minh được đăng nhập. Hãy thử lại hoặc chủ động chuyển về chế độ khách.' } }, { status, headers: privateHeaders() });
const redirect = (url: string, headers: Headers) => { headers.set('Location', url); return new Response(null, { status: 303, headers }); };
async function postedNext(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded' || Number(request.headers.get('content-length')) > 2048) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) return '/account';
  const signal = AbortSignal.timeout(5000), cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    let size = 0, text = ''; const decoder = new TextDecoder('utf-8', { fatal: true });
    while (true) {
      const { value, done } = await reader.read(); signal.throwIfAborted();
      if (done) return safeNext(new URLSearchParams(text + decoder.decode()).get('next'));
      size += value.byteLength; if (size > 2048) throw new Error('INVALID_INPUT');
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
export function createAuthHandlers({ settings = () => authSettings(process.env), context = requestContext }: { settings?: () => Settings | null; context?: (r: Request, s: Settings) => AuthContext } = {}) {
  return {
    async session(request: Request) {
      const config = settings();
      if (!config) {
        if (request.headers.get('cookie')?.split(';').some(c => authCookie(c.trim().split('=')[0]))) return failure(503, 'AUTH_NOT_CONFIGURED');
        return Response.json({ status: 'guest', user: null, configured: false, loginEnabled: false, emailEnabled: false }, { headers: privateHeaders() });
      }
      const ctx = context(request, config);
      if (!ctx.hasSession) return Response.json({ status: 'guest', user: null, configured: true, loginEnabled: config.googleEnabled, emailEnabled: config.emailEnabled }, { headers: ctx.headers });
      try { return Response.json({ status: 'authenticated', user: await verifiedUser(ctx.client), configured: true, loginEnabled: config.googleEnabled, emailEnabled: config.emailEnabled }, { headers: ctx.headers }); }
      catch { return failure(401, 'SESSION_UNVERIFIED'); }
    },
    async login(request: Request) {
      const config = settings();
      if (!config || !config.googleEnabled) return failure(503, 'AUTH_NOT_CONFIGURED');
      if (!sameOrigin(request, config.origin)) return failure(403, 'INVALID_ORIGIN');
      const ctx = context(request, config);
      let next;
      try { next = await postedNext(request); } catch { return failure(422, 'INVALID_INPUT'); }
      try {
        const { data, error } = await ctx.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${config.origin}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true, scopes: 'openid email profile', queryParams: { prompt: 'select_account' } } });
        if (error || !data.url || new URL(data.url).origin !== config.url) return redirect(`${config.origin}/login?error=configuration`, ctx.headers);
        return redirect(data.url, ctx.headers);
      } catch { return redirect(`${config.origin}/login?error=configuration`, ctx.headers); }
    },
    async password(request: Request) {
      const config = settings();
      if (!config || !config.emailEnabled) return passwordFailure(503, 'AUTH_NOT_CONFIGURED');
      if (!sameOrigin(request, config.origin)) return passwordFailure(403, 'INVALID_ORIGIN');
      let input;
      try { input = await readPasswordInput(request); } catch { return passwordFailure(422, 'INVALID_INPUT'); }
      const ctx = context(request, config);
      try {
        const { error } = await ctx.client.auth.signInWithPassword({ email: input.email, password: input.password });
        if (error) { ctx.clear(); return passwordFailure(error.status === 429 ? 429 : error.status && error.status >= 500 ? 503 : 401, error.status === 429 ? 'RATE_LIMITED' : error.status && error.status >= 500 ? 'AUTH_UNAVAILABLE' : 'INVALID_CREDENTIALS', ctx.headers); }
        await verifiedUser(ctx.client);
        return Response.json({ status: 'authenticated', next: input.next }, { headers: ctx.headers });
      } catch { ctx.clear(); return passwordFailure(503, 'AUTH_UNAVAILABLE', ctx.headers); }
    },
    async callback(request: Request) {
      const config = settings();
      if (!config) return failure(503, 'AUTH_NOT_CONFIGURED');
      const ctx = context(request, config), url = new URL(request.url), code = url.searchParams.get('code');
      try {
        if (url.searchParams.has('error') || !code || code.length > 4096) throw new Error('OAUTH_FAILED');
        const { error } = await ctx.client.auth.exchangeCodeForSession(code);
        if (error) throw new Error('OAUTH_FAILED');
        await verifiedUser(ctx.client);
        return redirect(config.origin + safeNext(url.searchParams.get('next')), ctx.headers);
      } catch { ctx.clear(); return redirect(`${config.origin}/login?error=oauth`, ctx.headers); }
    },
    async logout(request: Request) {
      const config = settings();
      if (!config) return failure(503, 'AUTH_NOT_CONFIGURED');
      if (!sameOrigin(request, config.origin)) return failure(403, 'INVALID_ORIGIN');
      const ctx = context(request, config);
      try {
        if (ctx.hasSession) { const { error } = await ctx.client.auth.signOut({ scope: 'local' }); if (error) return failure(503, 'SIGNOUT_FAILED'); }
        ctx.clear();
        return Response.json({ status: 'guest', user: null }, { headers: ctx.headers });
      } catch { return failure(503, 'SIGNOUT_FAILED'); }
    },
  };
}
