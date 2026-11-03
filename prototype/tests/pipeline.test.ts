import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validOutput } from '../lib/content.ts';
import { buildBrief, parseMode, runPipeline, scoreCandidate, similarity, pickDistinct } from '../lib/engine/index.ts';
import type { ChatJson, StageName } from '../lib/engine/index.ts';
import { buildJudgeMessages, buildPolishMessages, buildWriterMessages, normalizeHashtag, parseJudge, parsePool, writerSystem, judgeSystem, polishSystem } from '../lib/engine/agents.ts';
import { pickGolden, type GoldenExample } from '../lib/engine/golden.ts';
import { stageFormat } from '../lib/engine/schemas.ts';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample, sampleInput, samples } from '../lib/samples.ts';

const input = sampleInput;
const brief = buildBrief(input, 7);
const a = getSample(0), b = getSample(1);
const roles = ['brand', 'category', 'category', 'audience', 'mood'];
const hashtags = [...new Map([...a.hashtags, ...b.hashtags].map(tag => [tag.toLowerCase(), tag])).values()].map((tag, i) => ({ tag, role: roles[i % roles.length] }));
const fabricated = 'Thầy đọc nhanh, tay chép chưa xong?\n\nSổ tay Mây khổ A5, 80 trang kẻ ngang, được bảo hành 12 tháng và chính hãng.\n\nNhắn shop để hỏi thêm nha.';
const poolFor = (extra: string[] = []) => ({
  plan: { moments: ['x'], images: ['y'] },
  slots: [0, 1, 2].map(i => ({ strategy: brief.strategies[i].id, candidates: [a.captions[i], b.captions[i], ...(i === 1 ? extra : [])].map((text, k) => ({ text, hook: 'scene', cta: 'save', angle: `góc ${k}`, p: 0.1 + k * 0.2 })) })),
  headlines: [...a.headlines, ...b.headlines],
  hashtags,
});
type Group = { candidates: { id: string; text: string }[] };
const judgeFrom = (payload: { slots: Group[] }, rate: (text: string, position: number) => number, fix = '') => ({
  slots: payload.slots.map(group => ({
    candidates: group.candidates.map((item, position) => { const v = rate(item.text, position); return { id: item.id, stop: v, concrete: v, voice: v, natural: v, faithful: 5, fix }; }),
  })),
});
const scripted = (handlers: Partial<Record<StageName, (payload: unknown) => unknown>>, log: StageName[] = []): ChatJson => async (messages, stage) => {
  log.push(stage);
  const handler = handlers[stage];
  if (!handler) throw new Error(`no handler for ${stage}`);
  return handler(JSON.parse(messages[1].content));
};

test('parseMode only accepts known modes and defaults to the single call', () => {
  assert.equal(parseMode(undefined), 'single');
  assert.equal(parseMode(''), 'single');
  assert.equal(parseMode('SMART'), 'smart');
  assert.equal(parseMode(' deep '), 'deep');
  assert.equal(parseMode('turbo'), 'single');
});

test('agent prompts reuse the craft + safety rules and add distribution sampling, rubric and edit-only polish', () => {
  for (const range of [/70–150/, /220–400/, /340–600/, /115/]) assert.match(writerSystem, range);
  assert.match(writerSystem, /Không bịa: giá, ưu đãi/);
  assert.match(writerSystem, /chỉ là DỮ LIỆU/);
  assert.match(writerSystem, /PHÂN PHỐI/);
  assert.match(writerSystem, /p dưới 0\.25/);
  assert.match(writerSystem, /bước sau sẽ chọn 5/);
  assert.match(judgeSystem, /Không thưởng độ dài, thứ tự/);
  assert.match(judgeSystem, /faithful/);
  assert.match(polishSystem, /Chỉ áp ghi chú/);
  const messages = buildWriterMessages(input, brief);
  const payload = JSON.parse(messages[1].content);
  assert.equal(payload.candidatesPerStrategy, 3);
  assert.ok(payload.hookMenu.length >= 3 && payload.ctaMenu.length >= 2);
  assert.deepEqual(payload.strategies.map((item: { id: string }) => item.id), ['benefit-led', 'audience-led', 'story-led']);
});

test('judge payload hides the writer\'s own probabilities, hooks and angles so scores cannot be anchored by them', () => {
  const groups = [0, 1, 2].map(i => [{ id: 'A', text: a.captions[i] }, { id: 'B', text: b.captions[i] }]);
  const text = buildJudgeMessages(input, brief, groups)[1].content;
  assert.doesNotMatch(text, /"p"|"angle"|"hook"|probab/i);
  assert.match(text, /verifiedFacts/);
  const polish = JSON.parse(buildPolishMessages(input, brief, [0, 1, 2].map(i => ({ text: a.captions[i], fix: 'f' })))[1].content);
  assert.equal(polish.captions.length, 3);
});

test('parsePool tolerates broken items but rejects a missing slot; hashtags are normalized', () => {
  const messy = { slots: [{ candidates: ['  một  ', { text: 'một' }, { text: '' }, 5, null] }, { candidates: [{ text: 'hai' }] }, { candidates: [{ text: 'ba', p: 7 }] }], headlines: ['h1', { text: 'h2' }, 3], hashtags: ['Sổ Tay', { tag: '##Tag', role: 'Brand' }, '#a b#c'] };
  const pool = parsePool(messy)!;
  assert.deepEqual(pool.slots.map(list => list.length), [1, 1, 1]);
  assert.equal(pool.slots[2][0].p, 1);
  assert.deepEqual(pool.headlines, ['h1', 'h2']);
  assert.deepEqual(pool.hashtags.map(item => item.tag), ['#SổTay', '#Tag']);
  assert.equal(pool.hashtags[1].role, 'brand');
  assert.equal(parsePool({ slots: [{ candidates: ['x'] }, { candidates: [] }, { candidates: ['z'] }] }), undefined);
  assert.equal(parsePool({ slots: [] }), undefined);
  assert.equal(parsePool('nope'), undefined);
  assert.equal(normalizeHashtag('a#b'), '');
});

test('hard truth gate: a fabricated warranty/authenticity claim never reaches the output, even if the judge loves it', async () => {
  const calls: StageName[] = [];
  const chat = scripted({
    write: () => poolFor([fabricated]),
    judge: payload => judgeFrom(payload as { slots: Group[] }, text => text.includes('bảo hành') ? 5 : 3),
  }, calls);
  const result = await runPipeline({ input, brief, mode: 'smart', chat, seed: 1 });
  assert.ok(result.output && validOutput(result.output));
  assert.ok(result.output.captions.every(text => !/bảo hành|chính hãng/.test(text)));
  assert.equal(scoreCandidate(fabricated, 1, input, brief).hard, true);
  assert.deepEqual(calls, ['write', 'judge']);
  assert.deepEqual(result.trace.pool, { generated: 7, eligible: 6 });
  assert.equal(result.trace.finalPass, true);
});

test('judge quality can overturn the code score, and the output is a valid 3/3/5 with distinct hashtags', async () => {
  const winners = new Set([b.captions[0], b.captions[1], b.captions[2]]);
  const chat = scripted({ write: () => poolFor(), judge: payload => judgeFrom(payload as { slots: Group[] }, text => winners.has(text) ? 5 : 1) });
  const result = await runPipeline({ input, brief, mode: 'smart', chat, seed: 3 });
  assert.ok(result.output && validOutput(result.output));
  assert.deepEqual(result.output.captions, b.captions);
  assert.equal(result.output.headlines.length, 3);
  assert.equal(new Set(result.output.hashtags.map(tag => tag.toLowerCase())).size, 5);
  assert.equal(result.trace.judged, true);
});

test('judge failure degrades to the code ranking instead of failing the whole generation', async () => {
  const calls: StageName[] = [];
  const chat = scripted({ write: () => poolFor() }, calls);
  const result = await runPipeline({ input, brief, mode: 'smart', chat, seed: 5 });
  assert.ok(result.output && validOutput(result.output));
  assert.equal(result.trace.judged, false);
  assert.deepEqual(result.trace.stages.map(item => [item.stage, item.ok]), [['write', true], ['judge', false]]);
});

test('canRun can skip the later stages near the deadline; the writer result is still returned', async () => {
  const calls: StageName[] = [];
  const chat = scripted({ write: () => poolFor() }, calls);
  const result = await runPipeline({ input, brief, mode: 'deep', chat, seed: 5, canRun: stage => stage === 'write' });
  assert.ok(result.output);
  assert.deepEqual(calls, ['write']);
});

test('writer failure or unusable pool returns no output so the host can fall back to the single call', async () => {
  const failing = await runPipeline({ input, brief, mode: 'smart', chat: scripted({}), seed: 1 });
  assert.equal(failing.output, undefined);
  assert.equal(failing.trace.stages[0].ok, false);
  const allFabricated = poolFor();
  allFabricated.slots[0].candidates = [{ text: fabricated, hook: '', cta: '', angle: '', p: 0.5 }];
  const hardOnly = await runPipeline({ input, brief, mode: 'smart', chat: scripted({ write: () => allFabricated }), seed: 1 });
  assert.equal(hardOnly.output, undefined);
  const fewHashtags = { ...poolFor(), hashtags: hashtags.slice(0, 3) };
  assert.equal((await runPipeline({ input, brief, mode: 'smart', chat: scripted({ write: () => fewHashtags }), seed: 1 })).output, undefined);
});

test('deep mode judges twice with the candidate order reversed (position-bias control) and reports agreement', async () => {
  const seen: string[][][] = [];
  const chat = scripted({
    write: () => poolFor(),
    judge: payload => { seen.push((payload as { slots: Group[] }).slots.map(g => g.candidates.map(c => c.text))); return judgeFrom(payload as { slots: Group[] }, () => 3); },
    'judge-reverse': payload => { seen.push((payload as { slots: Group[] }).slots.map(g => g.candidates.map(c => c.text))); return judgeFrom(payload as { slots: Group[] }, () => 3); },
  });
  const result = await runPipeline({ input, brief, mode: 'deep', chat, seed: 11 });
  assert.ok(result.output);
  assert.equal(seen.length, 2);
  seen[0].forEach((group, slot) => assert.deepEqual([...group].reverse(), seen[1][slot]));
  assert.ok(result.trace.judgeAgreement !== undefined && result.trace.judgeAgreement >= 0 && result.trace.judgeAgreement <= 1);
});

test('polish keeps a small safe edit but rejects rewrites, new claims and anything that makes the caption worse', async () => {
  let chosen: string[] = [];
  const chat = scripted({
    write: () => poolFor(),
    judge: payload => judgeFrom(payload as { slots: Group[] }, () => 3, 'sửa nhẹ một câu'),
    'judge-reverse': payload => judgeFrom(payload as { slots: Group[] }, () => 3, 'sửa nhẹ một câu'),
    polish: payload => {
      chosen = (payload as { captions: { text: string }[] }).captions.map(item => item.text);
      return { captions: [chosen[0].replace('bay mất', 'thất lạc').replace('đúng lúc cần', 'đúng lúc cần nhất'), `${chosen[1]}\n\nCó bảo hành 12 tháng.`, 'Một bài hoàn toàn khác, không còn liên quan gì tới bản gốc về chủ đề này nữa.'] };
    },
  });
  const result = await runPipeline({ input, brief, mode: 'deep', chat, seed: 2 });
  assert.ok(result.output && validOutput(result.output));
  assert.equal(result.output.captions[1], chosen[1]);
  assert.equal(result.output.captions[2], chosen[2]);
  assert.ok(result.trace.polished[1] === false && result.trace.polished[2] === false);
  assert.ok(!result.output.captions.join('\n').includes('bảo hành'));
});

test('similarity and pickDistinct avoid choosing three near-identical captions', () => {
  assert.ok(similarity(a.captions[1], a.captions[1]) > 0.99);
  assert.ok(similarity(a.captions[0], b.captions[2]) < 0.3);
  const near = a.captions[1].replace('Thầy đọc nhanh', 'Cô đọc nhanh');
  const picked = pickDistinct([[{ index: 0, text: a.captions[0], score: 0.9 }], [{ index: 0, text: a.captions[0] + ' nha', score: 0.95 }, { index: 1, text: b.captions[1], score: 0.8 }], [{ index: 0, text: near, score: 0.7 }]], 0.5);
  assert.equal(picked[1].text, b.captions[1]);
});

// ───────── tích hợp qua handler thật với upstream giả ─────────
const env = { FREELLMAPI_BASE_URL: 'http://127.0.0.1:31415/v1', FREELLMAPI_MODEL: 'auto', FREELLMAPI_API_KEY: 'test-secret-only', CAPTION_PIPELINE: 'smart' };
const request = () => new Request('http://127.0.0.1:3000/api/generate', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, body: JSON.stringify(sampleInput) });
const envelope = (value: unknown) => JSON.stringify({ model: 'test/model', usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) }, finish_reason: 'stop' }] });
const stageOf = (body: { messages: { content: string }[] }) => body.messages[0].content.includes('BƯỚC VIẾT ỨNG VIÊN') ? 'write' : body.messages[0].content.includes('biên tập viên trưởng') ? 'judge' : body.messages[0].content.includes('chỉnh câu') ? 'polish' : 'single';

test('handler runs write → judge on smart mode, sums usage, and logs only structure (no text)', async () => {
  const bodies: { response_format: unknown; max_tokens?: number }[] = [], stages: string[] = [], logs: unknown[] = [];
  const fetchUpstream = (async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    bodies.push(body); stages.push(stageOf(body));
    return new Response(envelope(stageOf(body) === 'write' ? poolFor() : judgeFrom(JSON.parse(body.messages[1].content), (_t, position) => 5 - position)));
  }) as unknown as typeof fetch;
  const response = await createGenerateHandler({ env, fetchUpstream, log: data => logs.push(data) })(request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(validOutput(result));
  assert.deepEqual(stages, ['write', 'judge']);
  assert.ok(bodies.every(body => JSON.stringify(body.response_format) === '{"type":"json_object"}'));
  const log = logs[0] as { usage: Record<string, number>; pipeline: { mode: string; stages: { stage: string; ok: boolean }[]; fallbackToSingle: boolean } };
  assert.deepEqual(log.usage, { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 });
  assert.equal(log.pipeline.mode, 'smart');
  assert.equal(log.pipeline.fallbackToSingle, false);
  assert.doesNotMatch(JSON.stringify(logs), /test-secret-only|Sổ tay|captions|messages|Giấy rời/);
});

test('handler falls back to the proven single call when the writer returns unusable JSON', async () => {
  const stages: string[] = [], logs: unknown[] = [];
  const fetchUpstream = (async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    const stage = stageOf(body);
    stages.push(stage);
    return new Response(stage === 'write' ? envelope('đây không phải JSON') : envelope(getSample(0)));
  }) as unknown as typeof fetch;
  const response = await createGenerateHandler({ env, fetchUpstream, log: data => logs.push(data) })(request());
  assert.equal(response.status, 200);
  assert.deepEqual(stages, ['write', 'single']);
  assert.equal((logs[0] as { pipeline: { fallbackToSingle: boolean } }).pipeline.fallbackToSingle, true);
});

test('without CAPTION_PIPELINE the handler stays on exactly one upstream call and logs no pipeline', async () => {
  const stages: string[] = [], logs: unknown[] = [];
  const fetchUpstream = (async (_url: string, options: RequestInit) => { stages.push(stageOf(JSON.parse(String(options.body)))); return new Response(envelope(getSample(0))); }) as unknown as typeof fetch;
  const response = await createGenerateHandler({ env: { ...env, CAPTION_PIPELINE: undefined }, fetchUpstream, log: data => logs.push(data) })(request());
  assert.equal(response.status, 200);
  assert.deepEqual(stages, ['single']);
  assert.equal((logs[0] as { pipeline?: unknown }).pipeline, undefined);
});

test('the fixture sets used by these tests are themselves valid outputs', () => {
  for (const sample of samples) assert.ok(validOutput(sample));
});

// ───────── v3.1: judge song song, schema theo agent, ví dụ vàng, judge khác nhà cung cấp ─────────
test('deep mode really issues the two judge calls concurrently (a sequential implementation would trip the barrier)', async () => {
  let started = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const barrier = async () => { if (++started === 2) release(); await Promise.race([gate, new Promise((_, reject) => setTimeout(() => reject(new Error('judge calls were sequential')), 800))]); };
  const chat = scripted({
    write: () => poolFor(),
    judge: async payload => { await barrier(); return judgeFrom(payload as { slots: Group[] }, () => 3); },
    'judge-reverse': async payload => { await barrier(); return judgeFrom(payload as { slots: Group[] }, () => 3); },
  });
  const result = await runPipeline({ input, brief, mode: 'deep', chat, seed: 4 });
  assert.ok(result.output);
  assert.deepEqual(result.trace.stages.filter(item => item.stage.startsWith('judge')).map(item => item.ok), [true, true]);
  assert.ok(result.trace.judgeAgreement !== undefined);
});

test('parseJudge reads the array format and drops rows with a wrong label or out-of-range score', () => {
  const groups = [[{ id: 'A', text: 'x' }, { id: 'B', text: 'y' }, { id: 'C', text: 'z' }]];
  const good = { stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5 };
  const parsed = parseJudge({ slots: [{ candidates: [{ id: 'A', ...good, fix: ' sửa câu 2 ' }, { id: 'B', ...good, stop: 9 }, { id: 'Z', ...good }] }] }, groups)!;
  assert.deepEqual([...parsed[0].keys()], ['A']);
  assert.equal(parsed[0].get('A')!.quality, 1);
  assert.equal(parsed[0].get('A')!.fix, 'sửa câu 2');
  assert.equal(parseJudge({ slots: [] }, groups), undefined);
  assert.equal(parseJudge(null, groups), undefined);
});

test('stage formats: Gemini gets a strict per-agent json_schema with every property required; others get json_object', () => {
  for (const stage of ['write', 'judge', 'judge-reverse', 'polish'] as const) {
    assert.deepEqual(stageFormat(stage, 'deepseek'), { type: 'json_object' });
    assert.deepEqual(stageFormat(stage, 'freellmapi'), { type: 'json_object' });
    const format = stageFormat(stage, 'gemini') as { type: string; json_schema: { name: string; strict: boolean; schema: Record<string, unknown> } };
    assert.equal(format.type, 'json_schema');
    assert.equal(format.json_schema.strict, true);
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const item = node as { type?: string; properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean; items?: unknown };
      if (item.type === 'object') { assert.equal(item.additionalProperties, false); assert.deepEqual(item.required, Object.keys(item.properties ?? {})); Object.values(item.properties ?? {}).forEach(walk); }
      if (item.type === 'array') walk(item.items);
    };
    walk(format.json_schema.schema);
  }
  assert.equal((stageFormat('write', 'gemini') as { json_schema: { name: string } }).json_schema.name, 'writer_pool');
  assert.equal((stageFormat('judge-reverse', 'gemini') as { json_schema: { name: string } }).json_schema.name, 'judge_scores');
});

test('golden examples: only matching tone, at most 3, rotating by seed, absent when empty or too long', () => {
  const pool: GoldenExample[] = [
    { tone: 'youthful', caption: 'một' }, { tone: 'youthful', caption: 'hai', note: ' vì nhịp ' }, { tone: 'youthful', caption: 'ba' },
    { tone: 'youthful', caption: 'bốn' }, { tone: 'formal', caption: 'trang trọng' }, { tone: 'any', caption: 'mọi tông' },
    { tone: 'youthful', caption: 'x'.repeat(701) }, { tone: 'youthful', caption: '   ' },
  ];
  const first = pickGolden('youthful', 0, pool);
  assert.equal(first.length, 3);
  assert.ok(first.every(item => item.caption !== 'trang trọng' && item.caption.length <= 700));
  assert.notDeepEqual(pickGolden('youthful', 1, pool), first);
  assert.deepEqual(pickGolden('formal', 0, pool).map(item => item.caption).sort(), ['mọi tông', 'trang trọng']);
  assert.equal(pickGolden('humorous', 0, []).length, 0);
  assert.equal(first[1].note, 'vì nhịp');
  assert.equal('note' in first[0], false);
  const none = JSON.parse(buildWriterMessages(input, brief, [], 0)[1].content);
  assert.equal('goldenExamples' in none, false);
  const withGolden = JSON.parse(buildWriterMessages(input, brief, [{ tone: 'any', caption: 'Mẫu của tôi' }], 0)[1].content);
  assert.deepEqual(withGolden.goldenExamples, [{ caption: 'Mẫu của tôi' }]);
  assert.match(writerSystem, /TUYỆT ĐỐI không chép câu chữ/);
});

const geminiEnv = { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'gem-key-test', GEMINI_MODEL: 'gemini-3.1-flash-lite', CAPTION_PIPELINE: 'smart' };
const routeStages = (calls: { url: string; stage: string; body: Record<string, unknown> }[]) => (async (url: string, options: RequestInit) => {
  const body = JSON.parse(String(options.body)), stage = stageOf(body);
  calls.push({ url: String(url), stage, body });
  return new Response(envelope(stage === 'write' ? poolFor() : judgeFrom(JSON.parse(body.messages[1].content), (_t, position) => 5 - position)));
}) as unknown as typeof fetch;

test('handler on Gemini sends a per-agent strict json_schema for the writer and the judge', async () => {
  const calls: { url: string; stage: string; body: Record<string, unknown> }[] = [];
  const response = await createGenerateHandler({ env: geminiEnv, fetchUpstream: routeStages(calls), log: () => {} })(request());
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => call.stage), ['write', 'judge']);
  assert.deepEqual(calls.map(call => (call.body.response_format as { json_schema: { name: string } }).json_schema.name), ['writer_pool', 'judge_scores']);
  assert.ok(calls.every(call => call.url.includes('generativelanguage.googleapis.com') && (call.body as { reasoning_effort?: string }).reasoning_effort === 'low'));
});

test('CAPTION_JUDGE_PROVIDER runs the judge on a different provider than the writer, with its own key and limits', async () => {
  const calls: { url: string; stage: string; body: Record<string, unknown> }[] = [], logs: unknown[] = [];
  const env2 = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'ds-key-test', DEEPSEEK_MODEL: 'deepseek-flash', GEMINI_API_KEY: 'gem-key-test', GEMINI_MODEL: 'gemini-3.1-flash-lite', CAPTION_PIPELINE: 'smart', CAPTION_JUDGE_PROVIDER: 'gemini' };
  const headers: string[] = [];
  const fetchUpstream = (async (url: string, options: RequestInit) => { headers.push(String((options.headers as Record<string, string>).Authorization)); return routeStages(calls)(url, options); }) as unknown as typeof fetch;
  const response = await createGenerateHandler({ env: env2, fetchUpstream, log: data => logs.push(data) })(request());
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => [call.stage, new URL(call.url).hostname]), [['write', 'api.deepseek.com'], ['judge', 'generativelanguage.googleapis.com']]);
  assert.deepEqual(headers, ['Bearer ds-key-test', 'Bearer gem-key-test']);
  assert.equal(calls[0].body.max_tokens, 4096);
  assert.equal(calls[1].body.max_tokens, undefined);
  const log = logs[0] as { pipeline: { judgeProvider: string } };
  assert.equal(log.pipeline.judgeProvider, 'gemini');
  assert.doesNotMatch(JSON.stringify(logs), /ds-key-test|gem-key-test/);
});

test('a judge provider equal to the writer, unknown, or without a valid key is ignored (judge stays on the writer provider)', async () => {
  for (const judge of ['gemini', 'banana', 'deepseek', '']) {
    const calls: { url: string; stage: string; body: Record<string, unknown> }[] = [], logs: unknown[] = [];
    const response = await createGenerateHandler({ env: { ...geminiEnv, CAPTION_JUDGE_PROVIDER: judge }, fetchUpstream: routeStages(calls), log: data => logs.push(data) })(request());
    assert.equal(response.status, 200);
    assert.ok(calls.every(call => call.url.includes('generativelanguage.googleapis.com')), judge);
    assert.equal((logs[0] as { pipeline: { judgeProvider?: string } }).pipeline.judgeProvider, undefined);
  }
});

test('upstream rejections are logged with the provider message for diagnosis, never exposed to the client, and never with the key', async () => {
  for (const [message, expected] of [['Invalid reasoning_effort for this model', /gemini: Invalid reasoning_effort/], ['bad key gem-key-test leaked', undefined]] as const) {
    const logs: unknown[] = [];
    const fetchUpstream = (async () => new Response(JSON.stringify({ error: { code: 400, message, status: 'INVALID_ARGUMENT' } }), { status: 400 })) as unknown as typeof fetch;
    const response = await createGenerateHandler({ env: { ...geminiEnv, CAPTION_PIPELINE: 'single' }, fetchUpstream, log: data => logs.push(data) })(request());
    assert.equal(response.status, 502);
    const body = JSON.stringify(await response.json());
    assert.doesNotMatch(body, /reasoning_effort|gem-key-test|INVALID_ARGUMENT/);
    const log = logs[0] as { upstreamStatus: number; upstreamError?: string };
    assert.equal(log.upstreamStatus, 400);
    if (expected) assert.match(log.upstreamError ?? '', expected); else assert.equal(log.upstreamError, undefined);
    assert.doesNotMatch(JSON.stringify(logs), /gem-key-test/);
  }
});
