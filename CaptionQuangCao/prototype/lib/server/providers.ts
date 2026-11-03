export type ChatMessage = { role: 'system' | 'user'; content: string };
export type ProviderId = 'deepseek' | 'gemini' | 'freellmapi';
export type CaptionGenerationProvider = {
  id: ProviderId;
  model: string;
  key: string;
  url: string;
  format: { type: string; json_schema?: unknown };
  extras: Record<string, unknown>;
};

const DEEPSEEK_MODELS = ['deepseek-flash', 'deepseek-v4-pro'] as const;
export const GEMINI_AUTO_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'] as const;
const GEMINI_MODELS = ['auto', 'gemini-3.8-flash', ...GEMINI_AUTO_MODELS] as const;

export const geminiFormat = { type: 'json_schema', json_schema: { name: 'content_set', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['captions', 'headlines', 'hashtags'],
  properties: Object.fromEntries(['captions', 'headlines', 'hashtags'].map((name, i) => [name, { type: 'array', items: { type: 'string' }, minItems: [3, 3, 5][i], maxItems: [3, 3, 5][i] }])),
} } };

function printableKey(value: string | undefined) {
  return !!value && /^[\x21-\x7e]{1,512}$/.test(value);
}

export function resolveProviders(env: Record<string, string | undefined>) {
  const id = (env.AI_PROVIDER ?? 'freellmapi') as ProviderId | string;
  if (id !== 'gemini' && id !== 'freellmapi' && id !== 'deepseek') return { error: 'AI_NOT_CONFIGURED' as const };
  const primary = providerConfig(id, env);
  if (!primary) return { error: 'AI_NOT_CONFIGURED' as const };
  const fallback = id === 'deepseek' ? providerConfig('gemini', env) : undefined;
  return { primary, fallback };
}

export function providerConfig(id: ProviderId, env: Record<string, string | undefined>): CaptionGenerationProvider | undefined {
  if (id === 'freellmapi') {
    const key = env.FREELLMAPI_API_KEY;
    if (!printableKey(key) || env.FREELLMAPI_BASE_URL !== 'http://127.0.0.1:31415/v1' || env.FREELLMAPI_MODEL !== 'auto') return;
    return { id, model: 'auto', key: key!, url: 'http://127.0.0.1:31415/v1/chat/completions', format: { type: 'json_object' }, extras: {} };
  }
  if (id === 'gemini') {
    const key = env.GEMINI_API_KEY?.trim();
    const model = env.GEMINI_MODEL;
    if (!printableKey(key) || !GEMINI_MODELS.includes(model as typeof GEMINI_MODELS[number])) return;
    return {
      id, model: model!, key: key!,
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      format: geminiFormat, extras: { reasoning_effort: 'low' },
    };
  }
  const key = env.DEEPSEEK_API_KEY?.trim();
  const model = env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash';
  if (!printableKey(key) || !DEEPSEEK_MODELS.includes(model as typeof DEEPSEEK_MODELS[number])) return;
  return {
    id, model, key: key!,
    url: 'https://api.deepseek.com/chat/completions',
    format: { type: 'json_object' },
    extras: { thinking: { type: 'disabled' }, reasoning_effort: 'none', max_tokens: 2048 },
  };
}

export function shouldRetry(id: ProviderId, status: number) {
  return id === 'deepseek' && (status === 429 || status >= 500);
}

export async function wait(ms: number, signal: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError')); };
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}
