// Server-only selection label; never send it as a gateway model or retry a failed step.
export function openrouterConfig(env: Record<string, string | undefined>) {
  const key = env.OPENROUTER_API_KEY?.trim(), model = env.OPENROUTER_MODEL?.trim() || 'auto-free';
  if (!key || !/^[\x21-\x7e]{1,512}$/.test(key) || model !== 'auto-free') return;
  return { key, model, models: ['nvidia/nemotron-3.5-super-vl:free', 'xingchen-agi/xing4.0-29b-a4b:free'] as const, url: 'https://openrouter.ai/api/v1/chat/completions' };
}
