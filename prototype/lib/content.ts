export type Input = { productName: string; description: string; audience: string; tone: string };
export type Output = { captions: string[]; headlines: string[]; hashtags: string[] };
export type Entry = { id: string; createdAt: string; input: Input; output: Output };
export const generationTimeoutMs = 90000;

export const tones = { humorous: 'Hài hước', formal: 'Trang trọng', youthful: 'Trẻ trung' };
export const fields = {
  productName: { label: 'Tên sản phẩm', limit: 120, hint: 'Tên sản phẩm hoặc thương hiệu.' },
  description: { label: 'Mô tả ngắn', limit: 1000, hint: 'Chỉ nêu dữ kiện bạn có thể xác nhận.' },
  audience: { label: 'Đối tượng khách hàng', limit: 300, hint: 'Ai sẽ đọc bài này?' },
};
export const normalize = (text: string) => text.normalize('NFC').replace(/\r\n?/g, '\n');
export const count = (text: string) => Array.from(normalize(text)).length;
export const openingCount = (text: string) => count(normalize(text).split('\n')[0]);
export const cleanInput = (input: Input): Input => Object.fromEntries(
  Object.entries(input).map(([key, value]) => [key, normalize(value).trim()]),
) as Input;

export function validOutput(value: unknown): value is Output {
  if (!value || typeof value !== 'object') return false;
  const out = value as Output;
  return Object.keys(out).length === 3 && (['captions', 'headlines', 'hashtags'] as const).every((key, i) =>
    Array.isArray(out[key]) && out[key].length === [3, 3, 5][i] &&
    out[key].every(text => typeof text === 'string' && text.trim() && count(text) <= 4000 && text === normalize(text)) &&
    new Set(out[key].map(text => key === 'hashtags' ? text.toLocaleLowerCase('vi-VN') : text)).size === out[key].length,
  ) && out.hashtags.every(text => /^#[^\s#]+$/u.test(text));
}

export function validate(input: Input) {
  const clean = cleanInput(input);
  const errors: Partial<Record<keyof Input, string>> = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = clean[key as keyof Input];
    if (!value) errors[key as keyof Input] = `Nhập ${field.label.toLowerCase()}.`;
    else if (count(value) > field.limit) errors[key as keyof Input] = `${field.label} vượt ${field.limit.toLocaleString('vi-VN')} ký tự. Hãy rút ngắn.`;
  }
  if (!Object.hasOwn(tones, clean.tone)) errors.tone = 'Chọn một tông giọng.';
  return errors;
}

export const captionLabels = ['Giới thiệu ngắn', 'Tình huống sử dụng', 'Vấn đề và lợi ích'];
export const targets = [[45, 90], [150, 260], [180, 280]];
export function captionWarning(text: string, index: number) {
  const n = count(text), [min, max] = targets[index];
  if (n > 280) return 'Caption hơi dài — vượt mốc khuyến nghị 280 ký tự.';
  return n < min || n > max ? `Ngoài khoảng mục tiêu ${min}–${max} ký tự.` : '';
}
