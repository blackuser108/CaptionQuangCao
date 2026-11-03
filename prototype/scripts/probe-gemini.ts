// Chẩn đoán lỗi 502 UPSTREAM_ERROR với Gemini:   npm run probe            (dùng GEMINI_MODEL trong .env.local)
//                                                npm run probe -- gemini-3.5-flash-lite   (thử model khác)
// Gọi thẳng Gemini bằng khóa của bạn qua 6 thử nghiệm tăng dần và in mã HTTP + thông điệp lỗi của Google. Không in khóa.
// Mỗi lần chạy tốn 6 request nhỏ.
import { loadEnv } from './load-env.ts';
import { geminiFormat } from '../lib/server/providers.ts';
import { stageFormat } from '../lib/engine/schemas.ts';

loadEnv();
const base = (process.env.PROBE_BASE_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
const key = process.env.GEMINI_API_KEY?.trim();
const model = (process.argv[2] ?? process.env.GEMINI_MODEL ?? '').trim();
if (!key) { console.log('✘ Không thấy GEMINI_API_KEY (đặt trong prototype/.env.local).'); process.exit(1); }
if (!model || model === 'auto') { console.log('✘ Hãy đặt GEMINI_MODEL cụ thể (ví dụ gemini-3.8-flash) hoặc chạy: npm run probe -- gemini-3.8-flash'); process.exit(1); }
console.log(`Model thử: ${model}\n`);

type Result = { ok: boolean; status: number; note: string };
const message = (body: string) => { try { const data = JSON.parse(body); return String(data?.error?.message ?? data?.[0]?.error?.message ?? body).replace(/\s+/g, ' ').slice(0, 260); } catch { return body.replace(/\s+/g, ' ').slice(0, 260); } };
const safe = (text: string) => text.split(key).join('[khóa]');

async function call(url: string, init: RequestInit): Promise<Result> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(45000), redirect: 'error' });
    const body = await response.text();
    return { ok: response.ok, status: response.status, note: response.ok ? 'ok' : safe(message(body)) };
  } catch (error) { return { ok: false, status: 0, note: `không kết nối được: ${(error as Error).message}` }; }
}
const chat = (extra: Record<string, unknown>, prompt = 'Trả lời đúng một chữ: ok') => call(`${base}/v1beta/openai/chat/completions`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model, stream: false, messages: [{ role: 'user', content: prompt }], ...extra }),
});

const tests: [string, () => Promise<Result>][] = [
  ['A. Khóa hợp lệ và model tồn tại', () => call(`${base}/v1beta/models/${encodeURIComponent(model)}`, { headers: { 'x-goog-api-key': key } })],
  ['B. Gọi chat tối thiểu', () => chat({})],
  ['C. Thêm reasoning_effort: low (project luôn gửi)', () => chat({ reasoning_effort: 'low' })],
  ['D. Thêm json_schema 3/3/5 của đường 1 lượt', () => chat({ response_format: geminiFormat }, 'Viết 3 caption, 3 headline, 5 hashtag cho một cuốn sổ tay A5. Trả về JSON đúng schema.')],
  ['E. Đúng như đường 1 lượt (reasoning_effort + json_schema)', () => chat({ reasoning_effort: 'low', response_format: geminiFormat }, 'Viết 3 caption, 3 headline, 5 hashtag cho một cuốn sổ tay A5. Trả về JSON đúng schema.')],
  ['F. Schema của agent Writer (pipeline)', () => chat({ reasoning_effort: 'low', response_format: stageFormat('write', 'gemini') }, 'Trả về JSON đúng schema với nội dung mẫu rất ngắn: 3 slots, mỗi slots 1 candidates, 6 headlines, 8 hashtags.')],
];

const results: Result[] = [];
for (const [label, run] of tests) {
  const result = await run();
  results.push(result);
  console.log(`${result.ok ? '✔' : '✘'} ${label}\n    ${result.ok ? 'HTTP 200' : `HTTP ${result.status}: ${result.note}`}`);
}

const [A, B, C, D, E, F] = results;
console.log('\n— Kết luận —');
const authHint = /api key|permission|unauthenticated|PERMISSION_DENIED|credential/i;
if (!A.ok) {
  if (A.status === 404) console.log(`Model "${model}" không tồn tại hoặc khóa của bạn không có quyền dùng. Thử: npm run probe -- gemini-3.5-flash-lite`);
  else if (A.status === 400 || A.status === 401 || A.status === 403 || authHint.test(A.note)) console.log('Khóa API bị từ chối (sai khóa, khóa bị vô hiệu, chưa bật API, hoặc model cần bật thanh toán). Tạo khóa mới ở https://aistudio.google.com/apikey và kiểm tra quyền dùng model này.');
  else if (A.status === 429) console.log('Hết quota/ giới hạn tốc độ. Chờ vài phút hoặc kiểm tra quota trong AI Studio.');
  else if (A.status === 0) console.log('Không kết nối được tới Google (mạng, proxy, tường lửa). Kiểm tra internet/VPN.');
  else console.log('Google lỗi tạm thời hoặc lỗi lạ. Chạy lại sau ít phút.');
} else if (!B.ok) console.log('Khóa đúng, model có, nhưng endpoint tương thích OpenAI từ chối request tối thiểu. Xem thông điệp ở mục B.');
else if (!C.ok) console.log('Model từ chối reasoning_effort. Project luôn gửi tham số này: cần bỏ hoặc đổi nó cho model này. Gửi mình nguyên khối kết quả này.');
else if (!D.ok || !E.ok) console.log('Model từ chối json_schema 3/3/5 (hoặc tổ hợp với reasoning_effort). Gửi mình nguyên khối kết quả này; tạm thời đổi sang gemini-3.5-flash-lite.');
else if (!F.ok) console.log('Đường 1 lượt chạy được nhưng schema của agent Writer bị từ chối: đặt CAPTION_PIPELINE=single trong lúc chờ sửa, và gửi mình khối kết quả này.');
else console.log('Gemini nhận mọi thử nghiệm. Nếu app vẫn 502, chạy lại: npm run compare -- single 1 (nay có hiển thị mã HTTP và thông điệp lỗi).');
process.exit(results.every(result => result.ok) ? 0 : 1);
