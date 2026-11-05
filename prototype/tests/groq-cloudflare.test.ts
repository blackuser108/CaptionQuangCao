import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample, sampleInput } from '../lib/samples.ts';
import { validOutput } from '../lib/content.ts';

const account = '0123456789abcdef0123456789abcdef';
const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
const groqModel = 'openai/gpt-oss-120b';
const cfModel = '@cf/qwen/qwen3-30b-a3b-fp8';
const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${cfModel}`;
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
const cfReply = (result: unknown) => Response.json({ success: true, errors: [], messages: [], result });

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
      value = { slots: prompt.slots.map((group: any) => ({
        candidates: group.candidates.map((candidate: any) => ({
          id: candidate.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5, fix: fix ? 'Giữ dữ kiện.' : '',
        })),
      })) };
    } else if (prompt.captions) {
      value = { captions: prompt.captions.map((caption: any) => caption.text) };
    } else {
      value = {
        slots: output.captions.map(text => ({ candidates: [{ text, p: .1 }, { text: text + ' Xem thêm.', p: .9 }] })),
        headlines: output.headlines,
        hashtags: output.hashtags.map(tag => ({ tag })),
      };
    }
    return call.url === groqUrl ? Response.json(completion(value, groqModel)) : cfReply(completion(value, cfModel));
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

test('Groq 429 and availability 5xx switch once and complete Deep with two judge rounds', async () => {
  for (const status of [429, 500, 502, 503]) {
    const f = fixture((_c, n) => n === 1 ? new Response('PRIVATE_UPSTREAM', { status }) : undefined);
    const r = await f.run(req());
    assert.equal(r.status, 200);
    assert.ok(validOutput(await r.json()));
    assert.deepEqual(f.calls.map(c => c.url), [groqUrl, cfUrl, cfUrl, cfUrl]);
    assert.deepEqual(f.logs[0].attempts.map((a: any) => a.stage), ['write', 'write', 'judge', 'judge-reverse']);
    for (const c of f.calls.slice(1)) {
      assert.equal(c.headers.get('authorization'), 'Bearer test-cloudflare-secret');
      assert.equal(c.body.response_format.type, 'json_schema');
      assert.equal(c.body.response_format.json_schema.type, 'object');
      assert.equal(c.body.response_format.json_schema.strict, undefined);
      assert.equal(c.body.model, undefined);
      assert.equal(c.body.include_reasoning, undefined);
    }
    assert.deepEqual(f.logs[0].usage, { prompt_tokens: 6, completion_tokens: 9, total_tokens: 15 });
    assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE_|test-.*-secret|messages|captions|Sổ tay/);
  }
});

test('Cloudflare native structured result can complete the active judge without redoing writer', async () => {
  const f = fixture((c, n) => {
    if (n === 3) return new Response('', { status: 503 });
    if (n === 4) {
      const { slots } = JSON.parse(c.body.messages[1].content);
      return cfReply({ response: { slots: slots.map((g: any) => ({
        candidates: g.candidates.map((candidate: any) => ({ id: candidate.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5, fix: '' })),
      })) } });
    }
  });
  assert.equal((await f.run(req())).status, 200);
  assert.deepEqual(f.calls.map(c => c.url), [groqUrl, groqUrl, groqUrl, cfUrl]);
});

test('Cloudflare HTTP and envelope failures stop after the switch', async () => {
  for (const response of [new Response('PRIVATE_BODY', { status: 429 }), new Response('PRIVATE_BODY', { status: 500 }),
    new Response('PRIVATE_BODY', { status: 401 }), Response.json({ success: false, errors: [{ message: 'PRIVATE_BODY' }] })]) {
    const f = fixture((_c, n) => n === 1 ? new Response('', { status: 429 }) : response);
    const r = await f.run(req());
    assert.equal(r.status, response.status === 429 ? 429 : 502);
    assert.deepEqual(f.calls.map(c => c.url), [groqUrl, cfUrl]);
    assert.doesNotMatch(await r.text(), /PRIVATE_|test-.*-secret/);
  }
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
  const slowFallback = fixture((c, n) => n === 1 ? new Response('', { status: 429 }) :
    new Promise((_resolve, reject) => c.signal.addEventListener('abort', () => reject(new Error('abort')), { once: true })), env, false, 20);
  assert.equal((await slowFallback.run(req())).status, 504);
  assert.deepEqual(slowFallback.calls.map(c => c.url), [groqUrl, cfUrl]);
  const controller = new AbortController();
  const cancel = fixture((_c, n) => {
    if (n === 2) { controller.abort(); return new Response('', { status: 429 }); }
  });
  assert.equal((await cancel.run(req(sampleInput, controller.signal))).status, 504);
  assert.deepEqual(cancel.calls.map(c => c.url), [groqUrl, groqUrl]);
});

test('Deep returns a budget error when an attempt is unavailable or polish needs a fifth call', async () => {
  for (const failedAt of [1, 2, 3, 4]) {
    const f = fixture((_c, n) => n === failedAt ? new Response('', { status: 429 }) : undefined, env, true);
    const r = await f.run(req());
    assert.equal(r.status, 502);
    const body = await r.json();
    assert.equal(body.error.code, 'AI_REQUEST_LIMIT');
    assert.equal(body.captions, undefined);
    assert.equal(f.calls.length, 4);
    assert.ok(f.calls.slice(failedAt).every(c => c.url === cfUrl));
  }
  for (const mode of ['single', 'smart']) {
    const f = fixture(() => new Response('', { status: 429 }), { ...env, CAPTION_PIPELINE: mode });
    assert.equal((await (await f.run(req())).json()).error.code, 'AI_REQUEST_LIMIT');
    assert.deepEqual(f.calls.map(c => c.url), [groqUrl]);
  }
});

test('malformed Cloudflare data and echoed credentials never produce output or another call', async () => {
  for (const response of [new Response('{'), new Response(' '.repeat(32769)),
    cfReply({ response: { slots: [] } }), cfReply({ response: { slots: [env.GROQ_API_KEY, env.CLOUDFLARE_API_TOKEN] } })]) {
    const f = fixture((_c, n) => n === 1 ? new Response('', { status: 429 }) : response);
    const r = await f.run(req());
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error.code, 'INVALID_AI_OUTPUT');
    assert.equal(f.calls.length, 2);
    assert.doesNotMatch(JSON.stringify(f.logs), /test-.*-secret/);
  }
  const judge = fixture((_c, n) => n === 1 ? new Response('', { status: 429 }) : n === 3 ? cfReply({ response: { slots: [] } }) : undefined);
  assert.equal((await judge.run(req())).status, 502);
  assert.deepEqual(judge.calls.map(c => c.url), [groqUrl, cfUrl, cfUrl]);
});
