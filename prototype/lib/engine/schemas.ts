import type { StageName } from './pipeline.ts';

// Mọi trường đều bắt buộc. Parser của app kiểm số phần tử, thang điểm và các ràng buộc nội dung.
const str = { type: 'string' };
const strings = { type: 'array', items: str };
const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

const writer = object({
  slots: { type: 'array', items: object({
    candidates: { type: 'array', items: object({ text: str }) },
  }) },
  headlines: strings,
  hashtags: { type: 'array', items: object({ tag: str, role: str }) },
});

const score = { type: 'integer', enum: [1, 2, 3, 4, 5] };

function judgeSchema(groups: readonly (readonly string[])[]) {
  const distinct = [...new Map(groups.map(ids => [ids.join(','), ids])).values()];
  const variants = distinct.map(ids => object({
    candidates: {
      type: 'array',
      description: `Exactly ${ids.length} rows, one for each ID: ${ids.join(', ')}.`,
      items: object({
        id: { type: 'string', enum: ids }, stop: score, concrete: score, voice: score,
        natural: score, faithful: score, fix: { type: 'string', description: 'At most 160 characters.' },
      }),
    },
  }));
  return object({ slots: {
    type: 'array',
    description: `One slot per group in order: ${groups.map(ids => ids.join(', ')).join(' / ')}.`,
    items: variants.length === 1 ? variants[0] : { anyOf: variants },
  } });
}

const polish = object({ captions: strings });

const contentSet = object({ captions: strings, headlines: strings, hashtags: strings });

export function responseFormat(providerId: string, stage?: StageName, judgeIds?: readonly (readonly string[])[]): { type: string; json_schema?: unknown } {
  // Qwen's Workers AI model schema accepts json_object. Exact judge rules run in the app.
  if (providerId !== 'groq') return { type: 'json_object' };
  const [name, schema] = judgeIds ? ['judge_scores', judgeSchema(judgeIds)] :
    stage === 'write' ? ['writer_pool', writer] : stage === 'polish' ? ['polish_captions', polish] : ['content_set', contentSet];
  return { type: 'json_schema', json_schema: { name, strict: true, schema } };
}
