// Kiểm tra môi trường trước khi chạy pipeline agent:  npm run doctor   (chạy trong thư mục prototype/)
// Không in giá trị khóa, chỉ báo "có/không". Mặc định không gọi mạng.
import { existsSync } from 'node:fs';
import { loadEnv } from './load-env.ts';

let problems = 0, warnings = 0;
const line = (mark: string, text: string) => console.log(`${mark} ${text}`);
const pass = (text: string) => line('✔', text);
const fail = (text: string) => { problems++; line('✘', text); };
const warn = (text: string) => { warnings++; line('!', text); };

console.log('— Kiểm tra môi trường caption pipeline —\n');

const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 6)) pass(`Node ${process.versions.node} (chạy được TypeScript trực tiếp)`);
else fail(`Node ${process.versions.node} quá cũ: cần từ 22.6 trở lên (dự án khuyến nghị 24.x).`);
if (major !== 24) warn('package.json yêu cầu Node 24.x cho bản build/triển khai; chạy thử cục bộ với Node 22.6+ vẫn được.');

if (!existsSync('package.json') || !existsSync('lib/engine')) fail('Bạn đang đứng sai thư mục. Hãy cd vào thư mục prototype (nơi có package.json và thư mục lib).');

const required = [
  'lib/content.ts', 'lib/samples.ts', 'app/api/generate/route.ts',
  'lib/server/generate.ts', 'lib/server/providers.ts',
  'lib/engine/index.ts', 'lib/engine/types.ts', 'lib/engine/library.ts', 'lib/engine/context.ts', 'lib/engine/prompt.ts', 'lib/engine/quality.ts',
  'lib/engine/agents.ts', 'lib/engine/pipeline.ts', 'lib/engine/select.ts', 'lib/engine/schemas.ts', 'lib/engine/golden.ts',
  'scripts/compare-modes.ts', 'scripts/load-env.ts',
];
const missing = required.filter(file => !existsSync(file));
if (missing.length) {
  fail(`Thiếu ${missing.length} file:\n    ${missing.join('\n    ')}`);
  console.log('\n  → Giải nén lại caption-upgrade-v3.zip đè lên thư mục dự án (thư mục chứa prototype), và chép providers.ts vào lib/server/ nếu còn thiếu.');
  console.log('\nKết quả: CHƯA SẴN SÀNG.');
  process.exit(1);
}
pass(`đủ ${required.length} file cần thiết`);

const loaded = loadEnv();
if (loaded.length) pass(`đã nạp ${loaded.join(', ')}`);
else warn('Không thấy .env.local ở prototype/ hoặc thư mục cha. Next.js (npm run dev) chỉ đọc prototype/.env.local.');
if (existsSync('.env.local') && !existsSync('../.env.local')) pass('.env.local nằm trong prototype/ (đúng chỗ Next.js đọc)');
if (!existsSync('.env.local') && existsSync('../.env.local')) warn('.env.local chỉ có ở thư mục cha: script compare đọc được, nhưng `npm run dev` thì KHÔNG. Hãy chép nó vào prototype/.');

const { resolveProviders, providerConfig } = await import('../lib/server/providers.ts');
const { parseMode } = await import('../lib/engine/pipeline.ts');
const { goldenExamples } = await import('../lib/engine/golden.ts');
const { scoreCandidate } = await import('../lib/engine/select.ts');
const { buildBrief } = await import('../lib/engine/index.ts');
const { sampleInput } = await import('../lib/samples.ts');

const resolved = resolveProviders(process.env);
if ('error' in resolved) {
  fail(`Chưa cấu hình AI hợp lệ (AI_PROVIDER=${process.env.AI_PROVIDER ?? '(trống → freellmapi)'}). Cần khóa đúng và model hợp lệ, xem .env.example.`);
} else {
  pass(`nhà cung cấp chính: ${resolved.primary.id}, model: ${resolved.primary.model}`);
  if (resolved.primary.id === 'gemini' && resolved.primary.model === 'auto') warn('GEMINI_MODEL=auto tốn thêm 1 request tra danh mục model ở mỗi lượt. Đặt cụ thể gemini-3.1-flash-lite để tiết kiệm quota.');
}

const mode = parseMode(process.env.CAPTION_PIPELINE);
const calls = { single: '1', smart: '2', deep: '4 (Writer, 2 Judge song song, Polisher)' }[mode];
if (process.env.CAPTION_PIPELINE && process.env.CAPTION_PIPELINE.trim().toLowerCase() !== mode) warn(`CAPTION_PIPELINE="${process.env.CAPTION_PIPELINE}" không hợp lệ nên đang dùng single. Giá trị đúng: single | smart | deep.`);
mode === 'deep' ? pass(`CAPTION_PIPELINE=deep: dùng TẤT CẢ agent, ~${calls} lần gọi AI mỗi lượt Tạo/Tạo lại`) : warn(`CAPTION_PIPELINE=${mode}: đang KHÔNG dùng đủ agent (~${calls} lần gọi). Đặt CAPTION_PIPELINE=deep trong prototype/.env.local để dùng tất cả.`);

const judge = process.env.CAPTION_JUDGE_PROVIDER?.trim();
if (!judge) warn('Chưa đặt CAPTION_JUDGE_PROVIDER: Judge dùng cùng model với Writer (thiên vị văn của chính nó). Đặt nhà cung cấp khác nếu bạn có khóa thứ hai.');
else if (!('primary' in resolved)) warn('Chưa kiểm được CAPTION_JUDGE_PROVIDER vì cấu hình chính đang lỗi.');
else if (judge === resolved.primary.id) warn(`CAPTION_JUDGE_PROVIDER=${judge} trùng nhà cung cấp chính nên không có tác dụng.`);
else if (!['deepseek', 'gemini', 'freellmapi'].includes(judge) || !providerConfig(judge as 'gemini', process.env)) fail(`CAPTION_JUDGE_PROVIDER=${judge} chưa có khóa/model hợp lệ nên sẽ bị bỏ qua.`);
else pass(`Judge chạy trên ${judge} (khác Writer)`);

const brief = buildBrief(sampleInput, 1);
const badGolden = goldenExamples.filter(item => scoreCandidate(item.caption, 1, sampleInput, brief).issues.some(issue => issue.startsWith('claim:')));
if (!goldenExamples.length) warn('Kho ví dụ vàng (lib/engine/golden.ts) đang trống: Writer chưa có mẫu giọng của bạn. Không bắt buộc.');
else pass(`${goldenExamples.length} ví dụ vàng${badGolden.length ? '' : ', không chứa claim cần kiểm chứng'}`);
if (badGolden.length) warn(`${badGolden.length} ví dụ vàng chứa cụm kiểu bảo hành/giá/ưu đãi: Writer có thể bắt chước. Kiểm lại các bài đó.`);

console.log(`\nKết quả: ${problems ? `CHƯA SẴN SÀNG (${problems} lỗi)` : 'SẴN SÀNG'}${warnings ? `, ${warnings} lưu ý` : ''}.`);
console.log('Bước tiếp: npm run compare -- single,deep 2   (đo thử, tốn ~10 lần gọi AI)   |   npm run dev   (chạy web)');
process.exit(problems ? 1 : 0);
