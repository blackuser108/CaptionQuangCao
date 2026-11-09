import type { ToneId } from './types.ts';

/**
 * KHO VÍ DỤ VÀNG: các caption THẬT mà bạn đã đăng/hài lòng. Writer dùng chúng làm mẫu về nhịp, độ cụ thể và giọng
 * (cách "brand voice" của Jasper/Copy.ai), tuyệt đối không được chép câu chữ hay dữ kiện.
 *
 * Cách thêm: dán caption vào mảng bên dưới, chọn tone (`youthful` | `formal` | `humorous` | `any`), `note` là 1 câu
 * vì sao bài này tốt (tùy chọn). Mỗi lượt chỉ lấy tối đa 3 bài đúng tông, xoay vòng theo seed để "Tạo lại" có mẫu khác.
 * Chỉ cần 3–10 bài tốt là đủ; nhiều quá thì tốn token. Mảng rỗng = tắt tính năng.
 */
export type GoldenExample = { tone: ToneId | 'any'; caption: string; note?: string };

export const goldenExamples: GoldenExample[] = [
  // { tone: 'youthful', caption: 'Dán caption bạn thích vào đây…', note: 'mở bằng khoảnh khắc ai cũng từng gặp' },
];

export const MAX_GOLDEN_PER_REQUEST = 3;
export const MAX_GOLDEN_CHARS = 700;

/** Lấy tối đa 3 ví dụ đúng tông (cộng 'any'), xoay vòng theo seed. Bỏ ví dụ rỗng hoặc quá dài. */
export function pickGolden(tone: ToneId, seed: number, pool: readonly GoldenExample[] = goldenExamples): { caption: string; note?: string }[] {
  const fit = pool.filter(item => (item.tone === tone || item.tone === 'any') && item.caption.trim() && Array.from(item.caption).length <= MAX_GOLDEN_CHARS);
  if (!fit.length) return [];
  const start = Math.abs(Math.trunc(seed)) % fit.length;
  return Array.from({ length: Math.min(MAX_GOLDEN_PER_REQUEST, fit.length) }, (_, i) => fit[(start + i) % fit.length])
    .map(item => ({ caption: item.caption.trim(), ...(item.note?.trim() ? { note: item.note.trim() } : {}) }));
}
