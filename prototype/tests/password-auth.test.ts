import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthHandlers } from '../lib/auth/handlers.ts';
import { readPasswordInput } from '../lib/auth/password.ts';
import { authSettings } from '../lib/auth/core.ts';

const id = '11111111-1111-4111-8111-111111111111';
const config = { origin: 'http://127.0.0.1:3000', url: 'https://abcdefghijklmnopqrst.supabase.co', key: 'sb_publishable_test', googleEnabled: false, emailEnabled: true };
const input = { email: ' demo@example.test ', password: ' exact password ', mode: 'login', next: '/account' };
function request(data: unknown = input, headers: Record<string, string> = {}) {
  return new Request(config.origin + '/auth/password', { method: 'POST', headers: { origin: config.origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
}
function setup(options: { configured?: boolean; enabled?: boolean; fail?: string; signupSession?: boolean; unverified?: boolean; status?: number } = {}) {
  const calls: unknown[] = [], headers = new Headers({ 'Cache-Control': 'private, no-store' });
  const auth = {
    signInWithPassword: async (value: unknown) => { calls.push(value); return { error: options.fail ? { status: options.status || 400, message: options.fail } : null }; },
    signUp: async (value: unknown) => { calls.push(value); return { data: { session: options.signupSession ? {} : null }, error: options.fail ? { status: options.status || 400, message: options.fail } : null }; },
    getUser: async () => { calls.push('verify'); return { data: { user: options.unverified ? null : { id, email: 'demo@example.test' } }, error: null }; },
  };
  const run = createAuthHandlers({ settings: () => options.configured === false ? null : { ...config, emailEnabled: options.enabled !== false }, context: () => ({ client: { auth } as never, headers, hasSession: false, clear: () => { calls.push('clear'); } }) });
  return { run, calls };
}
test('password login works independently of Google and verifies server identity before success', async () => {
  const { run, calls } = setup();
  const response = await run.password(request({ ...input, next: 'https://evil.test' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'authenticated', next: '/account' });
  assert.deepEqual(calls, [{ email: 'demo@example.test', password: input.password }, 'verify']);
  assert.match(response.headers.get('cache-control') || '', /private, no-store/);
  const guest = await run.session(new Request(config.origin + '/api/auth/session'));
  const state = await guest.json();
  assert.equal(state.loginEnabled, false); assert.equal(state.emailEnabled, true);
});
test('password auth rejects invalid fields, MIME, cross-origin and disabled config before provider', async () => {
  const { run, calls } = setup();
  for (const data of [{ ...input, email: 'bad' }, { ...input, password: '' }, { ...input, password: 123 }, { ...input, mode: 'unknown' }, { ...input, extra: 'x' }, { ...input, mode: 'signup', password: 'short' }, { ...input, email: 'x'.repeat(255) + '@x.test' }, null, []]) {
    assert.equal((await run.password(request(data))).status, 422);
  }
  assert.equal((await run.password(request(input, { 'content-type': 'text/plain' }))).status, 422);
  assert.equal((await run.password(request(input, { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await setup({ configured: false }).run.password(request())).status, 503);
  assert.equal((await setup({ enabled: false }).run.password(request())).status, 503);
  assert.deepEqual(calls, []);
});
test('chunked oversized JSON is bounded; malformed UTF-8/JSON fails closed', async () => {
  const { run, calls } = setup();
  for (const body of ['{', JSON.stringify({ ...input, password: 'x'.repeat(5000) }), new Uint8Array([0xff])]) {
    const req = new Request(config.origin + '/auth/password', { method: 'POST', headers: { origin: config.origin, 'content-type': 'application/json' }, body });
    assert.equal((await run.password(req)).status, 422);
  }
  assert.deepEqual(calls, []);
});
test('bad password, unconfirmed email and rate limit never leak provider detail or establish identity', async () => {
  for (const status of [400, 429]) {
    const { run, calls } = setup({ fail: 'PRIVATE_TOKEN_email_not_confirmed', status });
    const response = await run.password(request());
    assert.equal(response.status, status === 429 ? 429 : 401);
    assert.doesNotMatch(await response.text(), /PRIVATE_TOKEN/);
    assert.ok(!calls.includes('verify')); assert.ok(calls.includes('clear'));
  }
  const result = await setup({ unverified: true }).run.password(request());
  assert.equal(result.status, 503);
});
test('signup uses fixed internal confirmation redirect and neutral pending message without claiming a session', async () => {
  const { run, calls } = setup();
  const result = await run.password(request({ ...input, mode: 'signup', next: '//evil.test' }));
  assert.equal(result.status, 200); assert.equal((await result.json()).status, 'confirmation_required');
  assert.deepEqual(calls, [{ email: 'demo@example.test', password: input.password, options: { emailRedirectTo: config.origin + '/auth/callback?next=%2Faccount' } }]);
});
test('signup with immediate session still requires server verification; provider failure is private', async () => {
  const { run, calls } = setup({ signupSession: true });
  assert.equal((await (await run.password(request({ ...input, mode: 'signup' }))).json()).status, 'authenticated');
  assert.ok(calls.includes('verify'));
  const bad = await setup({ fail: 'PRIVATE_SECRET' }).run.password(request({ ...input, mode: 'signup' }));
  assert.equal(bad.status, 400); assert.doesNotMatch(await bad.text(), /PRIVATE_SECRET/);
});
test('password spaces are preserved, email whitespace trimmed, and email switch is independent', async () => {
  assert.equal((await readPasswordInput(request())).password, input.password);
  const env = { SUPABASE_URL: config.url, SUPABASE_PUBLISHABLE_KEY: config.key };
  assert.equal(authSettings(env)?.emailEnabled, true);
  assert.equal(authSettings({ ...env, AUTH_EMAIL_ENABLED: 'false', AUTH_GOOGLE_ENABLED: 'true' })?.emailEnabled, false);
});
test('real SSR password grant with mocked upstream returns server cookies and verifies user', async () => {
  const original = globalThis.fetch, calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (String(url) === config.url + '/auth/v1/token?grant_type=password') {
      const posted = JSON.parse(String(init?.body));
      assert.equal(posted.password, input.password);
      const expires_at = Math.floor(Date.now() / 1000) + 3600;
      const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp: expires_at })).toString('base64url'), 'fixture'].join('.');
      return Response.json({ access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at, token_type: 'bearer', user: { id, email: 'demo@example.test' } });
    }
    assert.equal(String(url), config.url + '/auth/v1/user');
    return Response.json({ id, email: 'demo@example.test' });
  };
  try {
    const run = createAuthHandlers({ settings: () => config });
    const result = await run.password(request());
    assert.equal(result.status, 200);
    assert.ok(result.headers.getSetCookie().some(c => c.startsWith('bbt-auth=') && c.includes('HttpOnly') && c.includes('SameSite=Lax')));
    assert.equal(calls.length, 2);
    assert.doesNotMatch(await result.text(), /test-refresh|access_token|exact password/);
  } finally { globalThis.fetch = original; }
});
