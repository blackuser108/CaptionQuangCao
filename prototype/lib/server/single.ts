import { normalize, validOutput, type Input, type Output } from '../content.ts';
import { buildBrief, promptDescription } from '../engine/context.ts';
import { buildMessages, systemPrompt } from '../engine/prompt.ts';
import { InvalidAIOutput } from '../engine/output-error.ts';

// Selective port from vibecode/prototype/lib/server/generate.ts.
// Transport, provider schema/options, timeout and fallback stay in the main handler.
export const singlePrompt = systemPrompt;

type Message = { role: 'system' | 'user'; content: string };
type Chat = (messages: readonly Message[]) => Promise<unknown>;

export function normalizeGeneratedOutput(raw: unknown, containsKey: (text: string) => boolean): Output {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 3) {
    throw new InvalidAIOutput('FINAL_OUTPUT', 'final');
  }
  const output = Object.fromEntries(Object.entries(raw).map(([name, values]) => [name,
    Array.isArray(values) ? values.map(value => typeof value === 'string' ? normalize(value) : value) : values,
  ]));
  if (!validOutput(output) || Object.values(output).flat().some(text => containsKey(text))) {
    throw new InvalidAIOutput('FINAL_OUTPUT', 'final');
  }
  return output;
}

export async function runSingle(input: Input, chat: Chat, containsKey: (text: string) => boolean): Promise<Output> {
  // Preserve complete conditions; do not split facts or synthesize product benefits.
  const data = { productName: input.productName, description: promptDescription(input.description), audience: input.audience, tone: input.tone };
  const raw = await chat(buildMessages(data, buildBrief(data)));
  return normalizeGeneratedOutput(raw, containsKey);
}
