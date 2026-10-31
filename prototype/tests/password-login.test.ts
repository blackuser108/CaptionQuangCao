import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthHandlers } from '../lib/auth/handlers.ts';
import { readPasswordInput } from '../lib/auth/password.ts';
import { authSettings } from '../lib/auth/core.ts';

const id = '11111111-1111-4111-8111-111111111111';
const config = { origin: 'https://app.example.test', url: 'https://abcdefghijklmnopqrst.supabase.co', key: 'sb_publishable_test', googleEnabled: false, emailEnabled: true };
const input = { email: ' demo@example.test ', password: ' exact password ', next: '/account' };
const request = (data: unknown = input, headers = {}) => new Request(config.origin + '/auth/password', { method: 'POST', headers: { origin: config.origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
function setup(options: { disabled?: boolean; missing?: boolean; status?: number; unverified?: boolean; throws?: boolean } = {}) {
  const calls: unknown[] = [], headers = new Headers({ 'Cache-Control': 'private, no-store' });
  const auth = {
    signInWithPassword: async (value: unknown) => { calls.push(value); if (options.throws) throw new Error('PRIVATE_UPSTREAM'); return { error: options.status ? { status: options.status, message: 'PRIVATE_UPSTREAM' } : null }; },
    getUser: async () => { calls.push('verify'); return { data: { user: options.unverified ? null : { id, email: input.email.trim() } }, error: null }; },
  };
  const run = createAuthHandlers({ settings: () => options.missing ? null : { ...config, emailEnabled: !options.disabled }, context: () => ({ client: { auth } as never, headers, hasSession: false, clear: () => { calls.push('clear'); } }) });
  return { run, calls };
}
test('email login independent of Google, preserves password, verifies identity and safe redirect', async () => {
  const { run, calls } = setup();
  const r = await run.password(request({ ...input, next: 'https://evil.test' }));
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { status: 'authenticated', next: '/account' });
  assert.deepEqual(calls, [{ email: 'demo@example.test', password: input.password }, 'verify']);
  assert.match(r.headers.get('cache-control')!, /private, no-store/);
  assert.equal((await readPasswordInput(request())).password, input.password);
});
test('invalid input, signup mode, origin, MIME and missing/disabled config cannot call provider', async () => {
  const { run, calls } = setup();
  for (const data of [null, [], { ...input, email: 'bad' }, { ...input, password: '' }, { ...input, password: 123 }, { ...input, mode: 'signup' }, { ...input, password: 'x'.repeat(129) }, { ...input, email: 'a'.repeat(255) + '@x.test' }]) assert.equal((await run.password(request(data))).status, 422);
  assert.equal((await run.password(request(input, { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await run.password(request(input, { 'sec-fetch-site': 'cross-site' }))).status, 403);
  assert.equal((await run.password(request(input, { 'content-type': 'text/plain' }))).status, 422);
  assert.equal((await setup({ missing: true }).run.password(request())).status, 503);
  assert.equal((await setup({ disabled: true }).run.password(request())).status, 503);
  assert.deepEqual(calls, []);
});
test('bounded JSON input rejects oversized streams and malformed encoding without provider', async () => {
  const { run, calls } = setup();
  for (const body of ['{', new Uint8Array([0xff]), 'x'.repeat(4097)]) {
    assert.equal((await run.password(new Request(config.origin + '/auth/password', { method: 'POST', headers: { origin: config.origin, 'content-type': 'application/json' }, body }))).status, 422);
  }
  assert.deepEqual(calls, []);
});
test('credential, rate limit, provider, timeout and verification errors stay private and clear partial cookies', async () => {
  for (const [status, expected, code] of [[400,401,'INVALID_CREDENTIALS'],[429,429,'RATE_LIMITED'],[500,503,'AUTH_UNAVAILABLE']] as const) {
    const { run, calls } = setup({ status }); const r = await run.password(request());
    assert.equal(r.status, expected); assert.equal((await r.json()).error.code, code);
    assert.ok(calls.includes('clear')); assert.ok(!calls.includes('verify'));
  }
  for (const options of [{ throws: true }, { unverified: true }]) {
    const { run, calls } = setup(options), r = await run.password(request());
    assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /PRIVATE_UPSTREAM/); assert.ok(calls.includes('clear'));
  }
});
test('session advertises email availability separately and defaults to configured server-only flag', async () => {
  assert.equal((await (await setup().run.session(new Request(config.origin))).json()).emailEnabled, true);
  assert.equal((await (await setup({ disabled: true }).run.session(new Request(config.origin))).json()).emailEnabled, false);
  const env = { SUPABASE_URL: config.url, SUPABASE_PUBLISHABLE_KEY: config.key };
  assert.equal(authSettings(env)?.emailEnabled, true);
  assert.equal(authSettings({ ...env, AUTH_EMAIL_ENABLED: 'false', AUTH_GOOGLE_ENABLED: 'true' })?.emailEnabled, false);
});
test('real SSR mocked password grant creates secure HttpOnly cookies; reload verifies and logout clears', async () => {
  const original = globalThis.fetch; const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (String(url).endsWith('/token?grant_type=password')) {
      assert.equal(JSON.parse(String(init?.body)).password, input.password);
      const exp = Math.floor(Date.now()/1000)+3600;
      const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp})).toString('base64url'),'fixture'].join('.');
      return Response.json({ access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: exp, token_type:'bearer', user:{id,email:'demo@example.test'} });
    }
    if (String(url).includes('/logout')) return new Response(null,{status:204});
    assert.equal(String(url),config.url+'/auth/v1/user'); return Response.json({id,email:'demo@example.test'});
  };
  try {
    const run = createAuthHandlers({ settings:()=>config }); const r = await run.password(request());
    assert.equal(r.status,200); const cookies = r.headers.getSetCookie();
    assert.ok(cookies.some(c=>c.startsWith('bbt-auth=')&&c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Lax')));
    assert.doesNotMatch(await r.text(),/test-refresh|access_token|exact password/);
    const cookie = cookies.map(c=>c.split(';')[0]).join('; ');
    assert.equal((await (await run.session(new Request(config.origin,{headers:{cookie}}))).json()).status,'authenticated');
    const logout = await run.logout(new Request(config.origin+'/auth/logout',{method:'POST',headers:{origin:config.origin,cookie}}));
    assert.equal(logout.status,200); assert.ok(logout.headers.getSetCookie().some(c=>c.includes('Max-Age=0')));
    assert.equal(calls.filter(x=>x.includes('/token?')).length,1);
  } finally { globalThis.fetch=original; }
});
