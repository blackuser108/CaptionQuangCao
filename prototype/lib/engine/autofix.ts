import type { Input, Output } from '../content.ts';
import { emojiKitFor, library, trustedCategory } from './library.ts';
import { emojiNeeds, isToneWord, missingFactForEmoji, nameTypos } from './quality.ts';
import type { CampaignBrief } from './types.ts';

// Sửa bằng code những lỗi cơ học mà model hay mắc và gọi lại model chỉ tốn thêm lượt gọi: sai chữ tên sản phẩm, hashtag có dấu lộn xộn
// hoặc mang tên tông giọng, emoji sai nghĩa, trùng đầu dòng hoặc chồng CTA. Lỗi về văn phong vẫn để model viết lại (đúng caption lỗi).

const ascii = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const camel = (words: string[]) => words.filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join('');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tagOf = (text: string) => `#${camel(ascii(text).replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/))}`;
const pointer = /[\u{1F449}\u{1F447}\u{1F4AC}]/u;
const leader = /^([ \t]*)(\p{Extended_Pictographic})(\uFE0F?[ \t]+)/u;

export function autofix(output: Output, input: Input, brief: CampaignBrief): { output: Output; fixes: string[] } {
  const fixes: string[] = [];
  let captions = [...output.captions], headlines = [...output.headlines], hashtags = [...output.hashtags];
  const category = trustedCategory(brief.product.category, brief.product.categoryConfidence);
  const kit = emojiKitFor(category, brief.tone.id);
  const spare = [...kit.theme, ...Object.values(library.emojiKit.byFact), '✨'];

  // 1) Tên sản phẩm sai chữ → chép lại đúng tên.
  const typos = nameTypos([...captions, ...headlines], input.productName);
  if (typos.length) {
    for (const typo of typos) {
      const pattern = new RegExp(escapeRegExp(typo), 'g');
      captions = captions.map(text => text.replace(pattern, input.productName));
      headlines = headlines.map(text => text.replace(pattern, input.productName));
    }
    fixes.push('name-typo');
  }

  // 1b) Chữ viết tắt hoặc sai chính tả chép nguyên từ mô tả của người dùng ("mún", "hok", "ko", "đc"): đổi về tiếng Việt chuẩn, trừ khi là một phần tên sản phẩm.
  const slang: [RegExp, string][] = [[/(?<![\p{L}])mún(?![\p{L}])/giu, 'muốn'], [/(?<![\p{L}])(?:hok|hông|ko)(?![\p{L}])/giu, 'không'], [/(?<![\p{L}])(?:đc|dc)(?![\p{L}])/giu, 'được'], [/(?<![\p{L}])trc(?![\p{L}])/giu, 'trước']];
  const fixSlang = (text: string) => slang.reduce((value, [pattern, standard]) => (pattern.test(input.productName) ? value : value.replace(pattern, match => (match[0] !== match[0].toLocaleLowerCase('vi-VN') ? standard[0].toLocaleUpperCase('vi-VN') + standard.slice(1) : standard))), text);
  const slanged = captions.map(fixSlang);
  if (slanged.some((text, index) => text !== captions[index])) { captions = slanged; headlines = headlines.map(fixSlang); fixes.push('slang'); }

  // 2) Hashtag: bỏ tên tông giọng, bỏ dấu lộn xộn, sửa tên sản phẩm sai chữ, rồi bù cho đủ 5 từ nguồn có thật.
  const nameKey = input.productName.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/\s+/g, '');
  const productTag = tagOf(input.productName);
  const cleanedTags = hashtags.map(tag => {
    const body = tag.replace(/^#/, '');
    if (isToneWord(body)) return '';
    if (nameTypos([tag], input.productName).length) return productTag;
    // Tên sản phẩm luôn về một dạng thống nhất (#SoTayMay), không để lẫn #SổtayMây với các hashtag không dấu khác.
    if (ascii(body).toLocaleLowerCase('en-US') === ascii(nameKey)) return productTag;
    const plain = /^[\x00-\x7f]+$/.test(body) || body.toLocaleLowerCase('vi-VN') === nameKey ? tag : `#${ascii(body)}`;
    // Hashtag dính liền không viết hoa đầu từ (#Dungcuhoctap) không sửa được bằng code: bỏ và bù bằng hashtag dựng từ nguồn thật.
    return plain.length - 1 > 7 && /^[\x00-\x7f]+$/.test(plain) && !/[A-Z0-9]/.test(plain.slice(2)) ? '' : plain;
  });
  const seen = new Set<string>(), tags: string[] = [];
  const addTag = (tag: string) => { const key = ascii(tag).toLocaleLowerCase('en-US'); if (tag.length > 1 && tag.length <= 32 && !seen.has(key) && tags.length < 5) { seen.add(key); tags.push(tag); } };
  cleanedTags.forEach(addTag);
  const nameWords = ascii(input.productName).split(/\s+/).filter(Boolean);
  [productTag, library.categoryHashtags[category] ?? '', tagOf(brief.audience.label), nameWords.length > 1 ? tagOf(nameWords.slice(0, 2).join(' ')) : ''].filter(tag => tag.length > 1).forEach(addTag);
  if (tags.length === 5 && tags.join('|') !== hashtags.join('|')) { hashtags = tags; fixes.push('hashtag'); }

  // 3) Emoji từng caption.
  captions = captions.map(original => {
    let text = original;
    const used = () => new Set([...text.matchAll(/\p{Extended_Pictographic}/gu)].map(match => match[0]));
    const fresh = () => spare.find(emoji => !used().has(emoji) && !library.forbiddenEmoji.test(emoji) && !(brief.tone.id === 'formal' && library.formalForbiddenEmoji.test(emoji)));
    text = text.split('\n').map(line => (/\u{1F50C}/u.test(line) && /không dây|bluetooth|wireless/i.test(line) ? line.replace(/\u{1F50C}/gu, '📶') : line)).join('\n');
    for (const [emoji] of emojiNeeds) if (emoji.test(text) && missingFactForEmoji(text, input)) text = text.replace(new RegExp(emoji.source, 'gu'), () => fresh() ?? '✨');
    // Chồng CTA (👉💬 hoặc 💬 + 👇): giữ một emoji chỉ hướng, bỏ cái đứng cuối dòng.
    for (let guard = 0; guard < 4 && (text.match(new RegExp(pointer.source, 'gu')) ?? []).length > 1; guard++) {
      const trailing = text.match(/[ \t]*[\u{1F449}\u{1F447}\u{1F4AC}]+[ \t]*$/mu);
      if (!trailing) break;
      const at = text.lastIndexOf(trailing[0]);
      text = text.slice(0, at) + text.slice(at + trailing[0].length);
    }
    // Đầu dòng cùng một emoji (🤲🤲🤲): đổi các dòng sau sang emoji khác đúng chủ đề.
    const seenLeaders = new Set<string>();
    text = text.split('\n').map(line => {
      const match = line.match(leader);
      if (!match || '✔•✅'.includes(match[2])) return line;
      if (!seenLeaders.has(match[2])) { seenLeaders.add(match[2]); return line; }
      const next = fresh();
      if (next) seenLeaders.add(next);
      return next ? line.replace(leader, `$1${next}$3`) : line;
    }).join('\n');
    // Tên sản phẩm lặp thừa ở cuối bài ("… 🎒 Sổ tay Mây"): bỏ lần cuối khi tên đã xuất hiện trước đó.
    const name = escapeRegExp(input.productName);
    if (new RegExp(`${name}[\\s\\S]*[ \\t]${name}[ \\t]*$`, 'u').test(text)) text = text.replace(new RegExp(`[ \\t]+${name}[ \\t]*$`, 'u'), '');
    // Lời thoại mở ngoặc kép mà không đóng: đóng lại cho đúng.
    text = text.split('\n').map(line => { const trimmed = line.trimStart(); return /^["“]/.test(trimmed) && (trimmed.match(/["“”]/g) ?? []).length % 2 === 1 ? `${line}${trimmed.startsWith('“') ? '”' : '"'}` : line; }).join('\n');
    if (text !== original) fixes.push('emoji');
    return text;
  });
  return { output: { captions, headlines, hashtags }, fixes: [...new Set(fixes)] };
}
