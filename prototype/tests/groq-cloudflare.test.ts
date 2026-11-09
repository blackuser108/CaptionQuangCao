import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeProviderOutput, type ProviderOutputMetadata } from '../lib/server/provider-output.ts';
import { responseFormat } from '../lib/engine/schemas.ts';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample, sampleInput } from '../lib/samples.ts';
import { validOutput } from '../lib/content.ts';

const account = '0123456789abcdef0123456789abcdef';
const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
const groqModel = 'openai/gpt-oss-120b';
const cfModel = '@cf/qwen/qwen3-30b-a3b-fp8';
const env = {
  AI_PROVIDER: 'groq', GROQ_MODEL: groqModel, GROQ_API_KEY: 'test-groq-secret', CAPTION_PIPELINE: 'deep',
  CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: 'test-cloudflare-secret',
};
const output = getSample(0);
const usage = { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 };
const req = (body: unknown = sampleInput, signal?: AbortSignal) => new Request('http://127.0.0.1:3000/api/generate', {
  method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
});
type Call = { url: string; body: any; signal: AbortSignal; headers: Headers };
const completion = (value: unknown, model: string) => ({
  model, usage, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }],
});
const writerPool = (texts = output.captions) => ({
  slots: texts.map(text => ({ candidates: [{ text }, { text: text + ' Xem thêm.' }] })),
  headlines: output.headlines,
  hashtags: output.hashtags.map(tag => ({ tag })),
});
const judgeRows = (slots: { candidates: { id: string }[] }[], fix = '') => ({ slots: slots.map(group => ({
  candidates: group.candidates.map(candidate => ({
    id: candidate.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5, fix,
  })),
})) });

function fixture(reply?: (call: Call, n: number) => Response | Promise<Response> | undefined, settings: Record<string, string | undefined> = env, fix = false, timeoutMs = 90000) {
  const calls: Call[] = [], logs: any[] = [];
  const fetchUpstream: typeof fetch = async (url, options) => {
    const call = { url: String(url), body: JSON.parse(String(options?.body)), signal: options?.signal as AbortSignal, headers: new Headers(options?.headers) };
    calls.push(call);
    const response = await reply?.(call, calls.length);
    if (response) return response;
    const prompt = JSON.parse(call.body.messages[1].content);
    let value: unknown;
    if (prompt.slots) {
      value = judgeRows(prompt.slots, fix ? 'Giữ dữ kiện.' : '');
    } else if (prompt.captions) {
      value = { captions: prompt.captions.map((caption: { text: string }) => caption.text) };
    } else {
      value = writerPool();
    }
    assert.equal(call.url, groqUrl);
    return Response.json(completion(value, groqModel));
  };
  return { calls, logs, run: createGenerateHandler({ env: settings, fetchUpstream, timeoutMs, log: data => logs.push(data) }) };
}

test('Groq completes all four Deep stages directly with strict Structured Outputs', async () => {
  const f = fixture(undefined, env, true);
  const r = await f.run(req());
  assert.equal(r.status, 200);
  assert.ok(validOutput(await r.json()));
  assert.deepEqual(f.calls.map(c => c.url), Array(4).fill(groqUrl));
  for (const c of f.calls) {
    assert.equal(c.headers.get('authorization'), 'Bearer test-groq-secret');
    assert.equal(c.body.model, groqModel);
    assert.equal(c.body.response_format.type, 'json_schema');
    assert.equal(c.body.response_format.json_schema.strict, true);
    assert.equal(c.body.reasoning_effort, 'low');
    assert.equal(c.body.include_reasoning, false);
    assert.equal(c.signal.aborted, true);
  }
  assert.deepEqual(f.logs[0].attempts.map((a: any) => a.stage), ['write', 'judge', 'judge-reverse', 'polish']);
});

test('Deep stops at an unavailable stage if reserving polish would exceed the cap', async () => {
  for (const status of [429, 500, 502, 503]) {
    for (const failedAt of [1, 2, 3, 4]) {
      const f = fixture((_c, n) => n === failedAt ? new Response('PRIVATE_BODY', { status }) : undefined, env, true);
      const r = await f.run(req());
      assert.equal(r.status, status === 429 ? 429 : 502);
      assert.equal((await r.json()).error.code, status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
      assert.deepEqual(f.calls.map(c => c.url), Array(failedAt).fill(groqUrl));
      assert.deepEqual(f.logs[0].fallbackBudget, {
        stage: ['write', 'judge', 'judge-reverse', 'polish'][failedAt - 1], remaining: 4 - failedAt, required: 5 - failedAt,
      });
      assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE_BODY|test-.*-secret/);
    }
  }
  for (const mode of ['smart']) {
    const f = fixture(() => new Response('', { status: 429 }), { ...env, CAPTION_PIPELINE: mode });
    assert.equal((await (await f.run(req())).json()).error.code, 'RATE_LIMITED');
    assert.deepEqual(f.calls.map(c => c.url), [groqUrl, `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${cfModel}`]);
  }
});

test('Cloudflare decoder accepts native and chat result envelopes, and reports distinct output failures', () => {
  const wrap = (result: unknown) => JSON.stringify({ success: true, result });
  const containsKey = (value: string) => value.includes('PRIVATE_KEY');
  const metadata: ProviderOutputMetadata = {};
  assert.deepEqual(decodeProviderOutput(wrap({ response: output }), true, containsKey, metadata), output);
  assert.deepEqual(decodeProviderOutput(wrap({ response: JSON.stringify(output) }), true, containsKey, metadata), output);
  assert.deepEqual(decodeProviderOutput(wrap(completion(output, cfModel)), true, containsKey, metadata), output);
  assert.deepEqual(metadata, { actualModel: cfModel, finishReason: 'stop', usage });
  assert.deepEqual(responseFormat('cloudflare', 'judge', [['A', 'B']]), { type: 'json_object' });
  const cases = [
    ['{', 'PROVIDER_JSON'],
    ['{"success":false,"result":{"response":{}}}', 'PROVIDER_ENVELOPE'],
    [wrap({ choices: [{}], response: output }), 'PROVIDER_ENVELOPE'],
    [wrap({ response: '{' }), 'OUTPUT_JSON'],
    [wrap({ response: '{', finish_reason: 'length' }), 'OUTPUT_TRUNCATED'],
    [wrap({ response: { secret: 'PRIVATE_KEY' } }), 'OUTPUT_SENSITIVE'],
    [wrap({ response: {}, finish_reason: 'PRIVATE_TEXT' }), 'OUTPUT_FINISH'],
  ];
  for (const [text, reason] of cases) {
    assert.throws(() => decodeProviderOutput(text, true, containsKey, metadata), { message: 'INVALID_AI_OUTPUT', reason });
  }
  assert.equal(metadata.finishReason, 'other');
});

test('Groq auth, input, gateway timeout and invalid schema do not switch providers', async () => {
  for (const status of [400, 401, 402, 403, 404, 408, 422, 501, 504, 505]) {
    const f = fixture(() => new Response('PRIVATE_BODY', { status }));
    assert.equal((await f.run(req())).status, 502);
    assert.deepEqual(f.calls.map(c => c.url), [groqUrl]);
  }
  const judge = fixture((_c, n) => n === 2 ? Response.json(completion({ slots: [] }, groqModel)) : undefined);
  const r = await judge.run(req());
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error.code, 'INVALID_AI_OUTPUT');
  assert.deepEqual(judge.calls.map(c => c.url), [groqUrl, groqUrl]);
});

test('configuration and client overrides fail closed before inference', async () => {
  for (const change of [{ GROQ_API_KEY: '' }, { CLOUDFLARE_API_TOKEN: '' }, { CLOUDFLARE_ACCOUNT_ID: undefined },
    { CLOUDFLARE_ACCOUNT_ID: '../../other' }, { CLOUDFLARE_API_TOKEN: 'bad\nkey' },
    { GROQ_MODEL: 'auto' }, { CLOUDFLARE_AI_MODEL: '@cf/unapproved/model' },
    { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-retired-secret', GEMINI_MODEL: 'gemini-3.5-flash', GEMINI_FALLBACK: 'groq' }]) {
    const f = fixture(undefined, { ...env, ...change });
    assert.equal((await f.run(req())).status, 503);
    assert.equal(f.calls.length, 0);
  }
  for (const name of ['provider', 'url', 'model', 'key', 'mode']) {
    const f = fixture();
    assert.equal((await f.run(req({ ...sampleInput, [name]: 'override' }))).status, 422);
    assert.equal(f.calls.length, 0);
  }
});

test('network failure, timeout and cancellation do not trigger another provider', async () => {
  const network = fixture(() => { throw new Error('PRIVATE_NETWORK'); });
  assert.equal((await network.run(req())).status, 503);
  assert.equal(network.calls.length, 1);
  const slow = fixture(c => new Promise((_resolve, reject) => c.signal.addEventListener('abort', () => reject(new Error('abort')), { once: true })), env, false, 20);
  assert.equal((await slow.run(req())).status, 504);
  assert.equal(slow.calls.length, 1);
  const controller = new AbortController();
  const cancel = fixture((_c, n) => {
    if (n === 2) { controller.abort(); return new Response('', { status: 429 }); }
  });
  assert.equal((await cancel.run(req(sampleInput, controller.signal))).status, 504);
  assert.deepEqual(cancel.calls.map(c => c.url), [groqUrl, groqUrl]);
});

test('Writer stops before judging if captions, headlines or hashtags cannot form a valid set', async () => {
  const pool = writerPool();
  for (const [value, reason] of [
    [{ ...pool, slots: [{ candidates: [{ text: '' }] }, ...pool.slots.slice(1)] }, 'POOL_CANDIDATES'],
    [{ ...pool, slots: Array(3).fill({ candidates: [{ text: output.captions[0] }] }) }, 'POOL_CANDIDATES'],
    [{ ...pool, headlines: ['Bìa xanh', 'BÌA XANH', 'Sổ tay'] }, 'POOL_HEADLINES'],
    [{ ...pool, hashtags: ['#A', '#a', '#b', '#c', '#d'].map(tag => ({ tag })) }, 'POOL_HASHTAGS'],
    [{ ...pool, hashtags: undefined }, 'POOL_HASHTAGS'],
  ] as const) {
    const f = fixture(() => Response.json(completion(value, groqModel)));
    const response = await f.run(req());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error.code, 'INVALID_AI_OUTPUT');
    assert.deepEqual(f.logs[0].outputError, { reason, stage: 'write' });
    assert.equal(f.calls.length, 1);
  }
});

test('Feasible distinct captions survive duplicate winners and duplicate polish suggestions', async () => {
  const [a, b, c] = output.captions;
  const pool = {
    ...writerPool(),
    slots: [[a, b], [a], [c]].map(texts => ({ candidates: texts.map(text => ({ text })) })),
  };
  const f = fixture((call, n) => {
    if (n === 1) return Response.json(completion(pool, groqModel));
    if (n === 4) return Response.json(completion({ captions: [a, a, a] }, groqModel));
    const { slots } = JSON.parse(call.body.messages[1].content);
    const scores = judgeRows(slots, 'Giữ dữ kiện.');
    const weaker = slots[0].candidates.findIndex((row: { text: string }) => row.text === b);
    Object.assign(scores.slots[0].candidates[weaker], { stop: 1, concrete: 1, voice: 1, natural: 1, faithful: 5 });
    return Response.json(completion(scores, groqModel));
  });
  const r = await f.run(req());
  assert.equal(r.status, 200);
  const actual = await r.json();
  assert.ok(validOutput(actual));
  assert.deepEqual(actual.captions, [b, a, c]);
  assert.equal(f.calls.length, 4);
});

test('Groq judge schema uses IDs from each actual slot and refuses wrong score, shape or IDs before reverse judge', async () => {
  const pool = writerPool();
  pool.slots[0].candidates = pool.slots[0].candidates.slice(0, 1);
  pool.slots[2].candidates.push({ text: 'Bìa màu xanh cho ghi chép.' });
  type Rows = ReturnType<typeof judgeRows>['slots'][number]['candidates'];
  const cases: [string, (rows: Rows) => void][] = [
    ['JUDGE_ID_MISSING', rows => { rows.pop(); }],
    ['JUDGE_ID_DUPLICATE', rows => { rows[1].id = rows[0].id; }],
    ['JUDGE_ID_UNKNOWN', rows => { rows[0].id = 'C'; }],
    ['JUDGE_SCHEMA', rows => { rows[0].voice = 6; }],
    ['JUDGE_SCHEMA', rows => { rows[0].fix = 'a'.repeat(161); }],
    ['JUDGE_SCHEMA', rows => { Object.assign(rows[0], { extra: true }); }],
  ];
  for (const [reason, corrupt] of cases) {
    const f = fixture((call, n) => {
      if (n === 1) return Response.json(completion(pool, groqModel));
      const prompt = JSON.parse(call.body.messages[1].content);
      const schema = call.body.response_format.json_schema.schema;
      const variants = schema.properties.slots.items.anyOf;
      assert.deepEqual(variants.map((variant: any) => variant.properties.candidates.items.properties.id.enum),
        prompt.slots.map((slot: any) => slot.candidates.map((candidate: any) => candidate.id)));
      assert.deepEqual(variants[0].properties.candidates.items.properties.stop.enum, [1, 2, 3, 4, 5]);
      const scores = judgeRows(prompt.slots);
      corrupt(scores.slots[1].candidates);
      return Response.json(completion(scores, groqModel));
    });
    const r = await f.run(req());
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error.code, 'INVALID_AI_OUTPUT');
    assert.deepEqual(f.logs[0].outputError, { reason, stage: 'judge' });
    assert.equal(f.calls.length, 2);
  }
});

test('Response diagnostics separate transport, truncation, schema and final output without leaking content', async () => {
  const cases = [
    [() => new Response('PRIVATE_BODY'), 'PROVIDER_JSON', 'single'],
    [() => new Response(' '.repeat(32769)), 'PROVIDER_BODY_LIMIT', 'single'],
    [() => Response.json({ model: groqModel }), 'PROVIDER_ENVELOPE', 'single'],
    [() => Response.json({ choices: [{ finish_reason: 'length', message: { content: '{' } }], usage }), 'OUTPUT_TRUNCATED', 'single'],
    [() => Response.json({ choices: [{ message: { content: '{' } }] }), 'OUTPUT_JSON', 'single'],
    [() => Response.json(completion({ captions: [env.GROQ_API_KEY] }, groqModel)), 'OUTPUT_SENSITIVE', 'single'],
    [() => Response.json(completion({ ...output, headlines: [] }, groqModel)), 'FINAL_OUTPUT', 'final'],
  ] as const;
  for (const [reply, reason, stage] of cases) {
    const f = fixture(reply, { ...env, CAPTION_PIPELINE: 'single' });
    const response = await f.run(req());
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error.code, 'INVALID_AI_OUTPUT');
    assert.equal(body.error.reason, undefined);
    assert.deepEqual(f.logs[0].outputError, { reason, stage });
    assert.equal(f.calls.length, 1);
    assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE_BODY|test-.*-secret|messages|captions|Sổ tay/);
  }

  const polish = fixture((_c, n) => n === 4 ? Response.json(completion({ captions: [] }, groqModel)) : undefined, env, true);
  assert.equal((await polish.run(req())).status, 502);
  assert.deepEqual(polish.logs[0].outputError, { reason: 'POLISH_SCHEMA', stage: 'polish' });
  assert.equal(polish.calls.length, 4);
});

test('Groq attempt metadata retains bounded quota headers, response bytes and usage only', async () => {
  const f = fixture((_c, n) => n === 2 ? new Response('PRIVATE_BODY', { status: 429, headers: {
    'retry-after': '9',
    'x-ratelimit-limit-tokens': '8000',
    'x-ratelimit-remaining-tokens': '350',
    'x-ratelimit-reset-tokens': '9.25s',
    'x-ratelimit-reset-requests': 'PRIVATE_BODY',
    'x-ratelimit-remaining-requests': '999999999999999999999',
    'x-unexpected': 'PRIVATE_BODY',
  } }) : undefined);
  assert.equal((await f.run(req())).status, 429);
  const log = f.logs[0];
  assert.equal(log.attempts[0].responseBytes, Buffer.byteLength(JSON.stringify(completion(writerPool(), groqModel))));
  assert.equal(log.attempts[0].actualModel, groqModel);
  assert.equal(log.attempts[0].finishReason, 'stop');
  assert.deepEqual(log.attempts[0].usage, usage);
  assert.deepEqual(log.usage, usage);
  assert.deepEqual(log.attempts[1].quota, {
    'x-ratelimit-limit-tokens': 8000, 'x-ratelimit-remaining-tokens': 350, 'x-ratelimit-reset-tokens': '9.25s',
  });
  assert.equal(log.attempts[1].retryAfterSeconds, 9);
  assert.doesNotMatch(JSON.stringify(log), /PRIVATE_BODY|test-.*-secret|messages|captions|Sổ tay/);
});
