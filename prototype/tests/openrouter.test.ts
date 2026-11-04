import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample, sampleInput } from '../lib/samples.ts';
import { validOutput } from '../lib/content.ts';

const model = 'google/gemma-4-31b-it:free';
const env = { AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'test-openrouter-secret', OPENROUTER_MODEL: model };
const output = getSample(0);
const req = (body: unknown = sampleInput, signal?: AbortSignal) => new Request('http://127.0.0.1:3000/api/generate', { method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
const wrap = (value: unknown) => Response.json({ model, usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });
const pool = () => ({ slots: output.captions.map(text => ({ candidates: [{ text, p: .1 }, { text: text + ' Xem thêm.', p: .9 }] })), headlines: output.headlines, hashtags: output.hashtags.map(tag => ({ tag })) });
function fixture(settings = env, reply?: (body: any, signal: AbortSignal) => Response | Promise<Response>, timeoutMs = 90000) {
  const calls: { url: string; options: RequestInit; body: any }[] = [], logs: unknown[] = [];
  const fetchUpstream = (async (url: any, options: any) => {
    const body = JSON.parse(options.body); calls.push({ url: String(url), options, body });
    if (reply) return reply(body, options.signal);
    const p = JSON.parse(body.messages[1].content);
    if (p.slots) return wrap({ slots: p.slots.map((g: any) => ({ candidates: g.candidates.map((c: any) => ({ id: c.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5, fix: 'Giữ dữ kiện.' })) })) });
    if (p.captions) return wrap({ captions: p.captions.map((c: any) => c.text) });
    return wrap(pool());
  }) as typeof fetch;
  return { calls, logs, run: createGenerateHandler({ env: settings, fetchUpstream, timeoutMs, log: x => logs.push(x) }) };
}

test('OpenRouter Deep stays on approved free model, disables thinking and fallback, caps four calls and token prices', async () => {
  const f = fixture(); const r = await f.run(req()); assert.equal(r.status, 200); assert.ok(validOutput(await r.json())); assert.equal(f.calls.length, 4);
  for (const [i, call] of f.calls.entries()) {
    assert.equal(call.url, 'https://openrouter.ai/api/v1/chat/completions'); assert.equal(call.options.redirect, 'error'); assert.equal(call.options.cache, 'no-store');
    assert.equal((call.options.headers as Record<string, string>).Authorization, 'Bearer test-openrouter-secret');
    assert.equal(call.body.model, model); assert.equal(call.body.models, undefined); assert.equal(call.body.plugins, undefined);
    assert.deepEqual(call.body.provider, { allow_fallbacks: false, require_parameters: true, max_price: { prompt: 0, completion: 0, request: 0 } });
    assert.deepEqual(call.body.reasoning, { enabled: false }); assert.equal(call.body.thinking, undefined); assert.equal(call.body.max_tokens, i === 0 ? 4096 : 2048);
    assert.deepEqual(call.body.response_format, { type: 'json_object' }); assert.equal((call.options.signal as AbortSignal).aborted, true);
  }
  assert.doesNotMatch(JSON.stringify(f.logs), /test-openrouter-secret|Sổ tay|messages|captions|Giữ dữ kiện/);
  assert.equal((f.logs[0] as any).calls, 4); assert.equal((f.logs[0] as any).actualModel, model);
});

test('OpenRouter rejects missing keys, paid/random/other models and client overrides before inference', async () => {
  for (const settings of [{ ...env, OPENROUTER_API_KEY: '' }, { ...env, OPENROUTER_API_KEY: 'bad\nkey' }, ...['google/gemma-4-31b-it', 'openrouter/free', 'openrouter/auto', 'other/model:free'].map(OPENROUTER_MODEL => ({ ...env, OPENROUTER_MODEL }))]) {
    const f = fixture(settings); assert.equal((await f.run(req())).status, 503); assert.equal(f.calls.length, 0);
  }
  for (const field of ['model', 'provider', 'key', 'url']) { const f = fixture(); assert.equal((await f.run(req({ ...sampleInput, [field]: 'override' }))).status, 422); assert.equal(f.calls.length, 0); }
  const f = fixture({ ...env, OPENROUTER_API_KEY: '  test-openrouter-secret \r\n' }); assert.equal((await f.run(req())).status, 200);
});

test('OpenRouter quota/credit/provider errors, invalid JSON and wrong output fail without another request', async () => {
  for (const [status, code, reply] of [
    [429, 'RATE_LIMITED', () => new Response('PRIVATE_UPSTREAM', { status: 429 })],
    [502, 'UPSTREAM_ERROR', () => new Response('PRIVATE_UPSTREAM', { status: 402 })],
    [502, 'UPSTREAM_ERROR', () => new Response('PRIVATE_UPSTREAM', { status: 500 })],
    [502, 'INVALID_AI_OUTPUT', () => new Response('{')],
    [502, 'INVALID_AI_OUTPUT', () => wrap({ slots: [] })],
    [503, 'AI_UNAVAILABLE', () => { throw new Error('PRIVATE_NETWORK'); }],
  ] as const) {
    const f = fixture(env, reply); const r = await f.run(req()); assert.equal(r.status, status); const body = await r.json(); assert.equal(body.error.code, code); assert.equal(f.calls.length, 1); assert.doesNotMatch(JSON.stringify(body), /PRIVATE_|test-openrouter-secret/);
  }
});

test('OpenRouter response size, timeout and abort reuse existing bounds; single mode uses one call', async () => {
  const size = fixture(env, () => new Response(' '.repeat(32769))); assert.equal((await size.run(req())).status, 502); assert.equal(size.calls.length, 1);
  const slow = fixture(env, (_body, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })), 10);
  assert.equal((await slow.run(req())).status, 504); assert.equal(slow.calls.length, 1);
  const controller = new AbortController(); controller.abort(); const stopped = fixture(); assert.equal((await stopped.run(req(sampleInput, controller.signal))).status, 504); assert.equal(stopped.calls.length, 0);
  const single = fixture({ ...env, CAPTION_PIPELINE: 'single' } as typeof env, () => wrap(output)); assert.equal((await single.run(req())).status, 200); assert.equal(single.calls.length, 1); assert.equal(single.calls[0].body.max_tokens, 2048);
});
