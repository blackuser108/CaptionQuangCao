// So sánh single / smart / deep trên cùng bộ đầu vào ngắn, dùng đúng handler thật và khóa trong .env.local.
//   node --experimental-strip-types scripts/compare-modes.ts            (3 chế độ × 6 đầu vào)
//   node --experimental-strip-types scripts/compare-modes.ts smart,deep 3
// Ghi báo cáo ra scripts/compare-report.md để đọc caption cạnh nhau. Mỗi lượt tốn 1 (single), 2 (smart) hoặc 3–4 (deep) lần gọi AI.
import { writeFileSync } from 'node:fs';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { loadEnv } from './load-env.ts';
import { buildBrief, scoreOutput } from '../lib/engine/index.ts';
import type { Input, Output } from '../lib/content.ts';

loadEnv();

const cases: Input[] = [
  { productName: 'Sổ tay Mây', description: 'Sổ tay khổ A5, 80 trang kẻ ngang, bìa màu xanh, dùng để ghi chép bài học.', audience: 'Sinh viên', tone: 'youthful' },
  { productName: 'Hộp cơm Gấp Đôi', description: 'Hộp cơm 2 ngăn, nắp silicone, bỏ vừa túi xách, dùng được trong lò vi sóng.', audience: 'Dân văn phòng', tone: 'humorous' },
  { productName: 'Kem dưỡng Bơ Mộc', description: 'Kem dưỡng ẩm hũ 50g, thành phần có bơ hạt mỡ và glycerin, mùi hương nhẹ.', audience: 'Phụ nữ 25-35 tuổi', tone: 'formal' },
  { productName: 'Tai nghe Gió', description: 'Tai nghe Bluetooth không dây, hộp sạc nhỏ gọn, 3 màu: đen, trắng, hồng.', audience: 'Học sinh, sinh viên', tone: 'youthful' },
  { productName: 'Lớp IELTS Cuối Tuần', description: 'Lớp học trực tiếp tối thứ Bảy và Chủ nhật, mỗi lớp tối đa 12 học viên.', audience: 'Người đi làm muốn học thêm', tone: 'formal' },
  { productName: 'Chậu cây Mầm Nhỏ', description: 'Chậu gốm men trắng cao 10cm, kèm đĩa lót, đặt vừa mép bàn làm việc.', audience: '', tone: 'humorous' },
];
const modes = (process.argv[2] ?? 'single,smart,deep').split(',').map(item => item.trim()).filter(Boolean);
const limit = Number(process.argv[3] ?? cases.length);

type Row = { mode: string; ms: number; calls: number; score?: number; pass?: boolean; output?: Output; error?: string };
const rows: { input: Input; results: Row[] }[] = [];
for (const input of cases.slice(0, limit)) {
  const results: Row[] = [];
  for (const mode of modes) {
    let calls = 0;
    const fetchUpstream = ((url: string | URL | Request, init?: RequestInit) => { if (init?.method === 'POST') calls++; return fetch(url, init); }) as typeof fetch;
    const handler = createGenerateHandler({ env: { ...process.env, CAPTION_PIPELINE: mode }, fetchUpstream, log: () => {} });
    const started = Date.now();
    const response = await handler(new Request('http://127.0.0.1:3000/api/generate', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, body: JSON.stringify(input) }));
    const ms = Date.now() - started;
    if (!response.ok) { results.push({ mode, ms, calls, error: `${response.status} ${(await response.json()).error?.code}` }); continue; }
    const output = await response.json() as Output;
    const report = scoreOutput(output, input, buildBrief(input, 0));
    results.push({ mode, ms, calls, score: report.score, pass: report.pass, output });
    console.log(`${input.productName.padEnd(22)} ${mode.padEnd(7)} ${String(ms).padStart(6)}ms  ${calls} lần gọi  điểm code ${report.score}${report.pass ? '' : ' (KHÔNG ĐẠT)'}`);
  }
  rows.push({ input, results });
}

const md = ['# So sánh chế độ sinh caption', '', 'Điểm code là điểm của `scoreOutput` (quy tắc), không thay cho việc đọc. Hãy đọc caption cạnh nhau và chọn bản bạn muốn đăng.', ''];
for (const { input, results } of rows) {
  md.push(`## ${input.productName} — ${input.tone}`, `> ${input.description}`, '');
  for (const row of results) {
    md.push(`### ${row.mode} · ${row.ms}ms · ${row.calls} lần gọi${row.score !== undefined ? ` · điểm ${row.score}${row.pass ? '' : ' (không đạt)'}` : ''}`);
    if (row.error || !row.output) { md.push(`Lỗi: ${row.error}`, ''); continue; }
    row.output.captions.forEach((text, i) => md.push(`**Caption ${i + 1}**`, '', text, ''));
    md.push(`Headline: ${row.output.headlines.join(' | ')}`, '', `Hashtag: ${row.output.hashtags.join(' ')}`, '');
  }
}
writeFileSync(new URL('./compare-report.md', import.meta.url), md.join('\n'));
const avg = (mode: string) => { const xs = rows.flatMap(r => r.results.filter(x => x.mode === mode && x.score !== undefined)); return xs.length ? (xs.reduce((s, x) => s + (x.score ?? 0), 0) / xs.length).toFixed(2) : '–'; };
console.log('\nĐiểm code trung bình:', modes.map(mode => `${mode}=${avg(mode)}`).join('  '), '\nĐã ghi scripts/compare-report.md');
