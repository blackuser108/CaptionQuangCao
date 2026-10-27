import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { sampleInput, getSample } from '../lib/samples.ts';

const env = { FREELLMAPI_BASE_URL: 'http://127.0.0.1:31415/v1', FREELLMAPI_MODEL: 'auto', FREELLMAPI_API_KEY: 'test-secret-only' };
const output = getSample(0);
const request = (body: unknown = sampleInput, headers = {}, url = 'http://127.0.0.1:3000/api/generate') => new Request(url, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000', ...headers }, body: JSON.stringify(body),
});
const envelope = (value: unknown = output) => JSON.stringify({ model: 'test/model', usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 }, choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }] });
const fake = (body = envelope(), status = 200, headers = {}) => (async () => new Response(body, { status, headers })) as typeof fetch;
const handler = (fetchUpstream = fake(), extra = {}) => createGenerateHandler({ env, fetchUpstream, log: () => {}, ...extra });
async function failure(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  const data = await response.json();
  assert.equal(data.error.code, code);
  assert.equal(typeof data.error.message, 'string');
  assert.ok(data.error.message.length > 10);
  assert.doesNotMatch(JSON.stringify(data), /test-secret-only|UPSTREAM_PRIVATE|stack|Bearer/);
}

test('server sends fixed endpoint/alias/key, normalized four fields, and returns only canonical 3/3/5', async () => {
  const calls: { url: string; options: RequestInit }[] = [], logs: unknown[] = [];
  const fetchUpstream = (async (url: string | URL | Request, options: RequestInit) => {
    calls.push({ url: String(url), options });
    return new Response(envelope({ ...output, captions: ['a\u0301\r\nb', ...output.captions.slice(1)] }));
  }) as typeof fetch;
  const response = await handler(fetchUpstream, { log: (data: unknown) => logs.push(data) })(request({ ...sampleInput, productName: ' a\u0301 ' }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(Object.keys(result).sort(), ['captions', 'hashtags', 'headlines']);
  assert.equal(result.captions[0], 'á\nb');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, env.FREELLMAPI_BASE_URL + '/chat/completions');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(new Headers(calls[0].options.headers).get('authorization'), 'Bearer test-secret-only');
  const body = JSON.parse(String(calls[0].options.body));
  assert.equal(body.model, 'auto');
  assert.equal(body.stream, false);
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(JSON.parse(body.messages[1].content).productName, 'á');
  assert.doesNotMatch(JSON.stringify(body), /test-secret-only/);
  assert.match(body.messages[0].content, /45–90/);
  assert.match(body.messages[0].content, /115/);
  assert.match(body.messages[0].content, /Không suy diễn đặc tính hoặc lợi ích/);
  assert.match(body.messages[0].content, /bền đẹp/);
  assert.match(body.messages[0].content, /Mở đầu caption 2 và 3 bằng một câu ngắn/);
  assert.match(body.messages[0].content, /Không lặp toàn bộ danh sách đặc điểm/);
  assert.doesNotMatch(JSON.stringify(logs), /test-secret-only|Sổ tay|captions|messages/);
  assert.equal((logs[0] as { actualModel: string }).actualModel, 'test/model');
  assert.deepEqual((logs[0] as { usage: unknown }).usage, { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 });
});

test('invalid input/origin/content-type cannot invoke upstream', async () => {
  let calls = 0;
  const run = handler((async () => { calls++; return new Response(envelope()); }) as typeof fetch);
  for (const body of [null, [], {}, { ...sampleInput, productName: ' ' }, { ...sampleInput, description: 1 }, { ...sampleInput, tone: 'toString' }, { ...sampleInput, audience: 'x'.repeat(301) }, { ...sampleInput, productName: '😀'.repeat(121) }, { ...sampleInput, description: 'x'.repeat(1001) }, { ...sampleInput, model: 'other' }, { ...sampleInput, key: 'other' }, { ...sampleInput, upstream: 'http://example.com' }]) await failure(await run(request(body)), 422, 'INVALID_INPUT');
  await failure(await run(new Request('http://127.0.0.1:3000/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' })), 422, 'INVALID_INPUT');
  await failure(await run(request(sampleInput, { origin: 'https://evil.example' })), 422, 'INVALID_INPUT');
  await failure(await run(request(sampleInput, { 'sec-fetch-site': 'cross-site' })), 422, 'INVALID_INPUT');
  await failure(await run(request(sampleInput, { 'content-type': 'text/plain' })), 422, 'INVALID_INPUT');
  await failure(await run(request(sampleInput, { origin: 'http://evil.example:3000' }, 'http://evil.example:3000/api/generate')), 422, 'INVALID_INPUT');
  await failure(await run(request({ ...sampleInput, productName: 'x'.repeat(17000) })), 422, 'INVALID_INPUT');
  assert.equal(calls, 0);
});

test('exact normalized input limits and all tones are accepted', async () => {
  for (const tone of ['humorous', 'formal', 'youthful']) {
    const result = await handler()(request({ productName: '😀'.repeat(120), description: 'a\u0301'.repeat(1000), audience: 'a'.repeat(300), tone }));
    assert.equal(result.status, 200);
  }
});

test('Next internal localhost URL uses allowlisted Host for browser origin; forged hosts stay rejected', async () => {
  const run = handler();
  const result = await run(request(sampleInput, { host: '127.0.0.1:3000' }, 'http://localhost:3000/api/generate'));
  assert.equal(result.status, 200);
  await failure(await run(request(sampleInput, { host: 'evil.example:3000', origin: 'http://evil.example:3000' }, 'http://localhost:3000/api/generate')), 422, 'INVALID_INPUT');
  await failure(await run(request(sampleInput, { host: '127.0.0.1:9000', origin: 'http://127.0.0.1:9000' }, 'http://localhost:3000/api/generate')), 422, 'INVALID_INPUT');
});

test('missing/unsafe configuration fails closed before fetch', async () => {
  let calls = 0;
  for (const change of [{ FREELLMAPI_API_KEY: '' }, { FREELLMAPI_API_KEY: 'bad\nkey' }, { FREELLMAPI_BASE_URL: 'https://example.com/v1' }, { FREELLMAPI_BASE_URL: 'http://127.0.0.1:31415/v1?key=x' }, { FREELLMAPI_BASE_URL: 'http://user:pass@127.0.0.1:31415/v1' }, { FREELLMAPI_MODEL: 'different' }]) {
    const run = handler((async () => { calls++; return new Response(envelope()); }) as typeof fetch, { env: { ...env, ...change } });
    await failure(await run(request()), 503, 'AI_NOT_CONFIGURED');
  }
  assert.equal(calls, 0);
});

test('upstream HTTP errors/429/network are mapped without body leakage or retry', async () => {
  for (const status of [401, 403, 404, 429, 500, 503, 302]) {
    let calls = 0;
    const run = handler((async () => { calls++; return new Response('UPSTREAM_PRIVATE test-secret-only', { status }); }) as typeof fetch);
    await failure(await run(request()), status === 429 ? 429 : 502, status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
    assert.equal(calls, 1);
  }
  await failure(await handler((async () => { throw new Error('UPSTREAM_PRIVATE'); }) as typeof fetch)(request()), 503, 'AI_UNAVAILABLE');
});

test('invalid AI JSON, counts, types, duplicates, hashtags, extra fields and oversized strings fail clearly', async () => {
  const bad = [null, [], { ...output, captions: ['a'] }, { ...output, headlines: ['a', 'b', 5] }, { ...output, captions: ['a', 'b', ' '] }, { ...output, headlines: ['same', 'same', 'third'] }, { ...output, captions: ['á', 'a\u0301', 'third'] }, { ...output, hashtags: ['#a', '#A', '#b', '#c', '#d'] }, { ...output, hashtags: ['#a b', '#b', '#c', '#d', '#e'] }, { ...output, hashtags: ['#a#b', '#b', '#c', '#d', '#e'] }, { ...output, policy_safe: true }, { ...output, captions: ['x'.repeat(4001), 'b', 'c'] }, { ...output, captions: ['test-secret-only', 'b', 'c'] }];
  for (const value of bad) await failure(await handler(fake(envelope(value)))(request()), 502, 'INVALID_AI_OUTPUT');
  for (const text of ['not JSON UPSTREAM_PRIVATE', '{}', JSON.stringify({ choices: [{ message: { content: '```json\n{}\n```' } }] }), JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) }, finish_reason: 'length' }] })]) await failure(await handler(fake(text))(request()), 502, 'INVALID_AI_OUTPUT');
});

test('response cap counts UTF-8 bytes and cancels oversized chunked stream', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('á'.repeat(18000))); }, cancel() { cancelled = true; } });
  await failure(await handler((async () => new Response(stream)) as typeof fetch)(request()), 502, 'INVALID_AI_OUTPUT');
  assert.equal(cancelled, true);
  await failure(await handler(fake(envelope(), 200, { 'content-length': '40000' }))(request()), 502, 'INVALID_AI_OUTPUT');
});

test('timeout covers fetch and slow body, aborts once, never retries', async () => {
  let signal: AbortSignal | null = null, calls = 0, cancelled = false;
  const run = handler((async (_url, options) => {
    calls++; signal = options?.signal as AbortSignal;
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  }) as typeof fetch, { timeoutMs: 15 });
  await failure(await run(request()), 504, 'AI_TIMEOUT');
  assert.equal(calls, 1);
  assert.equal(signal!.aborted, true);
  assert.equal(cancelled, true);
  await failure(await handler(((_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError'))))) as typeof fetch, { timeoutMs: 15 })(request()), 504, 'AI_TIMEOUT');
});

test('one in-flight request per local process rejects concurrent generation', async () => {
  let release!: (response: Response) => void;
  const run = handler((() => new Promise(resolve => { release = resolve; })) as typeof fetch);
  const first = run(request());
  while (!release) await new Promise(resolve => setTimeout(resolve, 1));
  await failure(await run(request()), 429, 'RATE_LIMITED');
  release(new Response(envelope()));
  assert.equal((await first).status, 200);
});

test('editorial excess remains usable; untrusted metadata is not logged', async () => {
  const logs: unknown[] = [];
  const body = JSON.parse(envelope({ ...output, captions: ['a'.repeat(281), ...output.captions.slice(1)] }));
  body.model = 'test-secret-only'; body.usage = { prompt_tokens: 3, private: 'UPSTREAM_PRIVATE', completion_tokens: -5, total_tokens: 'UPSTREAM_PRIVATE' };
  const response = await handler(fake(JSON.stringify(body)), { log: (data: unknown) => logs.push(data) })(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).captions[0].length, 281);
  assert.doesNotMatch(JSON.stringify(logs), /test-secret-only|UPSTREAM_PRIVATE/);
});
