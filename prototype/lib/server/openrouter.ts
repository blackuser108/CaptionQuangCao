// Server-only free router. Reject fixed/paid routes instead of silently spending credits.
export function openrouterConfig(env: Record<string, string | undefined>) {
  const key = env.OPENROUTER_API_KEY?.trim(), model = env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
  if (!key || !/^[\x21-\x7e]{1,512}$/.test(key) || model !== 'openrouter/free') return;
  return { key, model, url: 'https://openrouter.ai/api/v1/chat/completions' };
}
