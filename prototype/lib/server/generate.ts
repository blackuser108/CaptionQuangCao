import { cleanInput, generationTimeoutMs, normalize, validOutput, validate } from '../content.ts';
import { buildBrief } from '../engine/context.ts';
import { buildMessages } from '../engine/prompt.ts';
import { scoreOutput } from '../engine/quality.ts';
import { runPipeline, type StageName } from '../engine/pipeline.ts';
import { stageFormat } from '../engine/schemas.ts';
import { deepseekConfig } from './deepseek.ts';
import { openrouterConfig } from './openrouter.ts';
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

const geminiFormat = { type: 'json_schema', json_schema: { name: 'content_set', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['captions', 'headlines', 'hashtags'],
  properties: Object.fromEntries(['captions', 'headlines', 'hashtags'].map((name, i) => [name, { type: 'array', items: { type: 'string' }, minItems: [3, 3, 5][i], maxItems: [3, 3, 5][i] }])),
} } };
const autoModels = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

export function createGenerateHandler({ env = process.env, fetchUpstream = fetch, timeoutMs = generationTimeoutMs, log = console.info }: Options = {}) {
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
    const provider = env.AI_PROVIDER ?? 'freellmapi', gemini = provider === 'gemini', deepseek = provider === 'deepseek', openrouter = provider === 'openrouter';
    const ds = deepseek ? deepseekConfig(env) : undefined;
    const router = openrouter ? openrouterConfig(env) : undefined;
    const mode = env.CAPTION_PIPELINE ?? 'deep';
    if (!['single', 'smart', 'deep'].includes(mode)) return failure('AI_NOT_CONFIGURED');
    const key = openrouter ? router?.key : deepseek ? ds?.key : gemini ? env.GEMINI_API_KEY?.trim() : env.FREELLMAPI_API_KEY;
    let model = openrouter ? router?.model : deepseek ? ds?.model : gemini ? env.GEMINI_MODEL : env.FREELLMAPI_MODEL;
    if (!['gemini', 'freellmapi', 'deepseek', 'openrouter'].includes(provider) || !key || !/^[\x21-\x7e]{1,512}$/.test(key) ||
      (openrouter ? !router : deepseek ? !ds : gemini ? !['auto', 'gemini-3.8-flash', ...autoModels].includes(model || '') : env.FREELLMAPI_BASE_URL !== 'http://127.0.0.1:31415/v1' || model !== 'auto')) return failure('AI_NOT_CONFIGURED');
    if (inFlight) return failure('RATE_LIMITED');
    inFlight = true;
    const controller = new AbortController(), started = Date.now();
    const abort = () => controller.abort();
    request.signal.addEventListener('abort', abort, {once:true});
    if (request.signal.aborted) abort();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let calls = 0;
    let diagnostics: {score:number;issues:string[];calls:number} | undefined;
    let status = 503, upstreamStatus: number | undefined, actualModel: string | undefined, usage: Record<string, number> | undefined;
    try {
      controller.signal.throwIfAborted();
      if (gemini && model === 'auto') {
        const catalog = await fetchUpstream('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
          method: 'GET', redirect: 'error', cache: 'no-store', signal: controller.signal, headers: { 'x-goog-api-key': key },
        });
        upstreamStatus = catalog.status;
        if (!catalog.ok) {
          void catalog.body?.cancel().catch(() => {});
          status = catalog.status === 429 ? 429 : 502;
          return failure(status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
        }
        try {
          const data = JSON.parse(await readLimited(catalog, 256 * 1024, controller.signal));
          if (!data || !Array.isArray(data.models)) throw new Error('INVALID_CATALOG');
          model = autoModels.find(name => data.models.some((entry: { name?: unknown; supportedGenerationMethods?: unknown } | null) =>
            entry?.name === `models/${name}` && Array.isArray(entry.supportedGenerationMethods) && entry.supportedGenerationMethods.includes('generateContent')));
          if (!model) return failure('AI_NOT_CONFIGURED');
        } catch {
          status = controller.signal.aborted ? 504 : 502;
          return failure(controller.signal.aborted ? 'AI_TIMEOUT' : 'INVALID_AI_OUTPUT');
        }
      }
      const brief = buildBrief(input);
      const chat = async (messages: readonly {role: string; content: string}[], stage?: StageName) => {
        if (controller.signal.aborted) throw new Error('AI_TIMEOUT');
        if (++calls > (mode === 'single' ? 1 : mode === 'smart' ? 2 : 4)) throw new Error('INVALID_AI_OUTPUT');
        const upstream = await fetchUpstream(openrouter ? router!.url : deepseek ? ds!.url : gemini ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' : 'http://127.0.0.1:31415/v1/chat/completions', {
          method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, stream: false,
            response_format: stage ? stageFormat(stage, provider) : gemini ? geminiFormat : {type:'json_object'},
            ...((deepseek || openrouter) ? {max_tokens:stage === 'write' ? 4096 : 2048} : {}),
            ...(openrouter ? {reasoning:{enabled:false},provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0,request:0}}} : deepseek ? {thinking:{type:'disabled'}} : gemini ? {reasoning_effort:'low'} : {}), messages }),
        });
        upstreamStatus = upstream.status;
        if (!upstream.ok) {
          void upstream.body?.cancel().catch(() => {});
          throw new Error(upstream.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR');
        }
        try {
          const data = JSON.parse(await readLimited(upstream, 32 * 1024, controller.signal));
          if (typeof data.model === 'string' && /^[\w./:-]{1,120}$/.test(data.model) && !data.model.includes(key!)) actualModel = data.model;
          if (data.usage && typeof data.usage === 'object') {
            const totals = {...usage};
            for (const k of ['prompt_tokens','completion_tokens','total_tokens']) {
              const n = data.usage[k], sum = (totals[k] ?? 0) + n;
              if (Number.isSafeInteger(n) && n >= 0 && Number.isSafeInteger(sum)) totals[k] = sum;
            }
            usage = totals;
          }
          const choice = data.choices?.[0];
          if (!choice || (choice.finish_reason && choice.finish_reason !== 'stop') || typeof choice.message?.content !== 'string' || choice.message.content.includes(key!)) throw new Error('INVALID_CONTENT');
          return JSON.parse(choice.message.content);
        } catch { throw new Error(controller.signal.aborted ? 'AI_TIMEOUT' : 'INVALID_AI_OUTPUT'); }
      };
      let raw: unknown;
      try {
        if (mode === 'single') raw = await chat(buildMessages(input, brief));
        else raw = (await runPipeline({input,brief,mode:mode as 'smart'|'deep',chat})).output;
      } catch (error) {
        const code = controller.signal.aborted ? 'AI_TIMEOUT' : error instanceof Error && Object.hasOwn(errors,error.message) ? error.message as ErrorCode : 'AI_UNAVAILABLE';
        status = errors[code][0]; return failure(code);
      }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 3) { status=502; return failure('INVALID_AI_OUTPUT'); }
      const output = Object.fromEntries(Object.entries(raw).map(([name, values]) => [name, Array.isArray(values) ? values.map(value => typeof value === 'string' ? normalize(value) : value) : values]));
      if (!validOutput(output) || Object.values(output).flat().some(text => text.includes(key!))) { status=502; return failure('INVALID_AI_OUTPUT'); }
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
      log({ event: 'generate', status, upstreamStatus, durationMs: Date.now() - started, requestedModel: model, actualModel, usage, mode, calls, diagnostics });
    }
  };
}
