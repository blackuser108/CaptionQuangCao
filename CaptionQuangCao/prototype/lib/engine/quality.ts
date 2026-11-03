import { count, normalize, openingCount, validOutput, type Input, type Output } from '../content.ts';
import { categoryById, library } from './library.ts';
import type { CampaignBrief, QualityIssue, QualityReport } from './types.ts';

export const placeholder = /\[(?:insert|điền|todo|placeholder)\]|lorem ipsum|\{[a-z_]+\}|your (product|brand)/i;
export const rawJson = /^\s*[{[]|```|JSON object|finish_reason/i;

export function sourceBlob(input: Input) {
  return `${input.productName}\n${input.description}\n${input.audience}`.normalize('NFC');
}

export function claimUnsupported(text: string, input: Input) {
  const source = sourceBlob(input).toLocaleLowerCase('vi-VN');
  const lowered = text.toLocaleLowerCase('vi-VN');
  return library.unsafeClaims.filter(pattern => pattern.test(lowered) && !pattern.test(source)).map(pattern => pattern.source);
}

export function clicheHits(text: string) {
  const folded = text.toLocaleLowerCase('vi-VN');
  return library.cliches.filter(phrase => folded.includes(phrase));
}

export const emojiPattern = /\p{Emoji_Presentation}/gu;
export const ctaPattern = /nhắn|inbox|bình luận|comment|lưu (bài|lại)|tag|kể|chọn|xem|ghé|hỏi|trả lời|chia sẻ|gõ|đặt|ib\b/i;
export const urgencyPattern = /kẻo lỡ|săn deal|add to cart|nhanh tay|số lượng có hạn|chỉ còn|duy nhất hôm nay|mua ngay kẻo/i;
const weakOpening = /^(giới thiệu|xin giới thiệu|sản phẩm|chúng tôi|bạn đang tìm|hôm nay shop)/i;
const strongOpening = /\?|\d|^(pov|khi mà|thú thật|ai (cũng|mà chẳng)|có (hai|một|những)|hôm nay|cho phép|nếu|đừng|không cần|chủ nhật|sáng|chiều|tối|cuối tuần)/i;

const sceneCue = /(?<![\p{L}])(sáng|trưa|chiều|tối(?! (?:ưu|đa|thiểu|giản))|đêm|cuối tuần|chủ nhật|thứ (hai|ba|tư|năm|sáu|bảy)|tiết|pov|hình dung|khi mà)(?![\p{L}])|\d{1,2}h\d{0,2}|\d+ phút/iu;
export const readerCues = /\bbạn\b|\bmình\b|tụi mình|các bạn|nhà mình|ai (cũng|mà|từng)|\?/i;

export function hasScene(text: string, imagery: string[]) {
  const lowered = text.toLocaleLowerCase('vi-VN');
  return sceneCue.test(lowered) || imagery.some(item => lowered.includes(item.toLocaleLowerCase('vi-VN')));
}

export function hookStrength(text: string, index: number, productName: string) {
  const first = normalize(text).split('\n')[0].trim();
  const lowered = first.toLocaleLowerCase('vi-VN');
  if (weakOpening.test(lowered)) return 0.2;
  const startsWithName = !!productName && lowered.startsWith(productName.toLocaleLowerCase('vi-VN'));
  if (startsWithName && index > 0) return 0.4;
  if (strongOpening.test(lowered) || /\bbạn\b|\bmình\b/.test(lowered)) return 1;
  return index === 0 ? 0.8 : 0.6;
}

export function openingOverlap(a: string, b: string) {
  const left = a.split('\n')[0].toLocaleLowerCase('vi-VN');
  const right = b.split('\n')[0].toLocaleLowerCase('vi-VN');
  if (left === right) return 1;
  const words = (value: string) => new Set(value.split(/\s+/).filter(Boolean));
  const A = words(left), B = words(right);
  let share = 0;
  for (const word of A) if (B.has(word)) share++;
  return share / Math.max(A.size, B.size, 1);
}

export function scoreOutput(output: Output, input: Input, brief: CampaignBrief): QualityReport {
  const issues: QualityIssue[] = [];
  const dimensions: Record<string, number> = {
    relevance: 1, specificity: 1, naturalness: 1, tone: 1, strategy: 1, differentiation: 1,
    factuality: 1, readability: 1, cta: 1, cliche: 1, hook: 1, engagement: 1,
  };
  const joined = [...output.captions, ...output.headlines, ...output.hashtags].join('\n');
  const facts = brief.verifiedFacts.map(fact => fact.toLocaleLowerCase('vi-VN'));
  const productTokens = input.productName.toLocaleLowerCase('vi-VN').split(/\s+/).filter(token => token.length > 1);

  if (output.captions.some(text => placeholder.test(text) || rawJson.test(text))) {
    issues.push({ code: 'placeholder', hard: true, detail: 'Còn placeholder hoặc JSON thô.' });
    dimensions.naturalness = 0;
  }
  for (const [index, text] of output.captions.entries()) {
    const unsupported = claimUnsupported(text, input);
    if (unsupported.length) {
      issues.push({ code: 'unsupported-claim', hard: true, detail: `Caption ${index + 1} thêm claim chưa có: ${unsupported.slice(0, 3).join(', ')}.` });
      dimensions.factuality = 0;
    }
    if (clicheHits(text).length) {
      issues.push({ code: 'cliche', hard: false, detail: `Caption ${index + 1} có cụm khuôn mẫu.` });
      dimensions.cliche -= 0.2;
    }
    const [min, max] = library.platform.captionTargets[index];
    if (count(text) < min * 0.6 || count(text) > max * 1.5) {
      issues.push({ code: 'length-hard', hard: false, detail: `Caption ${index + 1} lệch nhiều so với khung ${min}–${max}.` });
      dimensions.readability -= 0.2;
    }
    if (openingCount(text) > 160) {
      issues.push({ code: 'opening', hard: false, detail: `Caption ${index + 1} mở đầu quá dài.` });
      dimensions.readability -= 0.1;
    }
    const strength = hookStrength(text, index, input.productName);
    dimensions.hook -= (1 - strength) / output.captions.length;
    if (strength <= 0.4) {
      issues.push({ code: 'weak-hook', hard: false, detail: `Caption ${index + 1} mở đầu yếu: hãy mở bằng khoảnh khắc/nhu cầu của người đọc thay vì tên sản phẩm hay lời giới thiệu.` });
    }
    if (index > 0 && !ctaPattern.test(text)) {
      issues.push({ code: 'no-cta', hard: false, detail: `Caption ${index + 1} thiếu lời mời hành động cụ thể (nhắn shop, lưu bài, tag, bình luận…).` });
      dimensions.engagement -= 0.3;
    }
    const lead = normalize(text).split('\n\n')[0];
    if (index > 0 && !readerCues.test(lead) && !hasScene(lead, categoryById[brief.product.category].imagery)) {
      issues.push({ code: 'product-first', hard: false, detail: `Caption ${index + 1} nói về sản phẩm trước người đọc: mở bằng khoảnh khắc hoặc nhu cầu của họ.` });
      dimensions.hook -= 0.15;
    }
    if (index === 2 && !hasScene(text, categoryById[brief.product.category].imagery)) {
      issues.push({ code: 'no-scene', hard: false, detail: 'Caption kể chuyện chưa có cảnh cụ thể (giờ giấc, đồ vật, âm thanh, cảm giác).' });
      dimensions.strategy -= 0.2;
    }
    const emojiCount = (text.match(emojiPattern) ?? []).length;
    if (brief.tone.id !== 'formal' && emojiCount > brief.tone.emojiMax) {
      issues.push({ code: 'emoji-excess', hard: false, detail: `Caption ${index + 1} dùng ${emojiCount} emoji, quá mức tông ${brief.tone.label.toLocaleLowerCase('vi-VN')} cho phép (${brief.tone.emojiMax}).` });
      dimensions.tone -= 0.2;
    }
  }
  const fillerTotal = output.captions.reduce((sum, text) => sum + library.fillerWords.filter(word => text.toLocaleLowerCase('vi-VN').includes(word) && !sourceBlob(input).toLocaleLowerCase('vi-VN').includes(word)).length, 0);
  if (fillerTotal >= 3) {
    issues.push({ code: 'filler', hard: false, detail: 'Nhiều tính từ rỗng (tiện lợi, chất lượng, hoàn hảo…): thay bằng chi tiết và hình ảnh cụ thể.' });
    dimensions.specificity -= 0.3;
  }
  if (!output.captions[2].includes('\n')) {
    issues.push({ code: 'story-shape', hard: false, detail: 'Caption kể chuyện chưa xuống dòng thành các đoạn ngắn.' });
    dimensions.strategy -= 0.15;
  }
  if (productTokens.length && output.captions.every(text => !productTokens.some(token => text.toLocaleLowerCase('vi-VN').includes(token)) && !facts.some(fact => text.toLocaleLowerCase('vi-VN').includes(fact.slice(0, 12))))) {
    issues.push({ code: 'irrelevant', hard: true, detail: 'Caption không gắn với tên hoặc dữ kiện sản phẩm.' });
    dimensions.relevance = 0;
  }
  if (brief.product.features.length && output.captions.every(text => !brief.product.features.some(feature => text.toLocaleLowerCase('vi-VN').includes(feature.toLocaleLowerCase('vi-VN').slice(0, 10))))) {
    dimensions.specificity -= 0.4;
    issues.push({ code: 'generic', hard: false, detail: 'Thiếu đặc điểm cụ thể đã xác nhận.' });
  }
  const overlap01 = openingOverlap(output.captions[0], output.captions[1]);
  const overlap12 = openingOverlap(output.captions[1], output.captions[2]);
  const overlap02 = openingOverlap(output.captions[0], output.captions[2]);
  if (overlap01 > 0.72 || overlap12 > 0.72 || overlap02 > 0.72) {
    issues.push({ code: 'similar-openings', hard: false, detail: 'Ba caption mở đầu quá giống nhau.' });
    dimensions.differentiation = 0.3;
  }
  const hasQuestion = output.captions.map(text => text.includes('?'));
  if (hasQuestion.filter(Boolean).length === 3) {
    issues.push({ code: 'all-questions', hard: false, detail: 'Cả ba caption đều hỏi.' });
    dimensions.strategy -= 0.3;
  }
  if (output.captions[0].includes('\n\n') && count(output.captions[0]) < 90) dimensions.strategy -= 0.1;
  if (!output.captions[1].includes('\n') && count(output.captions[1]) > 160) {
    issues.push({ code: 'audience-shape', hard: false, detail: 'Caption gợi mở thiếu nhịp xuống dòng.' });
    dimensions.strategy -= 0.15;
  }
  if (brief.tone.id === 'formal' && /[\u{1F300}-\u{1FAFF}]/u.test(joined)) {
    issues.push({ code: 'emoji-tone', hard: false, detail: 'Tông trang trọng vẫn có emoji.' });
    dimensions.tone -= 0.3;
  }
  if (brief.tone.id === 'formal' && /!!!|xịn|haha/i.test(joined)) {
    issues.push({ code: 'tone-break', hard: false, detail: 'Tông trang trọng bị phá.' });
    dimensions.tone -= 0.4;
  }
  if (urgencyPattern.test(joined) && !urgencyPattern.test(sourceBlob(input))) {
    issues.push({ code: 'cta', hard: false, detail: 'CTA giục giả/khan hiếm khi không có dữ kiện bán hàng.' });
    dimensions.cta -= 0.4;
  }
  const nameRepeats = output.captions.reduce((sum, text) => sum + (text.split(input.productName).length - 1), 0);
  if (nameRepeats > 6) {
    issues.push({ code: 'name-spam', hard: false, detail: 'Lặp tên sản phẩm máy móc.' });
    dimensions.naturalness -= 0.2;
  }
  for (const key of Object.keys(dimensions)) dimensions[key] = Math.max(0, Math.min(1, Number(dimensions[key].toFixed(2))));
  const score = Number((Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.keys(dimensions).length).toFixed(2));
  const hard = issues.some(issue => issue.hard);
  return { pass: !hard && score >= 0.62, score, issues, dimensions };
}

export function parseGeneratedJson(raw: string): unknown {
  const text = normalize(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  return JSON.parse(text);
}

export function toOutput(value: unknown): Output | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).length !== 3) return;
  const output = {
    captions: Array.isArray(raw.captions) ? raw.captions.map(item => typeof item === 'string' ? normalize(item) : item) : [],
    headlines: Array.isArray(raw.headlines) ? raw.headlines.map(item => typeof item === 'string' ? normalize(item) : item) : [],
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.map(item => typeof item === 'string' ? normalize(item) : item) : [],
  };
  if (!validOutput(output)) return;
  return output;
}

export function repairHints(report: QualityReport) {
  return report.issues.slice(0, 6).map(issue => issue.detail);
}
