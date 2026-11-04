// Server-only fixed destinations. Never accept provider, URL, model or key from the client.
export function geminiConfig(env: Record<string, string | undefined>) {
  const key = env.GEMINI_API_KEY?.trim(), model = env.GEMINI_MODEL?.trim();
  if (!key || !/^[\x21-\x7e]{1,512}$/.test(key) || !['gemini-3.5-flash', 'gemini-3.8-flash'].includes(model ?? '')) return;
  const fallbackId = env.GEMINI_FALLBACK ?? 'none';
  if (!['none', 'groq'].includes(fallbackId)) return;
  const groqKey = env.GROQ_API_KEY?.trim();
  if (fallbackId === 'groq' && (model !== 'gemini-3.5-flash' || env.GROQ_MODEL !== 'openai/gpt-oss-120b' || !groqKey || !/^[\x21-\x7e]{1,512}$/.test(groqKey))) return;
  return { key, model: model!, url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    fallback: fallbackId === 'groq' ? { key: groqKey!, model: 'openai/gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions' } : undefined };
}
