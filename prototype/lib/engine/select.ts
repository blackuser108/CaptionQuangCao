import { count, normalize, openingCount, type Input } from '../content.ts';
import { categoryById, library } from './library.ts';
import {
  claimUnsupported, clicheHits, ctaPattern, emojiPattern, hasScene, hookStrength, openingOverlap,
  placeholder, rawJson, readerCues, sourceBlob, urgencyPattern,
} from './quality.ts';
import type { CampaignBrief } from './types.ts';

export type CandidateScore = { score: number; hard: boolean; issues: string[] };

const clamp = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(3))));

/**
 * Chấm MỘT caption ở vị trí `slot` (0 = hook ngắn, 1 = PAS, 2 = câu chuyện).
 * `hard` = loại thẳng (claim bịa, placeholder, vượt giới hạn Instagram). Phần còn lại là điểm mềm 0..1.
 * Đây là "cổng sự thật" bằng code: không để LLM judge quyết định chuyện bịa claim.
 */
export function scoreCandidate(text: string, slot: number, input: Input, brief: CampaignBrief): CandidateScore {
  const body = normalize(text);
  const issues: string[] = [];
  let score = 1, hard = false;
  const imagery = categoryById[brief.product.category].imagery;

  if (!body.trim() || placeholder.test(body) || rawJson.test(body)) { hard = true; issues.push('placeholder'); }
  const unsupported = claimUnsupported(body, input);
  if (unsupported.length) { hard = true; issues.push(`claim:${unsupported[0]}`); }
  const n = count(body);
  if (n > library.platform.instagramCaptionLimit) { hard = true; issues.push('too-long-for-instagram'); }

  const [min, max] = library.platform.captionTargets[slot];
  if (n < min * 0.6 || n > max * 1.5) { score -= 0.25; issues.push('length'); }
  else if (n < min || n > max) score -= 0.08;
  if (openingCount(body) > library.platform.openingMax) { score -= 0.12; issues.push('opening-long'); }

  const cliches = clicheHits(body).length;
  if (cliches) { score -= Math.min(0.3, cliches * 0.15); issues.push('cliche'); }
  const strength = hookStrength(body, slot, input.productName);
  score -= (1 - strength) * 0.3;
  if (strength <= 0.4) issues.push('weak-hook');

  const lead = body.split('\n\n')[0];
  if (slot > 0 && !ctaPattern.test(body)) { score -= 0.2; issues.push('no-cta'); }
  if (slot > 0 && !readerCues.test(lead) && !hasScene(lead, imagery)) { score -= 0.12; issues.push('product-first'); }
  if (slot === 2 && !hasScene(body, imagery)) { score -= 0.15; issues.push('no-scene'); }
  if (slot >= 1 && n > 160 && !body.includes('\n')) { score -= 0.1; issues.push('wall-of-text'); }

  const emoji = (body.match(emojiPattern) ?? []).length;
  if (brief.tone.id === 'formal' ? emoji > 0 : emoji > brief.tone.emojiMax) { score -= 0.15; issues.push('emoji'); }
  if (brief.tone.id === 'formal' && /!!!|xịn|haha/i.test(body)) { score -= 0.3; issues.push('tone-break'); }
  if (urgencyPattern.test(body) && !urgencyPattern.test(sourceBlob(input))) { score -= 0.25; issues.push('urgency'); }

  const source = sourceBlob(input).toLocaleLowerCase('vi-VN'), lowered = body.toLocaleLowerCase('vi-VN');
  const filler = library.fillerWords.filter(word => lowered.includes(word) && !source.includes(word)).length;
  if (filler >= 2) { score -= 0.15; issues.push('filler'); }
  if (input.productName && body.split(input.productName).length - 1 > 2) { score -= 0.1; issues.push('name-spam'); }
  return { score: clamp(score), hard, issues };
}

const words = (text: string) => normalize(text).toLocaleLowerCase('vi-VN').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Độ giống 0..1: lấy mức cao hơn giữa trùng lặp dòng mở đầu và Jaccard của các cặp từ liên tiếp (bắt được câu bị đổi vài chữ). */
export function similarity(a: string, b: string) {
  const grams = (text: string) => {
    const list = words(text), out = new Set<string>();
    for (let i = 0; i < list.length - 1; i++) out.add(`${list[i]} ${list[i + 1]}`);
    return out;
  };
  const A = grams(a), B = grams(b);
  let shared = 0;
  for (const gram of A) if (B.has(gram)) shared++;
  const jaccard = shared / Math.max(A.size + B.size - shared, 1);
  return Math.max(jaccard, openingOverlap(a, b));
}

export type Ranked = { index: number; text: string; score: number };

/**
 * Chọn đúng một ứng viên cho mỗi slot theo thứ tự xếp hạng, nhưng bỏ ứng viên quá giống bài đã chọn ở slot trước.
 * Nếu mọi ứng viên của một slot đều quá giống, lấy ứng viên điểm cao nhất (không bao giờ để trống slot).
 */
export function pickDistinct(slots: Ranked[][], maxSimilarity = 0.5): Ranked[] {
  const chosen: Ranked[] = [];
  for (const ranked of slots) {
    const sorted = [...ranked].sort((a, b) => b.score - a.score);
    const pick = sorted.find(item => chosen.every(done => similarity(done.text, item.text) < maxSimilarity)) ?? sorted[0];
    chosen.push(pick);
  }
  return chosen;
}
