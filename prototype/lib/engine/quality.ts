import { count, normalize, openingCount, validOutput, type Input, type Output } from '../content.ts';
import { extractInfo, splitFacts } from '../detail.ts';
import { classifyCategory } from './context.ts';
import { categoryById, library, substantiveFacts } from './library.ts';
import type { CampaignBrief, QualityIssue, QualityReport } from './types.ts';

export const placeholder = /\[(?:insert|điền|todo|placeholder)\]|lorem ipsum|\{[a-z_]+\}|your (product|brand)/i;
export const rawJson = /^\s*[{[]|```|JSON object|finish_reason/i;

export function sourceBlob(input: Input) {
  return `${input.productName}\n${input.description}\n${input.audience}`.normalize('NFC');
}

export function claimUnsupported(text: string, input: Input) {
  const source = sourceBlob(input).toLocaleLowerCase('vi-VN');
  const lowered = text.toLocaleLowerCase('vi-VN');
  const risky = library.riskClaims[classifyCategory(sourceBlob(input)).id] ?? [];
  // Mẫu có chứa con số (giá 148K, giảm 20%...) chỉ là bịa khi chính con số đó không có trong dữ kiện: shop có giá thật thì được nhắc giá.
  const sourceNumbers = (source.match(/\d[\d.,]*/g) ?? []).map(value => value.replace(/\D/g, '')).filter(Boolean);
  const numbersKnown = (match: string) => (match.match(/\d[\d.,]*/g) ?? []).every(value => { const digits = value.replace(/\D/g, ''); return sourceNumbers.some(known => known === digits || `${known}000` === digits || `${digits}000` === known); });
  const found = [...library.unsafeClaims, ...risky].filter(pattern => { const match = lowered.match(pattern); return match && !pattern.test(source) && !(/\d/.test(match[0]) && numbersKnown(match[0])); }).map(pattern => pattern.source);
  // Thứ trong tuần không có trong dữ kiện là bịa lịch ("chiều tối thứ Sáu" khi lớp chỉ học thứ Bảy và Chủ nhật).
  // Chỉ áp dụng khi dữ kiện CÓ lịch (đã nêu một thứ nào đó): sản phẩm không có lịch thì thứ trong cảnh giả định ("tối chủ nhật dọn bàn") là chất liệu hợp lệ.
  const dayPattern = /thứ (hai|ba|tư|năm|sáu|bảy)|chủ nhật/g;
  if (dayPattern.test(source)) for (const day of lowered.match(dayPattern) ?? []) if (!source.includes(day)) found.push(`lịch không có trong dữ kiện: ${day}`);
  return found;
}

export function clicheHits(text: string) {
  const folded = text.toLocaleLowerCase('vi-VN');
  return library.cliches.filter(phrase => folded.includes(phrase));
}

// Extended_Pictographic bắt cả ✔ ✨ ✍ (không có Emoji_Presentation) lẫn 📍 ⏰ 👉; không bắt chữ số hay # *.
export const emojiPattern = /\p{Extended_Pictographic}/gu;
export const emojiCountOf = (text: string) => (text.match(emojiPattern) ?? []).length;
const leadingEmoji = /^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u;
/** Bỏ emoji đứng đầu dòng để chấm hook/độ giống theo phần chữ, vì emoji mở đầu là biểu tượng của hook chứ không phải một phần câu. */
export const stripLeadingEmoji = (text: string) => text.replace(leadingEmoji, '');
const emojiChain = /\p{Extended_Pictographic}\uFE0F?[ \t]*\p{Extended_Pictographic}/u;
const hypeOpening = /^\s*[\u{1F389}\u{1F4A5}\u{1F525}\u{1F6A8}]/u;

const motifStop = new Set(('bạn mình của cho và là có một những được không thì đã này nhé nha để với khi ở trong cũng rồi lại nè luôn ra vào các mà như nếu hay hoặc đang sẽ vẫn đều cả mọi người chỉ còn hơn rất nhiều tại từ đến trên dưới sau trước nào gì đâu sao ai đó kia ấy thế vậy nên bởi vì do nhưng thôi cứ mới cái chiếc con cuốn quyển hộp cây chai bộ lần ngày buổi lúc ' +
  'nhắn shop bình luận lưu bài tag comment inbox kể chọn xem hỏi thêm biết').split(' '));
const words = (text: string) => text.toLocaleLowerCase('vi-VN').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Cụm lặp giữa các caption, dấu hiệu ba bài chung một xương sống ("tò mò cái tên", "chọn đúng thời điểm"): cụm ba chữ xuất hiện ở từ hai caption,
 * hoặc cụm hai chữ xuất hiện ở cả ba. Chữ chức năng và chữ của chính sản phẩm không tính; cặp chữ thường ngày ("quan trọng", "nhất là") lặp ở hai bài không phải lỗi.
 */
export function repeatedMotifs(captions: string[], input: Input): string[] {
  const own = new Set(words(sourceBlob(input)));
  const meaningful = (word: string) => !motifStop.has(word) && !own.has(word) && !/^\d+$/.test(word);
  const collect = (size: number) => {
    const counts = new Map<string, number>();
    for (const text of captions) {
      const w = words(text), found = new Set<string>();
      for (let i = 0; i + size <= w.length; i++) {
        const gram = w.slice(i, i + size);
        if (gram.some(word => /^\d+$/.test(word)) || gram.filter(meaningful).length < 2) continue;
        found.add(gram.join(' '));
      }
      for (const gram of found) counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
    return counts;
  };
  const triples = [...collect(3)].filter(([, n]) => n >= 2).map(([gram]) => gram);
  const pairs = captions.length >= 3 ? [...collect(2)].filter(([, n]) => n >= captions.length).map(([gram]) => gram) : [];
  return [...triples, ...pairs.filter(pair => !triples.some(triple => triple.includes(pair)))];
}

// Emoji mang nghĩa thông tin chỉ được dùng khi dữ kiện nguồn có loại thông tin đó (📍 không phải dấu chấm đầu dòng cho khổ giấy hay hộp sạc).
export const emojiNeeds: [RegExp, RegExp, string][] = [
  [/\u{1F4CD}/u, /địa chỉ|đường |phố|quận|phường|ngõ|số \d|cửa hàng|trực tiếp|tại /i, 'địa điểm'],
  [/[\u{1F33F}\u{1F343}\u{1F331}\u{1F340}]/u, /cây|lá|thảo mộc|thực vật|tự nhiên|hoa|chậu|trà|rau/i, 'thực vật hoặc nguồn gốc tự nhiên'],
  [/[\u{1F455}\u{1F457}\u{1F456}\u{1F9E5}\u{1F45F}]/u, /áo|quần|váy|vải|thời trang|mặc|cotton|giày|sneaker/i, 'quần áo'],
  [/\u{1F4DE}|\u{260E}/u, /sđt|số điện thoại|hotline|zalo|\b0\d{8,10}\b/i, 'số liên hệ'],
  [/[\u{23F0}\u{1F4C5}\u{1F5D3}\u{1F552}\u{1F55B}]/u, /\d{1,2}\s?[h:giờ]|thứ|chủ nhật|\bt[2-7]\b|\bcn\b|lịch|giờ|ngày|tháng|buổi|sáng|chiều|tối|cuối tuần|hằng tuần|hàng tuần/i, 'giờ hoặc lịch'],
];

export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLocaleLowerCase('vi-VN');
function similarity(a: string, b: string) {
  if (a === b) return 1;
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const keep = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = keep; }
  }
  return 1 - row[b.length] / Math.max(a.length, b.length);
}

/** Tên sản phẩm bị sai chính tả trong caption hoặc hashtag ("Cuottuần", "#LopIELSTCuoiTuan"): cụm gần giống tên nhưng không đúng từng chữ. */
export function nameTypos(texts: string[], productName: string): string[] {
  const name = productName.normalize('NFC').toLocaleLowerCase('vi-VN').trim(), key = fold(name).replace(/\s+/g, '');
  if (key.length < 5) return [];
  const found = new Set<string>();
  for (const text of texts) {
    if (text.trim().startsWith('#')) {
      const tag = fold(text.replace(/^#/, ''));
      if (tag !== key && key.length >= 10 && Math.abs(tag.length - key.length) <= 2 && similarity(tag, key) >= 0.85) found.add(text);
      continue;
    }
    const w = text.normalize('NFC').split(/\s+/).map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
    const nameWords = name.split(/\s+/), size = nameWords.length;
    for (let n = Math.max(1, size - 1); n <= size + 1; n++) for (let i = 0; i + n <= w.length; i++) {
      const window = w.slice(i, i + n), phrase = window.join(' '), lowered = phrase.toLocaleLowerCase('vi-VN');
      if (lowered === name) continue;
      if (n === size) {
        // Cùng số chữ: chỉ coi là gõ sai khi ĐÚNG MỘT chữ lệch và chữ đó gần giống chữ gốc (khác một cụm từ thường như "sổ hay mấy").
        const diffs = window.map((word, k) => [word.toLocaleLowerCase('vi-VN'), nameWords[k]]).filter(([x, y]) => x !== y);
        if (diffs.length === 1) {
          const [x, y] = diffs[0].map(fold);
          if (Math.abs(x.length - y.length) <= 2 && similarity(x, y) >= 0.6 && y.length >= 3) found.add(phrase);
        }
      } else {
        // Khác số chữ (dính hoặc tách chữ, như "Cuottuần"): so cả cụm, ngưỡng cao hơn.
        const candidate = fold(phrase).replace(/\s+/g, '');
        if (key.length >= 10 && Math.abs(candidate.length - key.length) <= 2 && similarity(candidate, key) >= 0.9) found.add(phrase);
      }
    }
  }
  return [...found];
}

const mustFixCodes = new Set(['tone-stock-heavy', 'invented-number', 'clock-opener', 'layout-monotone', 'copied-example', 'bullet-empty', 'repeated-motif', 'emoji-claim', 'emoji-tone', 'emoji-monotone', 'emoji-style', 'name-typo', 'hashtag-style', 'cliche-heavy']);

/** Hashtag lộ tên tông giọng (#Youthful), có dấu lộn xộn (#Đồdùngvănhòng) hoặc dính liền không viết hoa đầu từ (#Sinhvien). Hashtag tên sản phẩm được giữ nguyên dấu. */
const toneWords = new Set(library.tones.flatMap(tone => [tone.id, fold(tone.label).replace(/\s+/g, '')]));
export const isToneWord = (body: string) => toneWords.has(fold(body).replace(/\s+/g, ''));

export function hashtagProblems(tags: string[], input: Input): string[] {
  const nameKey = input.productName.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/\s+/g, '');
  const bad: string[] = [];
  for (const tag of tags) {
    const body = tag.replace(/^#/, '');
    if (isToneWord(body)) { bad.push(`${tag} là tên tông giọng, không phải hashtag`); continue; }
    const ascii = /^[\x00-\x7f]+$/.test(body);
    if (!ascii && !(body.toLocaleLowerCase('vi-VN') === nameKey && body === input.productName.normalize('NFC').split(/\s+/).map(word => word[0].toLocaleUpperCase('vi-VN') + word.slice(1)).join(''))) { bad.push(`${tag} có dấu lộn xộn: viết không dấu`); continue; }
    if (ascii && body.length > 7 && !/[A-Z0-9]/.test(body.slice(1))) bad.push(`${tag} thiếu viết hoa đầu mỗi từ`);
  }
  return bad;
}

const timeCue = /\d{1,2}\s?[h:giờ]|lịch|thứ|chủ nhật|\bt[2-7]\b|\bcn\b|buổi|hằng tuần|hàng tuần/i;
const clockOpener = /^\s*(?:\p{Extended_Pictographic}\uFE0F?\s*)?(?:\d{1,2}\s?(?:h|giờ|:)\s?\d{0,2}|\d{1,2}h\d{0,2}|(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)(?: mươi)?(?: rưỡi)? giờ)(?!\p{L})/iu;
const bulletLine = /^[ \t]*(?:\p{Extended_Pictographic}\uFE0F?|•)[ \t]+\S/gmu;

/** Bài có danh sách đầu dòng (từ 2 dòng emoji/• trở lên). */
const infoAnchor = /^[ \t]*[\u{1F4CD}\u{23F0}\u{1F4C5}\u{1F4DE}\u{1F3D8}\u{1F3E0}\u{1F552}\u{260E}]/u;
/** Dòng khối thông tin thật (📍 địa chỉ, ⏰ giờ, 📅 lịch, 📞 hotline): chép nguyên văn từ dữ kiện, không phải danh sách trang trí và không tính vào độ dài. */
export const isInfoLine = (line: string) => infoAnchor.test(line);
export const contentText = (text: string) => normalize(text).split('\n').filter(line => !isInfoLine(line)).join('\n');
export const hasBulletList = (text: string) => (contentText(text).match(bulletLine) ?? []).length >= 2;

/** Mở bài bằng giờ giấc cụ thể ("7h50 sáng, …") khi dữ kiện không có lịch giờ: khuôn mở bài model chép đi chép lại ở mọi sản phẩm. */
export const opensWithClock = (text: string, input: Input) => clockOpener.test(text) && !timeCue.test(sourceBlob(input));

/** Số cụm 4 chữ có nghĩa mà caption chép nguyên văn từ ví dụ minh họa trong brief (bỏ chữ chức năng, chữ của chính sản phẩm). */
export function copiedFromExamples(text: string, examples: { caption: string }[], input: Input): string[] {
  const own = new Set(words(sourceBlob(input)));
  const shingles = (value: string) => {
    const w = words(value), found = new Set<string>();
    for (let i = 0; i + 4 <= w.length; i++) {
      const gram = w.slice(i, i + 4);
      if (gram.filter(x => motifStop.has(x) || own.has(x) || /^\d+$/.test(x)).length >= 3) continue;
      found.add(gram.join(' '));
    }
    return found;
  };
  const mine = shingles(text), hits = new Set<string>();
  for (const example of examples) for (const gram of shingles(example.caption)) if (mine.has(gram)) hits.add(gram);
  return [...hits];
}

// Emoji gợi giá/ưu đãi/khan hiếm/xếp hạng chỉ hợp lệ khi chính dữ kiện nêu điều đó; emoji sức khỏe thì luôn cấm.
const emojiNeedsCue: [RegExp, RegExp][] = [
  [/[\u{1F381}\u{1F193}\u{1F4B0}\u{1F4B8}\u{1F3F7}]/u, /\d[\d.,]*\s?(?:k|đ|vnđ|nghìn|ngàn|triệu)(?![\p{L}])|đồng giá|giá|ưu đãi|khuyến mãi|tặng|miễn phí|giảm|combo|voucher|quà|đặc quyền/iu],
  [/\u{1F525}/u, /hot|bán chạy/iu],
  [/[\u{2B50}\u{1F31F}\u{1F3C6}\u{1F4AF}\u{1F947}]/u, /top|số 1|giải|chứng nhận|đánh giá|xếp hạng/iu],
  [/[\u{23F3}\u{1F6A8}\u{26A0}\u{203C}]/u, /hết (?:mẻ|hàng|suất|slot|chỗ)|số lượng (?:có hạn|chưa nhiều|giới hạn)|chỉ còn|đến hết|trước ngày|(?<![\p{L}])(?:slot|suất)(?![\p{L}])|hạn (?:ưu đãi|đăng ký|chót)/iu],
  [/[\u{1F48A}\u{1FA7A}\u{1F4AA}\u{1FA79}]/u, /(?!)/u],
];
export function forbiddenEmojiHit(text: string, input: Input) {
  const source = sourceBlob(input);
  return emojiNeedsCue.some(([emoji, cue]) => emoji.test(text) && !cue.test(source) && !emoji.test(source));
}

/** Con số trong caption mà dữ kiện không có ("mất nguyên 3 phút", "tiết 5 phút"): số liệu bịa. Số chỉ cách tương tác ("1 emoji", "2 từ") và cách viết 148K/148.000đ được bỏ qua. */
export function inventedNumbers(text: string, input: Input): string[] {
  const known = [...new Set((sourceBlob(input).normalize('NFC').match(/\d[\d.,]*/g) ?? []).map(value => value.replace(/\D/g, '')).filter(Boolean))];
  const found = new Set<string>();
  for (const match of text.matchAll(/\d[\d.,]*/g)) {
    const digits = match[0].replace(/\D/g, '');
    if (!digits) continue;
    const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 14).toLocaleLowerCase('vi-VN');
    if (/^\s?(emoji|comment|bình luận|từ(?![\p{L}])|dòng|chữ|bước)/u.test(after)) continue;
    if (known.some(value => value === digits || `${value}000` === digits || `${digits}000` === value)) continue;
    found.add(match[0].replace(/[.,]$/, ''));
  }
  return [...found];
}

/** Loại thông tin mà emoji ở dòng thông tin đòi hỏi nhưng dữ kiện không có ("địa điểm", "số liên hệ", "giờ hoặc lịch"). Dùng cả regex lẫn bộ trích thông tin thật nên địa chỉ viết kiểu "12 Đống Kỳ, Hoàng Mai, Hà Nội" cũng được nhận. */
export function missingFactForEmoji(text: string, input: Input): string | undefined {
  const info = extractInfo(input.description), source = sourceBlob(input);
  const known: Record<string, boolean> = { 'địa điểm': info.addresses.length > 0, 'số liên hệ': info.contacts.length > 0, 'giờ hoặc lịch': info.schedule.length > 0 };
  return emojiNeeds.find(([emoji, cue, what]) => emoji.test(text) && !cue.test(source) && !known[what])?.[2];
}

/** Khung độ dài theo độ giàu dữ kiện: dữ kiện mỏng thì khung ngắn hơn để khỏi độn chi tiết bịa. */
export function targetsFor(input: Input): [number, number][] {
  const thin = substantiveFacts(splitFacts(input.description), input.productName).length < 2;
  return thin ? library.platform.thinCaptionTargets : library.platform.captionTargets;
}

export type EmojiProblem = {
  code: 'emoji-excess' | 'emoji-claim' | 'emoji-tone' | 'emoji-style' | 'emoji-missing' | 'emoji-monotone' | 'bullet-empty';
  detail: string;
  dimension: 'tone' | 'factuality' | 'engagement' | 'specificity';
  penalty: number;
};

/** Luật emoji của MỘT caption ở vị trí `slot`: trần theo tông, emoji ngầm bịa dữ kiện, biểu tượng không hợp tông trang trọng, rải chuỗi/hô hào, và bỏ phí emoji ở caption dài. */
export function emojiProblems(text: string, slot: number, input: Input, brief: CampaignBrief): EmojiProblem[] {
  const body = normalize(text), total = emojiCountOf(body), max = brief.tone.emojiMax, name = `Caption ${slot + 1}`;
  const out: EmojiProblem[] = [];
  if (total > max) out.push({ code: 'emoji-excess', dimension: 'tone', penalty: 0.2, detail: `${name} dùng ${total} emoji, quá trần ${max} của tông ${brief.tone.label.toLocaleLowerCase('vi-VN')}.` });
  if (forbiddenEmojiHit(body, input)) out.push({ code: 'emoji-claim', dimension: 'factuality', penalty: 0.3, detail: `${name} có emoji ngầm bịa dữ kiện (quà/giá/hot/xếp hạng/giục giờ/công dụng): bỏ hoặc thay bằng emoji thông tin.` });
  if (brief.tone.id === 'formal' && library.formalForbiddenEmoji.test(body)) out.push({ code: 'emoji-tone', dimension: 'tone', penalty: 0.3, detail: `${name}: tông trang trọng chỉ dùng biểu tượng thông tin (📍 ⏰ 📅 ✨ ✔ 💬 👉), không mặt cười, trái tim hay emoji cảm thán.` });
  if (emojiChain.test(body) || hypeOpening.test(body)) out.push({ code: 'emoji-style', dimension: 'tone', penalty: 0.1, detail: `${name} rải emoji liền nhau hoặc mở bằng emoji hô hào: mỗi emoji một vai trò, cách nhau bằng chữ.` });
  if (slot > 0 && max > 0 && total === 0) out.push({ code: 'emoji-missing', dimension: 'engagement', penalty: 0.15, detail: `${name} chưa có emoji: thêm emoji neo thông tin (✔ 📍 ⏰) đầu dòng và 1 emoji dẫn tới CTA (👉 💬).` });
  const missing = missingFactForEmoji(body, input);
  if (missing) out.push({ code: 'emoji-claim', dimension: 'factuality', penalty: 0.3, detail: `${name}: emoji chỉ ${missing} nhưng dữ kiện không có ${missing}; dùng emoji đúng nghĩa với từng dòng (📏 khổ, 🎨 màu, 🎧 loại sản phẩm).` });
  if (body.split('\n').some(line => /\u{1F50C}/u.test(line) && /không dây|bluetooth|wireless/i.test(line))) {
    out.push({ code: 'emoji-claim', dimension: 'factuality', penalty: 0.3, detail: `${name}: 🔌 là phích cắm (có dây), ngược nghĩa với "không dây"; dùng 📶 hoặc 🎧.` });
  }
  const pointers = (body.match(/[\u{1F449}\u{1F447}\u{1F4AC}]/gu) ?? []).length;
  if (pointers > 1) out.push({ code: 'emoji-style', dimension: 'tone', penalty: 0.1, detail: `${name} có ${pointers} emoji chỉ hướng/CTA: chỉ một lời kêu gọi và một emoji dẫn tới nó.` });
  const leaders = [...body.matchAll(/^[ \t]*(\p{Extended_Pictographic})\uFE0F?[ \t]+/gmu)].map(match => match[1]).filter(emoji => !'✔•✅📍🏘🏠'.includes(emoji));
  const repeated = leaders.find((emoji, index) => leaders.indexOf(emoji) !== index);
  if (repeated) out.push({ code: 'emoji-monotone', dimension: 'tone', penalty: 0.15, detail: `${name}: nhiều dòng đầu dòng cùng dùng ${repeated}; mỗi dòng một emoji khác, đúng với dữ kiện của dòng đó.` });
  const productName = input.productName.toLocaleLowerCase('vi-VN').trim();
  const bullets = [...body.matchAll(/^[ \t]*\p{Extended_Pictographic}\uFE0F?[ \t]+(.+)$/gmu)].map(match => match[1].trim());
  const empty = bullets.filter(line => {
    const lowered = line.toLocaleLowerCase('vi-VN'), head = lowered.split(/\s[—–-]\s/)[0].trim();
    return (head.length >= 2 && productName.includes(head)) || lowered.replace(productName, '').replace(/[^\p{L}\p{N}]/gu, '').length < 4;
  });
  if (empty.length) out.push({ code: 'bullet-empty', dimension: 'specificity', penalty: 0.2, detail: `${name}: dòng đầu dòng "${empty[0].slice(0, 30)}" chỉ nhắc lại tên sản phẩm, không mang dữ kiện nào: bỏ dòng đó.` });
  else if (bullets.length >= 2 && substantiveFacts(brief.verifiedFacts, input.productName).length < 2) out.push({ code: 'bullet-empty', dimension: 'specificity', penalty: 0.2, detail: `${name}: dữ kiện mỏng nên không lập danh sách; viết bằng cảnh, nhịp và câu hỏi cho người đọc.` });
  return out;
}
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
  const first = stripLeadingEmoji(normalize(text).split('\n')[0]).trim();
  const lowered = first.toLocaleLowerCase('vi-VN');
  if (weakOpening.test(lowered)) return 0.2;
  const startsWithName = !!productName && lowered.startsWith(productName.toLocaleLowerCase('vi-VN'));
  if (startsWithName && index > 0) return 0.4;
  if (strongOpening.test(lowered) || /\bbạn\b|\bmình\b/.test(lowered)) return 1;
  return index === 0 ? 0.8 : 0.6;
}

export function openingOverlap(a: string, b: string) {
  const left = stripLeadingEmoji(a.split('\n')[0]).toLocaleLowerCase('vi-VN');
  const right = stripLeadingEmoji(b.split('\n')[0]).toLocaleLowerCase('vi-VN');
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
    const [min, max] = targetsFor(input)[index];
    const length = count(contentText(text));
    if (length < min * 0.6 || length > max * 1.5) {
      issues.push({ code: 'length-hard', hard: false, detail: `Caption ${index + 1} lệch nhiều so với khung ${min}–${max}.` });
      dimensions.readability -= 0.2;
    }
    else if (length < min * 0.9) {
      issues.push({ code: 'length-short', hard: false, detail: `Caption ${index + 1} ngắn hơn khung ${min}–${max}: thêm cảnh, nhịp, phản ứng hoặc câu hỏi cho người đọc, đừng độn tính từ.` });
      dimensions.readability -= 0.05;
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
    for (const problem of emojiProblems(text, index, input, brief)) {
      issues.push({ code: problem.code, hard: false, detail: problem.detail });
      dimensions[problem.dimension] -= problem.penalty;
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
  const invented = output.captions.map((text, index) => [index, inventedNumbers(text, input)] as const).filter(([, numbers]) => numbers.length);
  if (invented.length) {
    issues.push({ code: 'invented-number', hard: false, detail: `Caption ${invented[0][0] + 1} có con số không có trong dữ kiện (${invented[0][1].slice(0, 2).join(', ')}): bỏ đi hoặc dùng đúng số trong dữ kiện.` });
    dimensions.factuality -= 0.3;
  }
  const clocks = output.captions.map((text, index) => (opensWithClock(text, input) ? index + 1 : 0)).filter(Boolean);
  if (clocks.length) {
    issues.push({ code: 'clock-opener', hard: false, detail: `Caption ${clocks[0]} mở bằng giờ giấc cụ thể: đổi sang một cảnh theo strategies[i].scene, không mở bằng giờ.` });
    dimensions.naturalness -= 0.1;
  }
  const lists = output.captions.map((text, index) => (hasBulletList(text) ? index + 1 : 0)).filter(Boolean);
  if (lists.length > 1) {
    issues.push({ code: 'layout-monotone', hard: false, detail: `Caption ${lists.join(', ')} đều xếp dữ kiện thành danh sách: chỉ bài có layout "list" được dùng danh sách, các bài khác viết bằng câu văn, hỏi–đáp hoặc đối thoại.` });
    dimensions.differentiation -= 0.2;
  }
  output.captions.forEach((text, index) => {
    const copied = copiedFromExamples(text, brief.examples, input);
    if (copied.length >= 2) {
      issues.push({ code: 'copied-example', hard: false, detail: `Caption ${index + 1} chép lại câu chữ của ví dụ minh họa ("${copied[0]}"): tự viết bằng chi tiết riêng của sản phẩm.` });
      dimensions.differentiation -= 0.2;
    }
  });
  const typos = nameTypos([...output.captions, ...output.headlines, ...output.hashtags], input.productName);
  if (typos.length) {
    issues.push({ code: 'name-typo', hard: false, detail: `Tên sản phẩm bị sai chính tả ("${typos[0]}"): chép đúng "${input.productName}" từng chữ, từng dấu, cả trong hashtag.` });
    dimensions.naturalness -= 0.4;
  }
  const tagIssues = hashtagProblems(output.hashtags, input);
  if (tagIssues.length) {
    issues.push({ code: 'hashtag-style', hard: false, detail: `Hashtag chưa đạt: ${tagIssues.slice(0, 2).join('; ')}. Viết KHÔNG DẤU, CamelCase (#DoDungHocTap), riêng tên sản phẩm viết đúng tên.` });
    dimensions.naturalness -= 0.1;
  }
  const stock = new Set(output.captions.flatMap(clicheHits));
  if (stock.size >= 2) {
    issues.push({ code: 'cliche-heavy', hard: false, detail: `Dùng ${stock.size} khuôn đã cấm (${[...stock].slice(0, 3).map(item => `"${item}"`).join(', ')}): diễn đạt lại bằng cảnh và chi tiết riêng của sản phẩm.` });
    dimensions.naturalness -= 0.1;
  }
  const motifs = repeatedMotifs(output.captions, input);
  if (motifs.length) {
    issues.push({ code: 'repeated-motif', hard: false, detail: `Các caption lặp cùng cụm "${motifs.slice(0, 2).join('", "')}": mỗi bài cần một góc nhìn và từ khóa cảm xúc khác nhau.` });
    dimensions.differentiation -= Math.min(0.3, 0.15 * motifs.length);
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
  if (output.headlines.some(text => emojiCountOf(text) > 1 || forbiddenEmojiHit(text, input))) {
    issues.push({ code: 'emoji-headline', hard: false, detail: 'Headline chỉ được tối đa 1 emoji và không dùng emoji ngầm bịa dữ kiện.' });
    dimensions.tone -= 0.1;
  }
  if (output.hashtags.some(text => emojiCountOf(text) > 0)) {
    issues.push({ code: 'emoji-hashtag', hard: false, detail: 'Hashtag không được chứa emoji.' });
    dimensions.naturalness -= 0.1;
  }
  // Mỗi tông có danh sách từ/khuôn đã mòn (tone.avoid): một từ là phá tông, từ hai từ trở lên là bài chung một bộ từ nên bắt buộc viết lại.
  const lowerAll = joined.toLocaleLowerCase('vi-VN'), lowerSource = sourceBlob(input).toLocaleLowerCase('vi-VN');
  const toneStock = brief.tone.avoid.filter(word => { const w = word.toLocaleLowerCase('vi-VN'); return lowerAll.includes(w) && !lowerSource.includes(w); });
  if (toneStock.length >= 2) {
    issues.push({ code: 'tone-stock-heavy', hard: false, detail: `Dùng ${toneStock.length} từ/khuôn đã mòn của tông ${brief.tone.label.toLocaleLowerCase('vi-VN')} (${toneStock.slice(0, 3).map(item => `"${item}"`).join(', ')}): thay bằng chi tiết cụ thể và hình ảnh riêng của sản phẩm.` });
    dimensions.tone -= 0.4;
  } else if (toneStock.length === 1) {
    issues.push({ code: 'tone-break', hard: false, detail: `Tông ${brief.tone.label.toLocaleLowerCase('vi-VN')} bị phá hoặc dùng khuôn đã mòn: "${toneStock[0]}".` });
    dimensions.tone -= 0.3;
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
  // Điểm là trung bình nhiều chiều nên lỗi nghề đơn lẻ bị pha loãng; những lỗi này luôn đáng sửa dù điểm tổng còn cao.
  const mustFix = issues.some(issue => mustFixCodes.has(issue.code));
  return { pass: !hard && !mustFix && score >= 0.62, score, issues, dimensions };
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

const globalCaptionCodes = new Set(['repeated-motif', 'cliche-heavy', 'layout-monotone']);

/** Lỗi nằm ở caption nào (đánh số từ 0) và hashtag có cần viết lại không, để chỉ sửa đúng chỗ thay vì viết lại cả bộ. */
export function repairPlan(report: QualityReport): { captions: number[]; hashtags: boolean } {
  const captions = new Set<number>();
  let hashtags = false;
  for (const issue of report.issues) {
    if (issue.code === 'hashtag-style' || issue.code === 'emoji-hashtag') hashtags = true;
    for (const group of issue.detail.matchAll(/Caption ((?:\d(?:, )?)+)/g)) for (const n of group[1].split(', ')) captions.add(Number(n) - 1);
    if (globalCaptionCodes.has(issue.code)) { captions.add(1); captions.add(2); }
  }
  const list = [...captions].filter(index => index >= 0 && index < 3).sort();
  return { captions: list.length || hashtags ? list : [0, 1, 2], hashtags };
}
