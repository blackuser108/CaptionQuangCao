import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample, sampleInput } from '../lib/samples.ts';
import { validOutput } from '../lib/content.ts';

const env: Record<string, string | undefined> = {
  AI_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-3.5-flash', GEMINI_API_KEY: 'test-gemini-secret',
  GEMINI_FALLBACK: 'groq', GROQ_MODEL: 'openai/gpt-oss-120b', GROQ_API_KEY: 'test-groq-secret', CAPTION_PIPELINE: 'deep',
};
const output = getSample(0);
const req = (body: unknown = sampleInput, signal?: AbortSignal) => new Request('http://127.0.0.1:3000/api/generate', {
  method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
});
type Call = { url: string; body: any; signal: AbortSignal; headers: Headers };
const wrap = (value: unknown, provider: string) => Response.json({ model: provider === 'groq' ? 'openai/gpt-oss-120b' : 'gemini-3.6-flash',
  usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });
function fixture(reply?: (call: Call, n: number) => Response | Promise<Response> | undefined, settings = env, fix = false, timeoutMs = 90000) {
  const calls: Call[] = [], logs: any[] = [];
  const fetchUpstream = (async (url: any, options: any) => {
    const call = { url: String(url), body: JSON.parse(options.body), signal: options.signal, headers: new Headers(options.headers) };
    calls.push(call);
    const response = await reply?.(call, calls.length); if (response) return response;
    const p = JSON.parse(call.body.messages[1].content), provider = call.url.includes('api.groq.com') ? 'groq' : 'gemini';
    if (p.slots) return wrap({ slots: p.slots.map((g: any) => ({ candidates: g.candidates.map((c: any) => ({ id: c.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5, fix: fix ? 'Giữ dữ kiện.' : '' })) })) }, provider);
    if (p.captions) return wrap({ captions: p.captions.map((c: any) => c.text) }, provider);
    return wrap({ slots: output.captions.map(text => ({ candidates: [{ text, p: .1 }, { text: text + ' Xem thêm.', p: .9 }] })),
      headlines: output.headlines, hashtags: output.hashtags.map(tag => ({ tag })) }, provider);
  }) as typeof fetch;
  return { calls, logs, run: createGenerateHandler({ env: settings, fetchUpstream, timeoutMs, log: x => logs.push(x) }) };
}

test('Gemini 3.5 request ID stays explicit; Deep success records actual 3.6 without Groq or catalog calls', async () => {
  const f = fixture(undefined, env, true), r = await f.run(req());
  assert.equal(r.status, 200); assert.ok(validOutput(await r.json())); assert.equal(f.calls.length, 4);
  for (const c of f.calls) {
    assert.equal(c.url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    assert.equal(c.body.model, 'gemini-3.5-flash'); assert.equal(c.headers.get('authorization'), 'Bearer test-gemini-secret');
    assert.equal(c.body.response_format.type, 'json_schema'); assert.equal(c.body.reasoning_effort, 'low');
    assert.ok(c.body.max_tokens <= 4096); assert.equal(c.signal.aborted, true);
  }
  assert.equal(f.logs[0].calls, 4); assert.equal(f.logs[0].requestedModel, 'gemini-3.5-flash');
  assert.ok(f.logs[0].attempts.every((a: any) => a.provider === 'gemini' && a.actualModel === 'gemini-3.6-flash' && a.durationMs >= 0));
});

test('Gemini 429 and availability 5xx switch once to direct fixed Groq and finish Deep within four total calls', async () => {
  for (const status of [429, 500, 502, 503]) {
    const f = fixture((_c, n) => n === 1 ? new Response('PRIVATE_UPSTREAM', { status }) : undefined);
    const r = await f.run(req()); assert.equal(r.status, 200); assert.ok(validOutput(await r.json())); assert.equal(f.calls.length, 4);
    assert.deepEqual(f.calls.map(c => c.body.model), ['gemini-3.5-flash', ...Array(3).fill('openai/gpt-oss-120b')]);
    assert.deepEqual(f.logs[0].attempts.map((a: any) => a.stage), ['write', 'write', 'judge', 'judge-reverse']);
    for (const c of f.calls.slice(1)) {
      assert.equal(c.url, 'https://api.groq.com/openai/v1/chat/completions'); assert.equal(c.headers.get('authorization'), 'Bearer test-groq-secret');
      assert.equal(c.body.response_format.type, 'json_schema'); assert.equal(c.body.response_format.json_schema.strict, true);
      assert.equal(c.body.reasoning_effort, 'low'); assert.equal(c.body.include_reasoning, false); assert.equal(c.body.provider, undefined);
    }
    assert.deepEqual(f.logs[0].usage, { prompt_tokens: 6, completion_tokens: 9, total_tokens: 15 });
    assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE_|test-gemini-secret|test-groq-secret|messages|captions|Sổ tay/);
  }
});

test('Groq failure stops; Gemini authorization, input, blocked output and malformed JSON never fall back', async () => {
  for (const status of [400, 401, 402, 403, 404, 408, 422, 501, 504, 505]) {
    const f = fixture(() => new Response('PRIVATE_BODY', { status })); assert.equal((await f.run(req())).status, 502); assert.equal(f.calls.length, 1);
  }
  for (const value of [new Response('{'), wrap({ slots: [] }, 'gemini'), Response.json({ choices: [{ finish_reason: 'content_filter', message: { content: '{}' } }] })]) {
    const f = fixture(() => value); const r = await f.run(req()); assert.equal(r.status, 502); assert.equal(f.calls.length, 1);
    assert.equal((await r.json()).error.code, 'INVALID_AI_OUTPUT');
  }
  for (const status of [429, 500, 401]) {
    const f = fixture((_c, n) => new Response('PRIVATE_BODY', { status: n === 1 ? 429 : status }));
    const r = await f.run(req()); assert.equal(r.status, status === 429 ? 429 : 502); assert.equal(f.calls.length, 2);
    assert.doesNotMatch(await r.text(), /PRIVATE_|test-.*-secret/);
  }
});

test('network uncertainty, total timeout and cancellation stop without Groq, including queued judges', async () => {
  const network = fixture(() => { throw new Error('PRIVATE_NETWORK'); });
  assert.equal((await network.run(req())).status, 503); assert.equal(network.calls.length, 1);
  const slow = fixture(c => new Promise((_resolve, reject) => c.signal.addEventListener('abort', () => reject(new Error('abort')), { once: true })), env, false, 10);
  assert.equal((await slow.run(req())).status, 504); assert.equal(slow.calls.length, 1);
  const controller = new AbortController();
  const cancel = fixture((_c, n) => { if (n === 2) { controller.abort(); return new Response('PRIVATE_BODY', { status: 429 }); } });
  assert.equal((await cancel.run(req(sampleInput, controller.signal))).status, 504); assert.equal(cancel.calls.length, 2);
  assert.ok(cancel.calls.every(c => !c.url.includes('groq')));
});

test('fallback configuration rejects absent/invalid keys, aliases and overrides before any inference', async () => {
  for (const change of [{ GROQ_API_KEY: '' }, { GEMINI_API_KEY: '' }, { GROQ_API_KEY: 'bad\nkey' }, { GROQ_MODEL: 'auto' },
    { GROQ_MODEL: 'llama-3.3-70b-versatile' }, { GEMINI_MODEL: 'auto' }, { GEMINI_MODEL: 'gemini-3.5-flash-lite' }, { GEMINI_FALLBACK: 'openrouter' }]) {
    const f = fixture(undefined, { ...env, ...change }); assert.equal((await f.run(req())).status, 503); assert.equal(f.calls.length, 0);
  }
  for (const name of ['provider', 'url', 'model', 'key', 'mode']) {
    const f = fixture(); assert.equal((await f.run(req({ ...sampleInput, [name]: 'override' }))).status, 422); assert.equal(f.calls.length, 0);
  }
  const f = fixture(undefined, { ...env, GROQ_API_KEY: ' \r\ntest-groq-secret\n ' }); assert.equal((await f.run(req())).status, 200);
});

test('fallback at a judge switches remaining stages without restarting writer or sending queued Gemini work', async () => {
  const f = fixture((_c, n) => n === 2 ? new Response('', { status: 503 }) : undefined);
  assert.equal((await f.run(req())).status, 200); assert.equal(f.calls.length, 4);
  assert.deepEqual(f.logs[0].attempts.map((a: any) => [a.stage, a.provider]), [['write', 'gemini'], ['judge', 'gemini'], ['judge', 'groq'], ['judge-reverse', 'groq']]);
});

test('strict Deep never dispatches request five or returns partial output when fallback leaves no polish budget', async () => {
  for (const failedAt of [1, 2, 3, 4]) {
    const f = fixture((_c, n) => n === failedAt ? new Response('', { status: 429 }) : undefined, env, true);
    const r = await f.run(req()); assert.equal(r.status, 502); assert.equal(f.calls.length, 4);
    const body = await r.json(); assert.equal(body.error.code, 'AI_REQUEST_LIMIT'); assert.equal(body.captions, undefined);
    assert.equal(f.logs[0].calls, 4); assert.equal(f.logs[0].attempts.length, 4);
    assert.ok(f.calls.slice(failedAt).every(c => c.url.includes('api.groq.com')));
  }
});

test('bad Groq JSON, pool and oversized body stop without repair, fallback loop or leaked credentials', async () => {
  for (const value of [new Response('{'), wrap({ slots: [] }, 'groq'), new Response(' '.repeat(32769)),
    wrap({ captions: [env.GEMINI_API_KEY, env.GROQ_API_KEY] }, 'groq')]) {
    const f = fixture((_c, n) => n === 1 ? new Response('', { status: 429 }) : value);
    const r = await f.run(req()); assert.equal(r.status, 502); assert.equal(f.calls.length, 2);
    assert.equal((await r.json()).error.code, 'INVALID_AI_OUTPUT'); assert.doesNotMatch(JSON.stringify(f.logs), /test-.*-secret/);
  }
});

test('terminal judge failure rejects queued stage and single/smart preserve their smaller request caps', async () => {
  const terminal = fixture((_c, n) => n === 2 ? new Response('', { status: 403 }) : undefined);
  assert.equal((await terminal.run(req())).status, 502); assert.equal(terminal.calls.length, 2);
  for (const [mode, max] of [['single', 1], ['smart', 2]] as const) {
    const f = fixture(() => new Response('', { status: 429 }), { ...env, CAPTION_PIPELINE: mode });
    const r = await f.run(req()); assert.equal(r.status, max === 1 ? 502 : 429); assert.equal(f.calls.length, max);
  }
});

test('invalid judge schema stops before the next scheduled judge can dispatch', async () => {
  const f = fixture((_c, n) => n === 2 ? wrap({ slots: [] }, 'gemini') : undefined);
  const r = await f.run(req()); assert.equal(r.status, 502); assert.equal((await r.json()).error.code, 'INVALID_AI_OUTPUT');
  assert.equal(f.calls.length, 2);
});

test('Groq network uncertainty, timeout and invalid judge never dispatch additional stages', async () => {
  const network = fixture((_c, n) => { if (n === 1) return new Response('', { status: 429 }); throw new Error('PRIVATE_GROQ_NETWORK'); });
  assert.equal((await network.run(req())).status, 503); assert.equal(network.calls.length, 2);
  const slow = fixture((c, n) => n === 1 ? new Response('', { status: 429 }) : new Promise((_resolve, reject) => c.signal.addEventListener('abort', () => reject(new Error('abort')), { once: true })), env, false, 10);
  assert.equal((await slow.run(req())).status, 504); assert.equal(slow.calls.length, 2);
  const judge = fixture((_c, n) => n === 1 ? new Response('', { status: 503 }) : n === 3 ? wrap({ slots: [] }, 'groq') : undefined);
  assert.equal((await judge.run(req())).status, 502); assert.equal(judge.calls.length, 3);
  assert.equal(judge.logs[0].attempts[1].provider, 'groq'); assert.deepEqual(judge.logs[0].attempts[1].usage, { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 });
  assert.equal(judge.logs[0].diagnostics, undefined);
});
