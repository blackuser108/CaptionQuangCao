import { count, type Input } from '../content.ts';
import { audienceById, categoryById, ctaById, hookById, library, toneById } from './library.ts';
import { ENGINE_VERSION, type AudienceContext, type CampaignBrief, type CategoryId, type CopyExample, type CtaId, type FeatureAngle, type FeatureKind, type HookId, type ProductContext, type ProductFact, type StrategyId, type StrategyPlan, type ToneProfile } from './types.ts';

const fold = (text: string) => text.normalize('NFC').toLocaleLowerCase('vi-VN');

export function looksLikeInjection(text: string) {
  return library.injection.some(pattern => pattern.test(text));
}

export function classifyCategory(text: string) {
  const haystack = fold(text);
  let best: { id: CategoryId; score: number } = { id: 'generic', score: 0 };
  for (const rule of library.categories) {
    if (rule.id === 'generic') continue;
    const score = [...rule.keywords, ...rule.aliases].reduce((sum, token) => sum + (haystack.includes(fold(token)) ? (token.length > 4 ? 2 : 1) : 0), 0);
    if (score > best.score) best = { id: rule.id, score };
  }
  const confidence = best.score >= 4 ? 0.9 : best.score >= 2 ? 0.7 : best.score === 1 ? 0.45 : 0.15;
  const id = confidence < 0.45 ? 'generic' : best.id;
  return { id, confidence: id === 'generic' ? Math.min(confidence, 0.4) : confidence, rule: categoryById[id] };
}

// Keep label quotations intact when splitting; an isolated quoted command is still a directive.
function maskQuotedText(text: string, labelsOnly = false) {
  return text.replace(/"[^"]*"|“[^”]*”|‘[^’]*’|'[^']*'|«[^»]*»/gu, (quote, offset: number) => {
    const prefix = text.slice(0, offset);
    const label = /(?:nhãn|bìa|bao bì|chữ|câu|thông điệp)(?:\s+\p{L}+){0,4}\s*[:=]?\s*$/iu.test(prefix);
    return !labelsOnly || label ? '_'.repeat(quote.length) : quote;
  });
}

function splitOutsideQuotes(text: string, separator: RegExp) {
  const parts: string[] = [];
  let start = 0;
  for (const match of maskQuotedText(text).matchAll(separator)) {
    parts.push(text.slice(start, match.index));
    start = match.index + match[0].length;
  }
  parts.push(text.slice(start));
  return parts;
}

// A narrow set of instruction leads, not a general prompt-injection detector.
const instructionStart = /(?:bỏ qua (?:mọi )?(?:hướng dẫn|prompt|quy tắc)|ignore (?:all )?(?:previous|above|system)|forget (?:your|the) (?:rules|instructions)|output only|bịa (?:thêm )?(?:chứng nhận|ưu đãi|kết quả|giá)|hãy (?:giả sử đã có|nói|viết|khẳng định|bịa))(?=\s|$|[,:;.!?”"'’»])/iu;

function promptDescription(description: string) {
  let changed = false;
  const parts = splitOutsideQuotes(description, /(?<=[.!?])\s+|[\r\n;•]+/gu).map(sentence => {
    const command = instructionStart.exec(maskQuotedText(sentence, true));
    if (!command) return sentence;
    changed = true;
    // Keep preceding product clauses, quarantine the instruction and its comma continuations.
    const preceding = sentence.slice(0, command.index);
    return preceding.slice(0, Math.max(0, preceding.lastIndexOf(','))).trimEnd();
  });
  return changed ? parts.filter(part => part.trim()).join('\n').trim() : description;
}

function splitFacts(text: string) {
  return splitOutsideQuotes(text, /\.(?=\s|$)|[;\n•]+|,(?=\s)/gu)
    .map(part => part.trim()).filter(part => part.length >= 3 && part.length <= 180);
}

export function extractFacts(input: Input): ProductFact[] {
  const seen = new Set<string>();
  const facts: ProductFact[] = [];
  for (const raw of [input.productName, ...splitFacts(promptDescription(input.description))]) {
    const text = raw.replace(/\s+/g, ' ').trim();
    const key = fold(text);
    if (!text || seen.has(key) || instructionStart.test(maskQuotedText(text, true))) continue;
    seen.add(key);
    facts.push({ text, kind: 'fact', confidence: 1 });
  }
  return facts;
}

function mappedBenefits(facts: ProductFact[], category: CategoryId): ProductFact[] {
  const blob = fold(facts.map(fact => fact.text).join(' '));
  const rules: { test: RegExp; benefit: string; categories?: CategoryId[] }[] = [
    { test: /a5/, benefit: 'Khổ A5 gọn hơn sổ lớn khi ghi và mang theo.', categories: ['stationery'] },
    { test: /80 trang/, benefit: '80 trang cho một khoảng ghi chép kéo dài hơn vài tờ rời.', categories: ['stationery'] },
    { test: /kẻ ngang/, benefit: 'Dòng kẻ ngang giúp viết bài và ghi chú thẳng hàng.', categories: ['stationery'] },
    { test: /ghi chép bài học|ghi bài/, benefit: 'Dùng được cho việc ghi lại bài học, không phải công cụ “học giỏi”.', categories: ['stationery'] },
    { test: /\d+\s*ml/, benefit: 'Dung tích đã nêu giúp hình dung lượng uống một lần.', categories: ['beverage'] },
    { test: /vị|hương/, benefit: 'Hương vị được mô tả là điểm chọn chính, không phải công dụng sức khỏe.', categories: ['beverage'] },
    { test: /thành phần/, benefit: 'Chỉ bàn thành phần đã được nêu, không suy ra kết quả da.', categories: ['cosmetics'] },
    { test: /bluetooth|không dây/, benefit: 'Kết nối không dây theo đúng tính năng đã nêu.', categories: ['electronics'] },
    { test: /lớp|khóa/, benefit: 'Nội dung và nhóm học viên đã mô tả là căn cứ chính.', categories: ['education', 'service'] },
  ];
  return rules.filter(rule => (!rule.categories || rule.categories.includes(category)) && rule.test.test(blob))
    .map(rule => ({ text: rule.benefit, kind: 'inference' as const, confidence: 0.7 }));
}

export function buildProductContext(input: Input): ProductContext {
  const classified = classifyCategory(`${input.productName} ${input.description}`);
  const facts = extractFacts(input);
  const injectionAttempt = looksLikeInjection(`${input.productName}\n${input.description}`);
  const features = facts.map(fact => fact.text);
  const useCases = facts.filter(fact => /dùng|ghi chép|uống|đeo|học|dưỡng|nghe/.test(fold(fact.text))).map(fact => fact.text);
  const benefits = mappedBenefits(facts, classified.id);
  const missing: string[] = [];
  if (classified.id === 'electronics' && !/pin|giờ/.test(fold(input.description))) missing.push('Thời lượng pin chưa được cung cấp.');
  if (classified.id === 'cosmetics' && !/thành phần/.test(fold(input.description))) missing.push('Thành phần chi tiết chưa đủ để nói về da.');
  if (classified.confidence < 0.45) missing.push('Ngành hàng chưa rõ; giữ cách viết generic.');
  if (features.length < 2) missing.push('Mô tả còn ít dữ kiện xác nhận.');
  return {
    name: input.productName,
    category: classified.id,
    categoryLabel: classified.rule.label,
    categoryConfidence: classified.confidence,
    facts, features, benefits, useCases,
    differentiators: features.slice(0, 3),
    motivations: classified.rule.valueAngles,
    objections: classified.rule.unsupportedAssumptions,
    missing,
    injectionAttempt,
  };
}

function labelMatches(haystack: string, label: string) {
  const token = fold(label);
  if (token.length > 3) return haystack.includes(token);
  return new RegExp(`(?<![\\p{L}\\p{N}])${token}(?![\\p{L}\\p{N}])`, 'u').test(haystack);
}

export function buildAudienceContext(input: Input, product: ProductContext): AudienceContext {
  const haystack = fold(input.audience || `${input.productName} ${input.description}`);
  let matched = audienceById.generic;
  let confidence = product.categoryConfidence >= 0.7 ? 0.55 : 0.3;
  for (const profile of library.audiences) {
    if (profile.id === 'generic') continue;
    if (profile.labels.some(label => labelMatches(haystack, label))) {
      matched = profile;
      confidence = input.audience.trim() ? 0.9 : 0.6;
      break;
    }
  }
  if (matched.id === 'generic' && !input.audience.trim()) {
    matched = audienceById[categoryById[product.category].defaultAudienceId] ?? audienceById.generic;
    confidence = product.categoryConfidence >= 0.7 ? 0.55 : 0.3;
  }
  const label = input.audience.trim() || matched.labels[0] || 'Người đọc Feed';
  return {
    id: matched.id, label, confidence, inferred: !input.audience.trim(),
    usageContext: matched.usageContext, needs: matched.needs, painPoints: matched.painPoints,
    motivations: matched.motivations, objections: matched.objections, selectionCriteria: matched.selectionCriteria,
    languagePatterns: matched.languagePatterns, avoidPhrases: matched.avoidPhrases, priorityBenefits: matched.priorityBenefits,
  };
}

const edge = (source: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');
const featureRules: { kind: FeatureKind; test: RegExp; soWhat: string }[] = [
  { kind: 'connect', test: /bluetooth|không dây|usb|type-c|wifi|sạc/i, soWhat: 'Kết nối → kể bằng việc người dùng KHÔNG còn phải làm (gỡ dây, cắm, chờ) hoặc làm được ở đâu, lúc nào; không thêm thông số.' },
  { kind: 'quantity', test: /\d+\s*(trang|cây|chiếc|cái|gói|viên|món|buổi|bài|hộp|bộ|màu|size|tuần|tháng|giờ)/i, soWhat: 'Con số → hình dung cụ thể: đủ cho việc gì, chia cho ai, dùng qua mấy lần; chỉ dùng chính con số đã có.' },
  { kind: 'volume', test: /\d+([.,]\d+)?\s*(ml|lít|kg|gam|g|l)(?![\p{L}\p{N}])/iu, soWhat: 'Dung tích/khối lượng → cảm giác cầm, mang, uống/dùng một lần; không quy ra số khác.' },
  { kind: 'size', test: new RegExp(`${edge('a[3-7]').source}|\\d+\\s*(cm|mm|inch)|khổ|kích thước|nhỏ gọn|${edge('form|dáng').source}`, 'iu'), soWhat: 'Kích thước/khổ/dáng → bỏ vừa đâu (cặp, túi, bàn), cầm hoặc mặc ra sao.' },
  { kind: 'sensory', test: new RegExp(`${edge('vị').source}|hương|thơm|giòn|ngọt|đậm|béo|chua`, 'iu'), soWhat: 'Vị/hương → tả bằng giác quan trong khoảnh khắc thưởng thức; không nâng thành công dụng sức khỏe.' },
  { kind: 'material', test: new RegExp(`cotton|(?<!vị )vải|gỗ|tre|thủy tinh|nhựa|inox|kim loại|giấy|len|lụa|sứ|gốm|${edge('da').source}`, 'iu'), soWhat: 'Chất liệu → cảm giác chạm/nhìn/đặt xuống; chỉ tả điều gắn với chất liệu đã nêu, không khen độ bền.' },
  { kind: 'ingredient', test: /thành phần|chứa|chiết xuất|glycerin|jojoba|shea|vitamin|bơ|collagen|axit/i, soWhat: 'Thành phần → nêu tên thành phần và vai trò chung của nhóm sản phẩm; không hứa kết quả trên da hay sức khỏe.' },
  { kind: 'look', test: new RegExp(`màu|xanh|đỏ|đen|trắng|hồng|nâu|vàng|họa tiết|bìa|${edge('be').source}`, 'iu'), soWhat: 'Màu/kiểu → gắn với việc chọn, phối, đặt lên bàn; để người đọc tự hình dung gu của mình.' },
  { kind: 'format', test: /lớp|buổi|sáng|tối|cuối tuần|trực tiếp|online|lịch|khóa/i, soWhat: 'Hình thức/lịch → nói bằng thời điểm trong tuần/ngày của người đọc: ai hợp, ngày nào, học/dùng thế nào.' },
];

export function buildFeatureAngles(product: ProductContext): FeatureAngle[] {
  const angles: FeatureAngle[] = [];
  for (const fact of product.facts) {
    if (fact.text === product.name || count(fact.text) < 4) continue;
    const rule = featureRules.find(item => item.test.test(fact.text));
    angles.push(rule
      ? { fact: fact.text, kind: rule.kind, soWhat: rule.soWhat }
      : { fact: fact.text, kind: 'other', soWhat: 'Đặc điểm → trả lời "nên người dùng làm được/cảm thấy gì?" bằng một hình ảnh cụ thể, không thêm tính chất mới.' });
    if (angles.length === 6) break;
  }
  return angles;
}

// RNG có seed: cùng seed → cùng kết quả (test được); mỗi lần "Tạo lại" server truyền seed mới → hook/CTA/ví dụ khác.
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const strategyOrder: StrategyId[] = ['benefit-led', 'audience-led', 'story-led'];
const preferredHooks: Record<StrategyId, HookId[]> = {
  'benefit-led': ['rhythm', 'number-fact', 'micro-promise', 'contrast', 'call-out', 'confession'],
  'audience-led': ['pain-question', 'call-out', 'confession', 'pov', 'curiosity', 'contrast'],
  'story-led': ['scene', 'pov', 'permission', 'curiosity', 'confession', 'contrast'],
};
const preferredCtas: Record<StrategyId, CtaId[]> = {
  'benefit-led': ['see', 'tag', 'save', 'choose'],
  'audience-led': ['inbox', 'comment', 'see', 'save'],
  'story-led': ['comment', 'save', 'tag', 'choose', 'inbox'],
};

function pickDistinct<T extends string>(candidates: T[], used: Set<T>, random: () => number): T {
  const fresh = candidates.filter(item => !used.has(item));
  const pool = fresh.length ? fresh : candidates;
  const choice = pool[Math.floor(random() * pool.length)];
  used.add(choice);
  return choice;
}

function planStrategies(product: ProductContext, audience: AudienceContext, tone: ToneProfile, random: () => number): StrategyPlan[] {
  const hasDigit = product.facts.some(fact => /\d/.test(fact.text));
  const allowedHooks = tone.allowedHooks.filter(id => !hookById[id].needsDigitFact || hasDigit);
  const usedHooks = new Set<HookId>(), usedCtas = new Set<CtaId>();
  const angles: Record<StrategyId, { goal: string; angle: string }> = {
    'benefit-led': { goal: 'Ngắn, sắc, đứng một mình được: MỘT ý duy nhất khiến người đang lướt dừng lại.', angle: product.benefits[0]?.text || audience.priorityBenefits[0] || 'Một đặc điểm thật dịch thành điều người đọc làm được.' },
    'audience-led': { goal: 'Khiến người đọc thấy "đúng mình" rồi dẫn tự nhiên tới sản phẩm (PAS).', angle: audience.painPoints[0] || audience.needs[0] },
    'story-led': { goal: 'Kéo người đọc vào một cảnh cụ thể để sản phẩm xuất hiện đúng lúc, không như catalog.', angle: product.useCases[0] || audience.usageContext[0] },
  };
  return strategyOrder.map((id, index) => {
    const hookPool = preferredHooks[id].filter(item => allowedHooks.includes(item));
    const hook = hookById[pickDistinct(hookPool.length ? hookPool : allowedHooks, usedHooks, random)];
    const ctaPool = preferredCtas[id].filter(item => tone.allowedCtas.includes(item));
    const cta = ctaById[pickDistinct(ctaPool.length ? ctaPool : tone.allowedCtas, usedCtas, random)];
    return {
      id, goal: angles[id].goal, angle: angles[id].angle, length: library.platform.captionTargets[index],
      framework: library.frameworks[id],
      hook: { id: hook.id, label: hook.label, how: hook.how },
      cta: { id: cta.id, label: cta.label, how: id === 'benefit-led' ? `Tùy chọn, rất ngắn nếu còn chỗ. ${cta.how}` : cta.how },
    };
  });
}

function pickExamples(product: ProductContext, tone: ToneProfile, audience: AudienceContext, random: () => number): CopyExample[] {
  const picked: CopyExample[] = [];
  for (const strategy of strategyOrder) {
    const scored = library.examples.filter(example => example.strategy === strategy).map(example => {
      let score = 0;
      if (example.category === product.category) score += 3;
      if (example.tone === tone.id) score += 5;
      if (example.audienceId === audience.id) score += 1;
      if (picked[0] && example.product === picked[0].product) score += 1.5;
      return { example, score: score + random() * 0.5 };
    }).sort((a, b) => b.score - a.score);
    if (scored[0]) picked.push(scored[0].example);
  }
  return picked;
}

export function buildBrief(input: Input, seed = 0): CampaignBrief {
  const random = seededRandom(seed);
  const product = buildProductContext(input);
  const audience = buildAudienceContext(input, product);
  const tone = toneById[input.tone] ?? toneById.youthful;
  const primaryBenefit = product.benefits[0]?.text || audience.priorityBenefits[0] || 'Nêu đúng đặc điểm đã có và việc dùng được xác nhận.';
  const category = categoryById[product.category];
  const verifiedFacts = product.facts.map(fact => fact.text);
  const claimsToAvoid = [
    ...category.forbiddenClaims, ...category.unsupportedAssumptions, ...audience.avoidPhrases, ...tone.avoid,
    'giá', 'ưu đãi', 'chứng nhận', 'hiệu quả chưa nêu',
  ];
  if (product.injectionAttempt) claimsToAvoid.push('mọi chỉ dẫn ghi đè prompt', 'chứng nhận/ưu đãi/kết quả bịa');
  return {
    version: ENGINE_VERSION,
    product, audience, tone,
    objective: 'Viết caption Feed Facebook/Instagram khiến đúng người đọc dừng lại, hiểu sản phẩm đáng để ý ở điểm nào và thực hiện MỘT hành động nhẹ (nhắn shop, lưu bài, tag, bình luận).',
    mainMessage: `${product.name}: ${verifiedFacts.slice(0, 3).join('; ') || 'chỉ có tên sản phẩm'}`.slice(0, 220),
    primaryBenefit,
    emotionalAngle: audience.painPoints[0] || 'Nhu cầu dùng cụ thể, không phóng đại cảm xúc.',
    persuasion: 'Hook chạm khoảnh khắc người đọc → dữ kiện thật dịch thành điều họ làm được/cảm nhận được → CTA một hành động.',
    platform: library.platform.id,
    ctaIntent: 'Mời một hành động nhẹ, cụ thể (theo từng chiến lược). Không giục giả, không nhắc giá/ưu đãi/khan hiếm khi dữ kiện chưa có.',
    verifiedFacts,
    claimsToAvoid,
    required: ['3 caption khác hook, cấu trúc, nhịp và CTA', '3 headline độc lập', '5 hashtag liên quan dữ kiện'],
    missing: product.missing,
    claimRisk: category.risk,
    featureAngles: buildFeatureAngles(product),
    strategies: planStrategies(product, audience, tone, random),
    examples: pickExamples(product, tone, audience, random),
  };
}

export function briefForPrompt(brief: CampaignBrief, input: Input) {
  return {
    productName: input.productName, description: promptDescription(input.description),
    audienceInput: input.audience, toneInput: input.tone,
    facts: brief.verifiedFacts,
    tone: { id: brief.tone.id, voice: brief.tone.voice, devices: brief.tone.devices, emojiPolicy: brief.tone.emojiPolicy },
    strategies: brief.strategies.map(({ id, length, hook }) => ({ id, length, hook: hook.id })),
    limits: { captionChars: library.platform.captionTargets, openingMax: 115, headlineMax: 40 },
  };
}
