import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrief } from '../lib/engine/context.ts';
import { buildWriterMessages } from '../lib/engine/agents.ts';
import { responseFormat } from '../lib/engine/schemas.ts';
import { sampleInput } from '../lib/samples.ts';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { getSample } from '../lib/samples.ts';
import { claimUnsupported } from '../lib/engine/quality.ts';

test('V3 Writer preserves the supplied planning, layout, emoji and probability contract', () => {
  const brief = buildBrief(sampleInput);
  const messages = buildWriterMessages(sampleInput, brief);
  const data = JSON.parse(messages[1].content);
  assert.equal(data.candidatesPerStrategy, 3);
  assert.ok(data.emojiKit);
  assert.ok(data.strategies.every((strategy: any) => strategy.layout && typeof strategy.scene === 'string'));
  const format = responseFormat('groq', 'write') as any;
  const properties = format.json_schema.schema.properties;
  assert.ok(properties.plan.properties.moments);
  assert.ok(properties.slots.items.properties.strategy);
  assert.ok(properties.slots.items.properties.candidates.items.properties.p);
});

test('A5 and a finite page count do not authorize pocket, weight or loss-prevention claims', () => {
  const input = { productName: 'Sổ tay Mây', description: 'Sổ tay A5, 80 trang kẻ ngang, bìa xanh.', audience: 'Sinh viên', tone: 'humorous' };
  for (const text of ['Vừa trong túi áo.', 'Sổ gọn nhẹ.', 'Nhẹ như lông mây.', 'Không lo rơi giấy.', 'Không còn vụ rơi giấy nữa.', 'Không lo hết trang.', 'Không bỏ lỡ bất kỳ bài học nào.']) {
    assert.ok(claimUnsupported(text, input).length, text);
  }
  assert.equal(claimUnsupported('Sổ A5, 80 trang kẻ ngang. Bạn chọn ghi môn nào trước?', input).length, 0);
  assert.equal(claimUnsupported('Sổ gọn nhẹ.', { ...input, description: input.description + ' Sổ gọn nhẹ.' }).length, 0);
});

test('Smart rejects candidates the Judge marks unfaithful without an extra inference', async () => {
  const sample = getSample(0);
  let calls = 0;
  const handler = createGenerateHandler({
    env: { AI_PROVIDER: 'groq', CAPTION_PIPELINE: 'smart', GROQ_API_KEY: 'mock-key', CLOUDFLARE_API_TOKEN: 'mock-fallback', CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef' },
    log() {},
    fetchUpstream: async (_url, options) => {
      calls++;
      const payload = JSON.parse(JSON.parse(String(options?.body)).messages[1].content);
      const value = calls === 1 ? {
        slots: sample.captions.map(text => ({ candidates: [{ text }, { text: text + ' Xem thêm.' }] })),
        headlines: sample.headlines, hashtags: sample.hashtags.map(tag => ({ tag })),
      } : { slots: payload.slots.map((slot: any) => ({ candidates: slot.candidates.map((row: any) => ({
        id: row.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 1, fix: 'Có chi tiết không được xác nhận.',
      })) })) };
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });
    },
  });
  const response = await handler(new Request('http://127.0.0.1:3000/api/generate', {
    method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify(sampleInput),
  }));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'AI_UNGROUNDED_OUTPUT');
  assert.equal(calls, 2);
});

test('Smart completes Writer and Judge with at most one Groq to Cloudflare switch', async () => {
  const sample = getSample(0);
  for (const scenario of [{ failedAt: 0, status: 200 }, { failedAt: 1, status: 429 }, { failedAt: 2, status: 429 }, { failedAt: 1, status: 413 }, { failedAt: 0, status: 200, judgeProvider: 'cloudflare' }]) {
    const { failedAt, status } = scenario;
    const providers: string[] = [];
    const handler = createGenerateHandler({
      env: { AI_PROVIDER: 'groq', CAPTION_PIPELINE: 'smart', CAPTION_JUDGE_PROVIDER: scenario.judgeProvider, GROQ_API_KEY: 'mock-key', CLOUDFLARE_API_TOKEN: 'mock-fallback', CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef' },
      log() {},
      fetchUpstream: async (url, options) => {
        const cloudflare = String(url).startsWith('https://api.cloudflare.com/');
        providers.push(cloudflare ? 'cloudflare' : 'groq');
        if (providers.length === failedAt) return new Response('', { status });
        const payload = JSON.parse(JSON.parse(String(options?.body)).messages[1].content);
        const value = payload.slots ? {
          slots: payload.slots.map((slot: any) => ({ candidates: slot.candidates.map((row: any) => ({
            id: row.id, stop: 5, concrete: 5, voice: 5, natural: 5, faithful: 5, fix: '',
          })) })),
        } : {
          slots: sample.captions.map(text => ({ candidates: [{ text }, { text: text + ' Xem thêm.' }] })),
          headlines: sample.headlines, hashtags: sample.hashtags.map(tag => ({ tag })),
        };
        return Response.json(cloudflare ? { success: true, result: { response: JSON.stringify(value) } } : {
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }],
        });
      },
    });
    const response = await handler(new Request('http://127.0.0.1:3000/api/generate', {
      method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: JSON.stringify(sampleInput),
    }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).captions.length, 3);
    assert.deepEqual(providers, failedAt === 0 ? ['groq', scenario.judgeProvider ?? 'groq'] : failedAt === 1 ? ['groq', 'cloudflare', 'cloudflare'] : ['groq', 'groq', 'cloudflare']);
  }
});
