import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample, sampleInput } from '../lib/samples.ts';
import { validOutput } from '../lib/content.ts';

const env = {
  AI_PROVIDER: 'groq', GROQ_API_KEY: 'mock-groq-key',
  CLOUDFLARE_API_TOKEN: 'mock-cloudflare-key', CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
};
const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
const request = () => new Request('http://127.0.0.1:3000/api/generate', {
  method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' },
  body: JSON.stringify(sampleInput),
});
const result = getSample(0);
const completion = () => Response.json({
  model: 'openai/gpt-oss-120b', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }],
});
type Call = { url: string; body: any };
function setup(reply: (call: Call, n: number) => Response | Promise<Response>, settings = env) {
  const calls: Call[] = [], logs: any[] = [];
  const run = createGenerateHandler({
    env: settings, log: value => logs.push(value),
    fetchUpstream: async (url, options) => {
      const call = { url: String(url), body: JSON.parse(String(options?.body)) };
      calls.push(call);
      return reply(call, calls.length);
    },
  });
  return { calls, logs, run };
}

test('Groq defaults to a complete Single response using one upstream call', async () => {
  const f = setup(() => completion());
  const r = await f.run(request());
  assert.equal(r.status, 200);
  assert.ok(validOutput(await r.json()));
  assert.equal(f.calls.length, 1);
  assert.equal(f.logs[0].mode, 'single');
  assert.equal(f.calls[0].body.response_format.json_schema.name, 'content_set');
  const payload = JSON.parse(f.calls[0].body.messages[1].content);
  assert.equal(payload.toneInput, sampleInput.tone);
  assert.equal(payload.description, sampleInput.description);
  assert.equal(payload.tone, undefined);
  assert.equal(payload.strategies, undefined);
});

test('Single switches once from Groq availability failures and validates a real-shaped Cloudflare response', async () => {
  for (const status of [429, 500, 502, 503]) {
    const f = setup((call, n) => {
      if (n === 1) return new Response('PRIVATE_BODY', { status });
      assert.ok(call.url.includes('/ai/run/@cf/qwen/qwen3-30b-a3b-fp8'));
      assert.equal(call.body.model, undefined);
      assert.deepEqual(call.body.response_format, { type: 'json_object' });
      return Response.json({ success: true, result: { response: JSON.stringify(result) } });
    });
    const r = await f.run(request());
    assert.equal(r.status, 200);
    assert.ok(validOutput(await r.json()));
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[0].url, groqUrl);
    assert.deepEqual(f.logs[0].attempts.map((a: any) => a.provider), ['groq', 'cloudflare']);
    assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE_BODY|mock-.*-key|messages|captions/);
  }
});

test('Two unavailable providers report the final upstream error and never start a third request', async () => {
  for (const status of [429, 503]) {
    const f = setup(() => new Response('PRIVATE_BODY', { status }));
    const r = await f.run(request());
    assert.equal(r.status, status === 429 ? 429 : 502);
    assert.equal((await r.json()).error.code, status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
    assert.equal(f.calls.length, 2);
  }
});

test('Single does not use fallback after auth, malformed output, refusal or network failures', async () => {
  const replies = [
    () => new Response('PRIVATE_BODY', { status: 401 }),
    () => new Response('invalid json'),
    () => Response.json({ choices: [{ finish_reason: 'content_filter', message: { content: null } }] }),
    () => { throw new Error('PRIVATE_NETWORK'); },
  ];
  for (const reply of replies) {
    const f = setup(reply);
    assert.ok((await f.run(request())).status >= 500);
    assert.equal(f.calls.length, 1);
  }
});

test('Default logger emits one JSON line retaining nested quota and safe usage fields', async () => {
  const lines: unknown[] = [];
  const saved = console.info;
  try {
    console.info = value => { lines.push(value); };
    const run = createGenerateHandler({
      env, fetchUpstream: async () => new Response(JSON.stringify({
        model: 'openai/gpt-oss-120b', usage: { prompt_tokens: 90, completion_tokens: 40, total_tokens: 130 },
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }],
      }), { headers: { 'x-ratelimit-remaining-tokens': '7000', 'x-ratelimit-reset-tokens': '5s' } }),
    });
    assert.equal((await run(request())).status, 200);
  } finally { console.info = saved; }
  assert.equal(lines.length, 1);
  assert.equal(typeof lines[0], 'string');
  const log = JSON.parse(String(lines[0]));
  assert.equal(log.attempts[0].quota['x-ratelimit-remaining-tokens'], 7000);
  assert.deepEqual(log.attempts[0].usage, { prompt_tokens: 90, completion_tokens: 40, total_tokens: 130 });
  assert.doesNotMatch(String(lines[0]), /mock-.*-key|messages|captions|\[Object\]/);
});
