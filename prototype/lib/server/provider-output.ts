import { InvalidAIOutput } from '../engine/output-error.ts';

export type ProviderOutputMetadata = {
  actualModel?: string;
  finishReason?: string;
  usage?: Record<string, number>;
};

const finishReasons = ['stop', 'length', 'max_tokens', 'content_filter', 'tool_calls', 'function_call', 'eos_token'];
const usageKeys = ['prompt_tokens', 'completion_tokens', 'total_tokens'];

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function parseJson(text: string, reason: string): unknown {
  try { return JSON.parse(text); }
  catch { throw new InvalidAIOutput(reason); }
}

export function decodeProviderOutput(
  text: string, cloudflare: boolean, containsKey: (text: string, serialized?: boolean) => boolean, metadata: ProviderOutputMetadata,
): unknown {
  const envelope = record(parseJson(text, 'PROVIDER_JSON'));
  const data = cloudflare ? (envelope?.success === true ? record(envelope.result) : undefined) : envelope;
  if (!data) throw new InvalidAIOutput('PROVIDER_ENVELOPE');

  if (typeof data.model === 'string' && /^@?[\w./:-]{1,120}$/.test(data.model) && !containsKey(data.model)) {
    metadata.actualModel = data.model;
  }
  const reportedUsage = record(data.usage);
  if (reportedUsage) {
    const counters: Record<string, number> = {};
    for (const key of usageKeys) {
      const n = reportedUsage[key];
      if (typeof n === 'number' && Number.isSafeInteger(n) && n >= 0) counters[key] = n;
    }
    if (Object.keys(counters).length) metadata.usage = counters;
  }

  const choice = Array.isArray(data.choices) ? record(data.choices[0]) : undefined;
  const message = record(choice?.message);
  const finish = choice?.finish_reason ?? (cloudflare ? data.finish_reason : undefined);
  if (finish != null) metadata.finishReason = typeof finish === 'string' && finishReasons.includes(finish) ? finish : 'other';
  if (finish === 'length' || finish === 'max_tokens') throw new InvalidAIOutput('OUTPUT_TRUNCATED');
  if (finish === 'content_filter' || message?.refusal) throw new InvalidAIOutput('OUTPUT_REFUSED');
  if (finish && finish !== 'stop' && !(cloudflare && finish === 'eos_token')) throw new InvalidAIOutput('OUTPUT_FINISH');

  const native = cloudflare && data.choices === undefined;
  const content = native ? data.response : message?.content;
  if (typeof content !== 'string' && !(native && record(content))) throw new InvalidAIOutput('PROVIDER_ENVELOPE');
  const value = typeof content === 'string' ? parseJson(content, 'OUTPUT_JSON') : content;
  if (containsKey(JSON.stringify(value), true)) throw new InvalidAIOutput('OUTPUT_SENSITIVE');
  return value;
}
