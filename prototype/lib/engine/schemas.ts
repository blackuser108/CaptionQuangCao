import type { StageName } from './pipeline.ts';

// Mọi trường đều bắt buộc. Parser của app kiểm số phần tử, thang điểm và các ràng buộc nội dung.
const str = { type: 'string' };
const strings = { type: 'array', items: str };
const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

const writer = object({
  plan: object({ moments: strings, images: strings }),
  slots: { type: 'array', items: object({
    strategy: str,
    candidates: { type: 'array', items: object({ text: str, hook: str, cta: str, angle: str, p: { type: 'number' } }) },
  }) },
  headlines: strings,
  hashtags: { type: 'array', items: object({ tag: str, role: str }) },
});

const score = { type: 'integer' };
const judge = object({
  slots: { type: 'array', items: object({
    candidates: { type: 'array', items: object({ id: str, stop: score, concrete: score, voice: score, natural: score, faithful: score, fix: str }) },
  }) },
});

const polish = object({ captions: strings });

const schemas = { write: ['writer_pool', writer], judge: ['judge_scores', judge], 'judge-reverse': ['judge_scores', judge], polish: ['polish_captions', polish] } as const;

const contentSet = object({ captions: strings, headlines: strings, hashtags: strings });

export function responseFormat(providerId: string, stage?: StageName): { type: string; json_schema?: unknown } {
  if (providerId !== 'cloudflare' && providerId !== 'groq') return { type: 'json_object' };
  const [name, schema] = stage ? schemas[stage] : ['content_set', contentSet];
  if (providerId === 'cloudflare') return { type: 'json_schema', json_schema: schema };
  return { type: 'json_schema', json_schema: { name, strict: true, schema } };
}
