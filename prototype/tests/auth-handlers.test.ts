import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthHandlers } from '../lib/auth/handlers.ts';
import { requestContext } from '../lib/auth/supabase.ts';

const id = '11111111-1111-4111-8111-111111111111';
const settings = { origin: 'http://127.0.0.1:3000', url: 'https://abcdefghijklmnopqrst.supabase.co', key: 'sb_publishable_test', googleEnabled: true };
const req = (path: string, body?: string, origin = settings.origin) => new Request(settings.origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded', cookie: 'bbt-auth=test-cookie' }, body });
function setup(change = {}, configured = true) {
  const calls: string[] = [];
  const auth = {
    getUser: async () => { calls.push('getUser'); return { data: { user: { id, email: 'demo@example.test', role: 'never-expose', user_metadata: { id: 'spoof' } } }, error: null }; },
    signInWithOAuth: async (options: unknown) => { calls.push(JSON.stringify(options)); return { data: { url: settings.url + '/auth/v1/authorize?provider=google' }, error: null }; },
    exchangeCodeForSession: async () => { calls.push('exchange'); return { data: {}, error: null }; },
    signOut: async () => { calls.push('signOut'); return { error: null }; },
    ...change,
  };
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  const run = createAuthHandlers({ settings: () => configured ? settings : null, context: () => ({ client: { auth } as never, headers, hasSession: true, clear: () => { calls.push('clear'); } }) });
  return { run, calls };
}
test('session returns only getUser-verified public identity, never client/session/user_metadata id', async () => {
  const { run, calls } = setup();
  const response = await run.session(req('/api/auth/session?userId=spoof'));
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).user, { id, email: 'demo@example.test' });
  assert.deepEqual(calls, ['getUser']); assert.match(response.headers.get('cache-control') || '', /private, no-store/);
});
test('verification failure stays unverified, never silently falls back to guest', async () => {
  const { run } = setup({ getUser: async () => ({ data: { user: null }, error: { message: 'PRIVATE_SECRET' } }) });
  const response = await run.session(req('/api/auth/session'));
  assert.equal(response.status, 401); assert.doesNotMatch(await response.text(), /PRIVATE_SECRET/);
});
test('login enforces origin, internal redirect, Google only and propagates PKCE cookie', async () => {
  const { run, calls } = setup();
  assert.equal((await run.login(req('/auth/login', 'next=/create', 'https://evil.com'))).status, 403);
  const result = await run.login(req('/auth/login', 'next=https://evil.com'));
  assert.equal(result.status, 303); assert.ok(result.headers.get('location')?.startsWith(settings.url));
  assert.match(calls[0], /google/); assert.match(calls[0], /auth\/callback\?next=%2Faccount/);
  assert.doesNotMatch(calls[0], /evil.com/);
});
test('callback exchanges code, checks server user, rejects cancel/error and unsafe destinations', async () => {
  const { run, calls } = setup();
  const r = await run.callback(req('/auth/callback?code=one-time&next=https://evil.com'));
  assert.equal(r.status, 303); assert.equal(r.headers.get('location'), settings.origin + '/account');
  assert.deepEqual(calls, ['exchange', 'getUser']);
  const cancel = await run.callback(req('/auth/callback?error=access_denied&error_description=PRIVATE_SECRET'));
  assert.equal(cancel.headers.get('location'), settings.origin + '/login?error=oauth');
  assert.doesNotMatch(await cancel.text(), /PRIVATE_SECRET/);
});
test('callback failure clears partial cookies and logout is origin checked', async () => {
  const { run, calls } = setup({ exchangeCodeForSession: async () => ({ data: {}, error: { message: 'PRIVATE_SECRET' } }) });
  assert.equal((await run.callback(req('/auth/callback?code=bad'))).headers.get('location'), settings.origin + '/login?error=oauth');
  assert.ok(calls.includes('clear'));
  assert.equal((await run.logout(req('/auth/logout', '', 'https://evil.com'))).status, 403);
  assert.equal((await run.logout(req('/auth/logout', ''))).status, 200);
});
test('missing config never fabricates an authenticated identity or starts OAuth', async () => {
  const { run, calls } = setup({}, false);
  assert.equal((await run.login(req('/auth/login', ''))).status, 503);
  assert.equal((await run.session(req('/api/auth/session'))).status, 503);
  assert.deepEqual(calls, []);
});
test('unconfigured guest remains usable without fabricating a session', async () => {
  const { run } = setup({}, false);
  const r = await run.session(new Request(settings.origin + '/api/auth/session'));
  assert.equal(r.status, 200); assert.equal((await r.json()).status, 'guest');
});
test('chunked oversized or wrong MIME login input never calls OAuth', async () => {
  const { run, calls } = setup();
  const bad = new Request(settings.origin + '/auth/login', { method: 'POST', headers: { origin: settings.origin, 'content-type': 'application/x-www-form-urlencoded' }, body: 'next=' + 'x'.repeat(3000) });
  assert.equal((await run.login(bad)).status, 422);
  assert.equal((await run.login(new Request(settings.origin + '/auth/login', { method: 'POST', headers: { origin: settings.origin, 'content-type': 'text/plain' }, body: 'next=/account' }))).status, 422);
  assert.equal(calls.length, 0);
});
test('official SSR client creates PKCE cookie, HttpOnly/Lax and Secure for HTTPS', async () => {
  for (const origin of [settings.origin, 'https://example.test']) {
    const ctx = requestContext(new Request(origin + '/auth/login'), { ...settings, origin });
    await ctx.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback', skipBrowserRedirect: true } });
    const cookies = ctx.headers.getSetCookie();
    assert.ok(cookies.length > 0);
    assert.ok(cookies.every(c => c.includes('HttpOnly') && c.includes('SameSite=Lax')));
    assert.equal(cookies.some(c => c.includes('; Secure')), origin.startsWith('https:'));
    assert.ok(ctx.headers.get('cache-control')?.includes('no-store'));
  }
});

test('official SSR client refreshes an expired fixture through mocked upstream and returns fresh HttpOnly cookies', async () => {
  const original = globalThis.fetch, calls: string[] = [];
  const jwt = (exp: number) => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp })).toString('base64url'), 'fixture'].join('.');
  const session = (expires_at: number) => ({ access_token: jwt(expires_at), refresh_token: 'test-only-refresh', token_type: 'bearer', expires_in: 3600, expires_at, user: { id, email: 'demo@example.test' } });
  globalThis.fetch = async input => {
    const url = String(input); calls.push(url);
    assert.ok(url.startsWith(settings.url + '/auth/v1/'));
    if (url.includes('/token?grant_type=refresh_token')) return Response.json(session(Math.floor(Date.now() / 1000) + 3600));
    if (url.endsWith('/user')) return Response.json({ id, email: 'demo@example.test' });
    throw new Error('Unexpected test-only upstream');
  };
  try {
    const cookie = 'base64-' + Buffer.from(JSON.stringify(session(1))).toString('base64url');
    const ctx = requestContext(new Request(settings.origin + '/api/auth/session', { headers: { cookie: 'bbt-auth=' + cookie } }), settings);
    const result = await ctx.client.auth.getUser();
    assert.equal(result.error, null); assert.equal(result.data.user?.id, id);
    assert.ok(calls.some(url => url.includes('/token?grant_type=refresh_token')));
    assert.ok(ctx.headers.getSetCookie().some(value => value.startsWith('bbt-auth=') && value.includes('HttpOnly')));
    assert.match(ctx.headers.get('cache-control') || '', /no-store/);
  } finally { globalThis.fetch = original; }
});
