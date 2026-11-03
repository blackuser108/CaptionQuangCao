import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { authSettings, validUserId } from './core.ts';

export type Settings = NonNullable<ReturnType<typeof authSettings>>;
export const authCookie = (name: string) => /^bbt-auth(?:\.\d+|-code-verifier(?:\.\d+)?)?$/.test(name);
export const sessionCookie = (name: string) => /^bbt-auth(?:\.\d+)?$/.test(name);
export const privateHeaders = () => new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie', Pragma: 'no-cache', Expires: '0', 'X-Content-Type-Options': 'nosniff' });

export function requestContext(request: Request, settings: Settings) {
  const values = parseCookieHeader(request.headers.get('cookie') || '').filter((c): c is { name: string; value: string } => c.value !== undefined);
  const headers = privateHeaders();
  const cookieOptions = { name: 'bbt-auth', path: '/', httpOnly: true, sameSite: 'lax' as const, secure: settings.origin.startsWith('https:') };
  const client = createServerClient(settings.url, settings.key, {
    cookieOptions,
    global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store', signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }) },
    cookies: {
      getAll: () => values,
      setAll: (cookies, cacheHeaders) => {
        for (const { name, value, options } of cookies) {
          const found = values.find(c => c.name === name);
          if (found) found.value = value; else values.push({ name, value });
          headers.append('Set-Cookie', serializeCookieHeader(name, value, { ...options, ...cookieOptions }));
        }
        for (const [name, value] of Object.entries(cacheHeaders)) headers.set(name, value);
      },
    },
  });
  return {
    client, headers, hasSession: values.some(c => sessionCookie(c.name) && !!c.value),
    clear() { for (const cookie of values.filter(c => authCookie(c.name))) headers.append('Set-Cookie', serializeCookieHeader(cookie.name, '', { ...cookieOptions, maxAge: 0 })); },
  };
}
export type AuthContext = ReturnType<typeof requestContext>;
export async function verifiedUser(client: AuthContext['client']) {
  const { data, error } = await client.auth.getUser();
  if (error || !validUserId(data.user?.id)) throw new Error('IDENTITY_UNVERIFIED');
  return { id: data.user.id, email: data.user.email || null };
}
