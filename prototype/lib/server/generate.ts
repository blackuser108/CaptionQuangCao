import { cleanInput, generationTimeoutMs, normalize, validOutput, validate } from '../content.ts';
import { buildBrief } from '../engine/context.ts';
import { buildMessages } from '../engine/prompt.ts';
import { scoreOutput } from '../engine/quality.ts';
import { runPipeline, type StageName } from '../engine/pipeline.ts';
import { InvalidAIOutput } from '../engine/output-error.ts';
import { responseFormat } from '../engine/schemas.ts';
import { deepseekConfig } from './deepseek.ts';
import { groqConfig } from './groq.ts';
import { decodeProviderOutput, type ProviderOutputMetadata } from './provider-output.ts';
import type { Input } from '../content.ts';

type Options = { env?: Record<string, string | undefined>; fetchUpstream?: typeof fetch; timeoutMs?: number; log?: (data: unknown) => void };
const errors = {
  INVALID_INPUT: [422, 'Thông tin chưa hợp lệ. Kiểm tra đủ bốn trường, tông giọng và độ dài rồi thử lại.'],
  RATE_LIMITED: [429, 'Dịch vụ đang giới hạn yêu cầu hoặc đang tạo một bộ khác. Hãy chờ rồi chủ động thử lại.'],
  INVALID_AI_OUTPUT: [502, 'AI trả nội dung sai cấu trúc hoặc vượt giới hạn xử lý. Bản nháp cũ được giữ; bạn có thể thử lại.'],
  UPSTREAM_ERROR: [502, 'Dịch vụ AI trả lỗi. Bản nháp cũ được giữ; hãy thử lại sau.'],
  AI_NOT_CONFIGURED: [503, 'Kết nối AI chưa được cấu hình đúng. Kiểm tra cấu hình phía máy chủ.'],
  AI_UNAVAILABLE: [503, 'Chưa kết nối được dịch vụ AI. Kiểm tra kết nối phía máy chủ rồi thử lại.'],
  AI_TIMEOUT: [504, 'AI chưa phản hồi trong 90 giây. Form và bản nháp cũ được giữ; bạn có thể chủ động thử lại.'],
  AI_REQUEST_LIMIT: [502, 'Đã đạt giới hạn yêu cầu AI cho lần tạo này. Chưa có bộ nội dung hoàn chỉnh; form và bản nháp cũ được giữ.'],
} as const;
type ErrorCode = keyof typeof errors;
function failure(code: ErrorCode) {
  const [status, message] = errors[code];
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function readLimited(message: Request | Response, limit: number, signal: AbortSignal, onBytes?: (bytes: number) => void) {
  const reader = message.body?.getReader();
  if (!reader) throw new Error('EMPTY_BODY');
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    if (Number(message.headers.get('content-length')) > limit) throw new Error('BODY_TOO_LARGE');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0, text = '';
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      onBytes?.(bytes);
      if (bytes > limit) throw new Error('BODY_TOO_LARGE');
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}

// Reserve the replacement attempt, all remaining judges, and possible polish.
const deepFallbackCalls = { write: 4, judge: 3, 'judge-reverse': 2, polish: 1, single: 1 };

function groqQuota(headers: Headers) {
  const quota: Record<string, number | string> = {};
  for (const name of ['x-ratelimit-limit-requests', 'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-requests', 'x-ratelimit-remaining-tokens']) {
    const value = headers.get(name);
    if (value && /^\d{1,12}$/.test(value)) quota[name] = Number(value);
  }
  for (const name of ['x-ratelimit-reset-requests', 'x-ratelimit-reset-tokens']) {
    const value = headers.get(name);
    if (value && value.length <= 24 && /^(?:\d+(?:\.\d+)?(?:ms|s|m|h))+$/u.test(value)) quota[name] = value;
  }
  return Object.keys(quota).length ? quota : undefined;
}

export function createGenerateHandler({ env = process.env, fetchUpstream = fetch, timeoutMs = generationTimeoutMs, log = data => console.info(JSON.stringify(data)) }: Options = {}) {
  // shortcut: guard chỉ dùng cho một process local; cần cơ chế dùng chung trước khi triển khai nhiều instance.
  let inFlight = false;
  return async function generate(request: Request) {
    const url = new URL(request.url), origin = request.headers.get('origin');
    const cloud = ['preview', 'production'].includes(env.VERCEL_ENV || '');
    const configured = env.APP_ORIGIN ?? (cloud && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined);
    let site: URL | undefined;
    try {
      if (configured) {
        site = new URL(configured);
        if (site.protocol !== 'https:' || configured !== site.origin) return failure('AI_NOT_CONFIGURED');
      } else if (cloud) return failure('AI_NOT_CONFIGURED');
    } catch { return failure('AI_NOT_CONFIGURED'); }
    // Next có thể dùng localhost nội bộ; chỉ tin Host sau khi đối chiếu loopback và cổng đang chạy.
    const host = request.headers.get('host') ?? url.host, port = url.port ? `:${url.port}` : '';
    const allowed = site ? url.origin === site.origin && host === site.host && origin === site.origin :
      ['127.0.0.1', 'localhost'].includes(url.hostname) && [`127.0.0.1${port}`, `localhost${port}`].includes(host) && (!origin || origin === `${url.protocol}//${host}`);
    if (!allowed ||
      request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('INVALID_INPUT');
    let input: Input;
    try {
      const data: unknown = JSON.parse(await readLimited(request, 16 * 1024, AbortSignal.timeout(5000)));
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 4 ||
        !['productName', 'description', 'audience', 'tone'].every(key => Object.hasOwn(data, key) && typeof (data as Record<string, unknown>)[key] === 'string')) return failure('INVALID_INPUT');
      input = cleanInput(data as Input);
      if (Object.keys(validate(input)).length) return failure('INVALID_INPUT');
    } catch { return failure('INVALID_INPUT'); }
    const provider = env.AI_PROVIDER ?? 'freellmapi';
    const deepseek = provider === 'deepseek' ? deepseekConfig(env) : undefined;
    const direct = provider === 'groq' ? groqConfig(env) : undefined;
    const localKey = env.FREELLMAPI_API_KEY;
    const local = provider === 'freellmapi' && localKey && /^[\x21-\x7e]{1,512}$/.test(localKey) &&
      env.FREELLMAPI_BASE_URL === 'http://127.0.0.1:31415/v1' && env.FREELLMAPI_MODEL === 'auto'
      ? { key: localKey, model: 'auto', url: 'http://127.0.0.1:31415/v1/chat/completions' }
      : undefined;
    const primary = direct ?? deepseek ?? local;
    const mode = env.CAPTION_PIPELINE ?? (direct ? 'single' : 'deep');
    if (!primary || !['single', 'smart', 'deep'].includes(mode)) return failure('AI_NOT_CONFIGURED');
    if (inFlight) return failure('RATE_LIMITED');
    inFlight = true;
    const controller = new AbortController(), started = Date.now();
    const abort = () => controller.abort();
    request.signal.addEventListener('abort', abort, {once:true});
    if (request.signal.aborted) abort();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let calls = 0;
    // Single generates the complete set once, with at most one availability fallback for Groq.
    const maxCalls = mode === 'single' ? (direct ? 2 : 1) : mode === 'smart' ? 2 : 4;
    const attempts: (ProviderOutputMetadata & {
      stage: StageName | 'single'; provider: string; requestedModel: string; upstreamStatus?: number;
      retryAfterSeconds?: number; quota?: ReturnType<typeof groqQuota>; durationMs: number; responseBytes?: number;
    })[] = [];
    let outputError: { reason: string; stage?: InvalidAIOutput['stage'] } | undefined;
    let fallbackBudget: { stage: StageName | 'single'; remaining: number; required: number } | undefined;
    let diagnostics: {score:number;issues:string[];calls:number} | undefined;
    let status = 503, upstreamStatus: number | undefined, actualModel: string | undefined, usage: Record<string, number> | undefined;
    try {
      controller.signal.throwIfAborted();
      const brief = buildBrief(input);
      let activeProvider = provider;
      let activeTarget = primary;
      const keys = direct ? [primary.key, direct.fallback.key] : [primary.key];
      const serializedKeys = keys.map(key => JSON.stringify(key).slice(1, -1));
      const containsKey = (text: string, serialized = false) => (serialized ? serializedKeys : keys).some(key => text.includes(key));
      const chat = async (messages: readonly {role: string; content: string}[], stage?: StageName, judgeIds?: readonly (readonly string[])[]): Promise<unknown> => {
        controller.signal.throwIfAborted();
        // Count dispatched attempts, including HTTP failures. Never dispatch a fifth inference.
        if (calls >= maxCalls) throw new Error('AI_REQUEST_LIMIT');
        const cloudflare = activeProvider === 'cloudflare';
        const target = activeTarget;
        const requestedModel = target.model;
        const attempt: typeof attempts[number] = {stage: stage ?? 'single', provider: activeProvider, requestedModel, durationMs: 0};
        attempts.push(attempt); calls++;
        const attemptStarted = Date.now();
        try {
          const upstream = await fetchUpstream(target.url, {
            method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.key}` },
            body: JSON.stringify({
              ...(!cloudflare ? { model: requestedModel } : {}),
              stream: false,
              response_format: responseFormat(activeProvider, stage, judgeIds),
              ...(!local ? { max_tokens: stage === 'write' ? 4096 : 2048 } : {}),
              ...(activeProvider === 'groq' ? { reasoning_effort: 'low', include_reasoning: false } : {}),
              ...(activeProvider === 'groq' && mode === 'single' ? { temperature: 0.2 } : {}),
              ...(deepseek ? { thinking: { type: 'disabled' } } : {}),
              messages,
            }),
          });
          upstreamStatus = upstream.status;
          attempt.upstreamStatus = upstream.status;
          if (activeProvider === 'groq') attempt.quota = groqQuota(upstream.headers);
          const retryAfter = upstream.headers.get('retry-after');
          if (retryAfter && /^\d{1,5}$/.test(retryAfter) && Number(retryAfter) <= 86400) attempt.retryAfterSeconds = Number(retryAfter);
          if (!upstream.ok) {
            void upstream.body?.cancel().catch(() => {});
            // Only known availability HTTP statuses may change provider. Never network/timeout/abort/JSON errors.
            if (activeProvider === 'groq' && direct && [429, 500, 502, 503].includes(upstream.status)) {
              controller.signal.throwIfAborted();
              const required = mode === 'deep' ? deepFallbackCalls[stage ?? 'single'] : mode === 'smart' && stage === 'write' ? 2 : 1;
              const remaining = maxCalls - calls;
              if (remaining < required) {
                fallbackBudget = { stage: attempt.stage, remaining, required };
                throw new Error(upstream.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
              }
              activeProvider = 'cloudflare';
              activeTarget = direct.fallback;
              return chat(messages, stage, judgeIds);
            }
            throw new Error(upstream.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
          }
          let body: string;
          try {
            body = await readLimited(upstream, 32 * 1024, controller.signal, bytes => { attempt.responseBytes = bytes; });
          } catch (error) {
            if (controller.signal.aborted) throw error;
            throw new InvalidAIOutput(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'PROVIDER_BODY_LIMIT' : 'PROVIDER_BODY_READ', attempt.stage);
          }
          try { return decodeProviderOutput(body, cloudflare, containsKey, attempt); }
          catch (error) {
            if (error instanceof InvalidAIOutput) throw new InvalidAIOutput(error.reason, attempt.stage);
            throw error;
          }
        } finally {
          attempt.durationMs = Date.now() - attemptStarted;
          if (attempt.actualModel) actualModel = attempt.actualModel;
          if (attempt.usage) {
            const totals = { ...usage };
            for (const [key, amount] of Object.entries(attempt.usage)) {
              const sum = (totals[key] ?? 0) + amount;
              if (Number.isSafeInteger(sum)) totals[key] = sum;
            }
            usage = totals;
          }
        }
      };
      let raw: unknown;
      try {
        if (mode === 'single') raw = await chat(buildMessages(input, brief));
        else raw = (await runPipeline({input,brief,mode:mode as 'smart'|'deep',chat,sequentialJudges:!!direct})).output;
      } catch (error) {
        if (error instanceof InvalidAIOutput) outputError = { reason: error.reason, stage: error.stage };
        const code = controller.signal.aborted ? 'AI_TIMEOUT' : error instanceof Error && Object.hasOwn(errors,error.message) ? error.message as ErrorCode : 'AI_UNAVAILABLE';
        status = errors[code][0]; return failure(code);
      }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 3) {
        outputError = { reason: 'FINAL_OUTPUT', stage: 'final' };
        status = 502; return failure('INVALID_AI_OUTPUT');
      }
      const output = Object.fromEntries(Object.entries(raw).map(([name, values]) => [name, Array.isArray(values) ? values.map(value => typeof value === 'string' ? normalize(value) : value) : values]));
      if (!validOutput(output) || Object.values(output).flat().some(text => containsKey(text))) {
        outputError = { reason: 'FINAL_OUTPUT', stage: 'final' };
        status = 502; return failure('INVALID_AI_OUTPUT');
      }
      const report = scoreOutput(output,input,brief);
      // Heuristic diagnostics are not a factuality guarantee; never log text or details.
      diagnostics = {score:report.score,issues:report.issues.map(issue=>issue.code),calls};
      status = 200;
      return Response.json(output, {headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    } catch {
      status = controller.signal.aborted ? 504 : 503;
      return failure(controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort',abort); controller.abort(); inFlight = false;
      log({ event: 'generate', status, upstreamStatus, durationMs: Date.now() - started, requestedModel: primary.model, actualModel, usage, mode, calls, attempts, outputError, fallbackBudget, ...(!direct ? {diagnostics} : {}) });
    }
  };
}
