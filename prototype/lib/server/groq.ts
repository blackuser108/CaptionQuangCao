const groqModel = 'openai/gpt-oss-120b';
const cloudflareModel = '@cf/qwen/qwen3-30b-a3b-fp8';
const bearerToken = /^[\x21-\x7e]{1,512}$/;

// These values come from server environment variables only.
export function groqConfig(env: Record<string, string | undefined>) {
  const key = env.GROQ_API_KEY?.trim();
  const token = env.CLOUDFLARE_API_TOKEN?.trim();
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!key || !bearerToken.test(key) || !token || !bearerToken.test(token)) return;
  if (!account || !/^[a-f0-9]{32}$/i.test(account)) return;
  if ((env.GROQ_MODEL?.trim() ?? groqModel) !== groqModel) return;
  if ((env.CLOUDFLARE_AI_MODEL?.trim() ?? cloudflareModel) !== cloudflareModel) return;

  return {
    key,
    model: groqModel,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    fallback: {
      key: token,
      model: cloudflareModel,
      url: `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${cloudflareModel}`,
    },
  };
}
