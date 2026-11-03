import { cleanInput, generationTimeoutMs, validOutput, validate } from '../content.ts';
import type { Input, Output } from '../content.ts';
import { buildBrief, buildMessages, parseGeneratedJson, parseMode, repairHints, runPipeline, scoreOutput, toOutput } from '../engine/index.ts';
import type { ChatJson, PipelineTrace, StageName } from '../engine/index.ts';
import { stageFormat } from '../engine/schemas.ts';
import { GEMINI_AUTO_MODELS, providerConfig, resolveProviders, shouldRetry, wait, type CaptionGenerationProvider, type ProviderId } from './providers.ts';

type Options = { env?: Record<string, string | undefined>; fetchUpstream?: typeof fetch; timeoutMs?: number; log?: (data: unknown) => void };
const errors = {
  INVALID_INPUT: [422, 'Thông tin chưa hợp lệ. Kiểm tra đủ bốn trường, tông giọng và độ dài rồi thử lại.'],
  RATE_LIMITED: [429, 'Dịch vụ đang giới hạn yêu cầu hoặc đang tạo một bộ khác. Hãy chờ rồi chủ động thử lại.'],
  INVALID_AI_OUTPUT: [502, 'AI trả nội dung sai cấu trúc hoặc vượt giới hạn xử lý. Bản nháp cũ được giữ; bạn có thể thử lại.'],
  UPSTREAM_ERROR: [502, 'Dịch vụ AI trả lỗi. Bản nháp cũ được giữ; hãy thử lại sau.'],
  AI_NOT_CONFIGURED: [503, 'Kết nối AI chưa được cấu hình đúng. Kiểm tra cấu hình phía máy chủ.'],
  AI_UNAVAILABLE: [503, 'Chưa kết nối được dịch vụ AI. Kiểm tra kết nối phía máy chủ rồi thử lại.'],
  AI_TIMEOUT: [504, 'AI chưa phản hồi trong 90 giây. Form và bản nháp cũ được giữ; bạn có thể chủ động thử lại.'],
} as const;
type ErrorCode = keyof typeof errors;
function failure(code: ErrorCode) {
  const [status, message] = errors[code];
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function readLimited(message: Request | Response, limit: number, signal: AbortSignal) {
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
      if (bytes > limit) throw new Error('BODY_TOO_LARGE');
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}

export function createGenerateHandler({ env = process.env, fetchUpstream = fetch, timeoutMs = generationTimeoutMs, log = console.info }: Options = {}) {
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
    const host = request.headers.get('host') ?? url.host, port = url.port ? `:${url.port}` : '';
    const localHosts = ['127.0.0.1', 'localhost', '0.0.0.0'];
    const allowedLocalHost = [`127.0.0.1${port}`, `localhost${port}`, `0.0.0.0${port}`].includes(host);
    const allowedLocalOrigin = !origin || origin === `${url.protocol}//${host}` ||
      (['http://127.0.0.1:3000', 'http://localhost:3000'].includes(origin) && [`127.0.0.1${port}`, `localhost${port}`].includes(host));
    const allowed = site ? url.origin === site.origin && host === site.host && origin === site.origin :
      localHosts.includes(url.hostname) && allowedLocalHost && allowedLocalOrigin;
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
    const resolved = resolveProviders(env);
    if ('error' in resolved || !resolved.primary) return failure('AI_NOT_CONFIGURED');
    if (inFlight) return failure('RATE_LIMITED');
    inFlight = true;
    const controller = new AbortController(), started = Date.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let status = 503, upstreamStatus: number | undefined, actualModel: string | undefined, usage: Record<string, number> | undefined, requestedModel = resolved.primary.model;
    const seed = Math.floor(Math.random() * 2 ** 31), brief = buildBrief(input, seed);
    const mode = parseMode(env.CAPTION_PIPELINE);
    let pipelineTrace: PipelineTrace | undefined, pipelineFallback = false, judgeProviderId: ProviderId | undefined;
    const failOf = (code: ErrorCode) => { status = errors[code][0]; return failure(code); };
    const ok = (output: Output) => {
      status = 200;
      return Response.json(output, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    };
    try {
      const resolvedModels = new Map<string, string>();
      const modelFor = async (provider: CaptionGenerationProvider): Promise<{ model: string } | { fail: ErrorCode }> => {
        if (!(provider.id === 'gemini' && provider.model === 'auto')) return { model: provider.model };
        const cached = resolvedModels.get(provider.id);
        if (cached) return { model: cached };
        const catalog = await fetchUpstream('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
          method: 'GET', redirect: 'error', cache: 'no-store', signal: controller.signal, headers: { 'x-goog-api-key': provider.key },
        });
        upstreamStatus = catalog.status;
        if (!catalog.ok) {
          void catalog.body?.cancel().catch(() => {});
          return { fail: catalog.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR' };
        }
        try {
          const data = JSON.parse(await readLimited(catalog, 256 * 1024, controller.signal));
          if (!data || !Array.isArray(data.models)) throw new Error('INVALID_CATALOG');
          const model = GEMINI_AUTO_MODELS.find(name => data.models.some((entry: { name?: unknown; supportedGenerationMethods?: unknown } | null) =>
            entry?.name === `models/${name}` && Array.isArray(entry.supportedGenerationMethods) && entry.supportedGenerationMethods.includes('generateContent'))) || '';
          if (!model) return { fail: 'AI_NOT_CONFIGURED' };
          resolvedModels.set(provider.id, model);
          return { model };
        } catch {
          return { fail: controller.signal.aborted ? 'AI_TIMEOUT' : 'INVALID_AI_OUTPUT' };
        }
      };

      const post = async (provider: CaptionGenerationProvider, body: Record<string, unknown>): Promise<{ upstream: Response } | { fail: ErrorCode }> => {
        const attempts = provider.id === 'deepseek' ? 3 : 1;
        let upstream: Response | undefined;
        for (let attempt = 0; attempt < attempts; attempt++) {
          try {
            upstream = await fetchUpstream(provider.url, {
              method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
              body: JSON.stringify(body),
            });
            upstreamStatus = upstream.status;
            if (upstream.ok || !shouldRetry(provider.id, upstream.status) || attempt === attempts - 1) break;
            void upstream.body?.cancel().catch(() => {});
            await wait(200 * 2 ** attempt, controller.signal);
          } catch {
            if (controller.signal.aborted) return { fail: 'AI_TIMEOUT' };
            if (provider.id !== 'deepseek' || attempt === attempts - 1) return { fail: 'AI_UNAVAILABLE' };
            await wait(200 * 2 ** attempt, controller.signal);
          }
        }
        if (!upstream) return { fail: controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE' };
        if (!upstream.ok) {
          void upstream.body?.cancel().catch(() => {});
          return { fail: upstream.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR' };
        }
        return { upstream };
      };

      // Đọc phong bì chat-completions, ghi model/usage (cộng dồn qua các lượt gọi), trả về content dạng chuỗi.
      const readContent = async (upstream: Response, provider: CaptionGenerationProvider, limit: number) => {
        const data = JSON.parse(await readLimited(upstream, limit, controller.signal));
        if (typeof data.model === 'string' && /^[\w./:-]{1,120}$/.test(data.model) && !data.model.includes(provider.key)) actualModel = data.model;
        if (data.usage && typeof data.usage === 'object') {
          const next: Record<string, number> = Object.fromEntries(['prompt_tokens', 'completion_tokens', 'total_tokens'].filter(k => Number.isSafeInteger(data.usage[k]) && data.usage[k] >= 0).map(k => [k, data.usage[k]]));
          usage = usage ? Object.fromEntries(Object.keys({ ...usage, ...next }).map(k => [k, (usage?.[k] ?? 0) + (next[k] ?? 0)])) : next;
        }
        const choice = data.choices?.[0];
        if (!choice || (choice.finish_reason && choice.finish_reason !== 'stop') || typeof choice.message?.content !== 'string') throw new Error('INVALID_CONTENT');
        return choice.message.content as string;
      };

      const run = async (provider: CaptionGenerationProvider, repair?: string[]): Promise<{ output: Output } | { fail: ErrorCode }> => {
        const resolvedModel = await modelFor(provider);
        if ('fail' in resolvedModel) return resolvedModel;
        const model = requestedModel = resolvedModel.model;
        const messages = buildMessages(input, brief, repair);
        const sent = await post(provider, { model, stream: false, response_format: provider.format, ...provider.extras, messages });
        if ('fail' in sent) return sent;
        try {
          const output = toOutput(parseGeneratedJson(await readContent(sent.upstream, provider, 32 * 1024)));
          if (!output || Object.values(output).flat().some(text => text.includes(provider.key))) throw new Error('INVALID_CONTENT');
          return { output };
        } catch {
          return { fail: controller.signal.aborted ? 'AI_TIMEOUT' : 'INVALID_AI_OUTPUT' };
        }
      };

      // Kênh gọi cho các agent của pipeline: cùng provider/khóa/retry, nhưng response_format json_object vì mỗi bước có schema riêng.
      // Writer cần nhiều token hơn (9 ứng viên); trần max_tokens chỉ áp khi provider vốn đã đặt trần (DeepSeek).
      // Judge có thể chạy trên nhà cung cấp KHÁC Writer (CAPTION_JUDGE_PROVIDER) để không chấm điểm cao cho văn của chính mình.
      // Chỉ nhận khi cấu hình hợp lệ và khác Writer; ngược lại Judge dùng cùng nhà cung cấp với Writer.
      const judgeId = env.CAPTION_JUDGE_PROVIDER?.trim() as ProviderId | undefined;
      const judgeProvider = judgeId && judgeId !== resolved.primary!.id && ['deepseek', 'gemini', 'freellmapi'].includes(judgeId) ? providerConfig(judgeId, env) : undefined;
      judgeProviderId = judgeProvider?.id;
      const chat: ChatJson = async (messages: readonly { role: string; content: string }[], stage: StageName) => {
        const provider = stage === 'judge' || stage === 'judge-reverse' ? judgeProvider ?? resolved.primary! : resolved.primary!;
        const resolvedModel = await modelFor(provider);
        if ('fail' in resolvedModel) throw new Error(resolvedModel.fail);
        requestedModel = resolvedModel.model;
        const extras = provider.extras.max_tokens ? { ...provider.extras, max_tokens: stage === 'write' ? 4096 : 2048 } : provider.extras;
        const sent = await post(provider, { model: resolvedModel.model, stream: false, response_format: stageFormat(stage, provider.id), ...extras, messages });
        if ('fail' in sent) throw new Error(sent.fail);
        const content = await readContent(sent.upstream, provider, 64 * 1024);
        if (content.includes(provider.key)) throw new Error('INVALID_CONTENT');
        return parseGeneratedJson(content);
      };
      // Bước muộn chỉ chạy khi còn đủ giờ; hết giờ thì trả kết quả tốt nhất đã có thay vì để cả lượt timeout.
      const canRun = (stage: StageName) => Date.now() - started < timeoutMs * (stage === 'polish' ? 0.7 : 0.55);

      const useFallback = async (reason: ErrorCode) => {
        if (!resolved.fallback || reason === 'AI_NOT_CONFIGURED' || controller.signal.aborted) return failOf(reason);
        const next = await run(resolved.fallback);
        if ('output' in next && validOutput(next.output)) return ok(next.output);
        return failOf('fail' in next ? next.fail : 'INVALID_AI_OUTPUT');
      };

      if (mode !== 'single') {
        const piped = await runPipeline({ input, brief, mode, chat, seed, canRun });
        pipelineTrace = piped.trace;
        if (piped.output && validOutput(piped.output)) return ok(piped.output);
        pipelineFallback = true;
        if (controller.signal.aborted) return failOf('AI_TIMEOUT');
      }

      const first = await run(resolved.primary);
      if ('fail' in first) {
        if (resolved.primary.id === 'deepseek') return useFallback(first.fail);
        return failOf(first.fail);
      }
      if (resolved.primary.id === 'deepseek') {
        const report = scoreOutput(first.output, input, brief);
        if (!report.pass) {
          const repaired = await run(resolved.primary, repairHints(report));
          if ('output' in repaired) return ok(repaired.output);
        }
      }
      return ok(first.output);
    } catch {
      status = controller.signal.aborted ? 504 : 503;
      return failure(controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');
    } finally {
      clearTimeout(timer); inFlight = false;
      log({ event: 'generate', status, upstreamStatus, durationMs: Date.now() - started, requestedModel, actualModel, usage, provider: resolved.primary.id, pipeline: mode === 'single' ? undefined : { ...pipelineTrace, judgeProvider: judgeProviderId, fallbackToSingle: pipelineFallback } });
    }
  };
}
