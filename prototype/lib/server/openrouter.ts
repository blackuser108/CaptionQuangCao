// Server-only fixed free model. Reject alternate models instead of silently spending credits.
export function openrouterConfig(env: Record<string, string | undefined>) {
  const key = env.OPENROUTER_API_KEY?.trim(), model = env.OPENROUTER_MODEL?.trim() || 'google/gemma-4-31b-it:free';
  if (!key || !/^[\x21-\x7e]{1,512}$/.test(key) || model !== 'google/gemma-4-31b-it:free') return;
  return { key, model, url: 'https://openrouter.ai/api/v1/chat/completions' };
}
