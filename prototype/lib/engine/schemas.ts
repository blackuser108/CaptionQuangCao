import type { StageName } from './pipeline.ts';

// Schema JSON strict cho từng agent. Gemini (endpoint OpenAI-compat của project) đã chạy được `json_schema` strict ở đường 1 lượt,
// nên các bước agent dùng cùng cơ chế đó thay vì `json_object`. Mọi trường đều bắt buộc, không khóa động; ràng buộc giá trị
// (thang 1–5, số phần tử…) do parser trong agents.ts kiểm lại vì không phải provider nào cũng thực thi min/max.
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

export function stageFormat(stage: StageName, providerId: string): { type: string; json_schema?: unknown } {
  if (providerId !== 'gemini' && providerId !== 'groq') return { type: 'json_object' };
  const [name, schema] = schemas[stage];
  return { type: 'json_schema', json_schema: { name, strict: true, schema } };
}
