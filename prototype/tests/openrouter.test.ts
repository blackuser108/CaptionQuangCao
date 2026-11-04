import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { sampleInput } from '../lib/samples.ts';

test('retired OpenRouter configuration never dispatches inference even if its old key and routes remain configured', async () => {
  let calls = 0;
  for (const model of ['auto-free', 'openrouter/free', 'openrouter/auto', 'google/gemma-4-31b-it:free']) {
    const run = createGenerateHandler({ env: { AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'test-retired-secret', OPENROUTER_MODEL: model },
      fetchUpstream: (async () => { calls++; throw new Error('MUST_NOT_CALL'); }) as typeof fetch, log: () => {} });
    const r = await run(new Request('http://127.0.0.1:3000/api/generate', { method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify(sampleInput) }));
    assert.equal(r.status, 503); assert.equal((await r.json()).error.code, 'AI_NOT_CONFIGURED');
  }
  assert.equal(calls, 0);
});
