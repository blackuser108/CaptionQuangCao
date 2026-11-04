// Server-only configuration. URL/model/key never come from a client request.
export function deepseekConfig(env: Record<string, string | undefined>) {
  const key = env.DEEPSEEK_API_KEY?.trim(), model = env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash';
  if (!key || !/^[\x21-\x7e]{1,512}$/.test(key) || model !== 'deepseek-flash') return;
  return { key, model, url: 'https://api.deepseek.com/chat/completions' };
}
