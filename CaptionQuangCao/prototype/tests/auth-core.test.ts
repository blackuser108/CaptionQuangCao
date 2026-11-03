import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityFence, safeNext, historyScope, authSettings, sameOrigin } from '../lib/auth/core.ts';
import { addHistory, deleteHistory, readHistory, HISTORY_KEY } from '../lib/history.ts';
import { sampleInput, getSample } from '../lib/samples.ts';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
test('redirect accepts only approved internal destinations', () => {
  for (const path of ['/create', '/history', '/account']) assert.equal(safeNext(path), path);
  for (const path of ['https://evil.com', '//evil.com', '/\\evil.com', '/auth/logout', '/history?token=x', '/%2f%2fevil', '/account\n', undefined]) assert.equal(safeNext(path), '/account');
});
test('config rejects secret/service keys, unsafe URLs and misleading origins', () => {
  const env = { SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', AUTH_SITE_URL: 'http://127.0.0.1:3000' };
  assert.equal(authSettings(env)?.origin, 'http://127.0.0.1:3000');
  for (const change of [{ SUPABASE_PUBLISHABLE_KEY: 'sb_secret_no' }, { SUPABASE_PUBLISHABLE_KEY: '' }, { SUPABASE_URL: 'http://evil.com' }, { AUTH_SITE_URL: 'https://user:pass@example.com' }, { AUTH_SITE_URL: 'http://example.com' }, { AUTH_SITE_URL: 'https://example.com/path' }]) assert.equal(authSettings({ ...env, ...change }), null);
  assert.ok(sameOrigin(new Request('http://localhost:3000/auth/logout', { method: 'POST', headers: { origin: env.AUTH_SITE_URL } }), env.AUTH_SITE_URL));
  assert.equal(sameOrigin(new Request('http://localhost:3000/auth/logout', { method: 'POST', headers: { origin: 'https://evil.com' } }), env.AUTH_SITE_URL), false);
});
test('identity fence invalidates A request across guest/A/logout/B/A and unknown/error', () => {
  const fence = new IdentityFence();
  assert.throws(() => fence.capture());
  fence.verify(null); const guest = fence.capture();
  fence.verify(A); assert.equal(fence.current(guest), false); const a = fence.capture();
  fence.suspend(); assert.equal(fence.current(a), false);
  fence.verify(A); assert.equal(fence.current(a), true);
  fence.verify(null); fence.verify(B); fence.verify(A); assert.equal(fence.current(a), false);
  const fresh = fence.capture(); fence.fail(); assert.equal(fence.current(fresh), false);
  fence.verify(A); assert.equal(fence.current(fresh), false);
});
test('guest/account history namespaces do not migrate or overwrite each other', () => {
  const values = new Map<string, string>();
  const store = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  const entry = (id: string) => ({ id, createdAt: '2026-10-27T00:00:00Z', input: sampleInput, output: getSample(0) });
  assert.equal(historyScope(null), HISTORY_KEY);
  assert.notEqual(historyScope(A), historyScope(B));
  assert.throws(() => historyScope('../../other'));
  addHistory(store, entry('guest')); const before = store.getItem(HISTORY_KEY);
  addHistory(store, entry('A'), historyScope(A)); addHistory(store, entry('B'), historyScope(B));
  deleteHistory(store, 'A', historyScope(A));
  assert.equal(store.getItem(HISTORY_KEY), before);
  assert.deepEqual(readHistory(store, historyScope(A)), []);
  assert.equal(readHistory(store, historyScope(B))[0].id, 'B');
});
