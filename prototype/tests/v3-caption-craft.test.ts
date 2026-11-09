import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrief, scoreOutput } from '../lib/engine/index.ts';
import { headlineOk, normalizeHashtag } from '../lib/engine/agents.ts';
import { clicheHits, emojiCountOf, emojiProblems, hashtagProblems, hookStrength, repeatedMotifs } from '../lib/engine/quality.ts';
import { scoreCandidate } from '../lib/engine/select.ts';
import { getSample } from '../lib/samples.ts';
import { buildAudienceContext, buildFeatureAngles, buildProductContext } from '../lib/engine/context.ts';
import { library } from '../lib/engine/library.ts';
import { count, openingCount, type Input, type Output } from '../lib/content.ts';
import { sampleInput } from '../lib/samples.ts';

const strategyIndex = { 'benefit-led': 0, 'audience-led': 1, 'story-led': 2 } as const;
const input = (tone: string, extra: Partial<Input> = {}): Input => ({ ...sampleInput, tone, ...extra });
const set = (captions: string[]): Output => ({ captions, headlines: ['Một', 'Hai', 'Ba'], hashtags: ['#Mot', '#Hai', '#Ba', '#Bon', '#Nam'] });

test('brief is deterministic per seed and varies across seeds (so "Tạo lại" gives new angles)', () => {
  const plan = (seed: number) => buildBrief(input('youthful'), seed).strategies.map(item => `${item.hook.id}/${item.cta.id}`).join('|');
  assert.equal(plan(5), plan(5));
  assert.ok(new Set(Array.from({ length: 12 }, (_, seed) => plan(seed))).size >= 4);
});

test('each strategy gets a distinct hook and CTA that the tone allows', () => {
  for (const tone of library.tones) for (let seed = 0; seed < 25; seed++) {
    const brief = buildBrief(input(tone.id), seed);
    assert.equal(new Set(brief.strategies.map(item => item.hook.id)).size, 3);
    assert.equal(new Set(brief.strategies.map(item => item.cta.id)).size, 3);
    for (const item of brief.strategies) {
      assert.ok(tone.allowedHooks.includes(item.hook.id), `${tone.id} must not get hook ${item.hook.id}`);
      assert.ok(tone.allowedCtas.includes(item.cta.id), `${tone.id} must not get CTA ${item.cta.id}`);
      assert.ok(item.framework.length > 40);
    }
  }
  for (let seed = 0; seed < 25; seed++) {
    const ids = buildBrief(input('formal'), seed).strategies.flatMap(item => [item.hook.id, item.cta.id]);
    assert.ok(!ids.includes('pov') && !ids.includes('tag'));
  }
});

test('number-fact hook is only offered when the facts contain a digit', () => {
  const noDigits: Input = { productName: 'Bình Thanh', description: 'Bình thủy tinh có nắp tre.', audience: 'Người đi làm', tone: 'formal' };
  for (let seed = 0; seed < 40; seed++) assert.ok(!buildBrief(noDigits, seed).strategies.some(item => item.hook.id === 'number-fact'));
  assert.ok(Array.from({ length: 40 }, (_, seed) => buildBrief(input('formal'), seed)).some(brief => brief.strategies.some(item => item.hook.id === 'number-fact')));
});

test('few-shot examples follow the requested tone and cover all three strategies', () => {
  for (const tone of library.tones) {
    const brief = buildBrief(input(tone.id));
    assert.deepEqual(brief.examples.map(item => item.strategy), ['benefit-led', 'audience-led', 'story-led']);
    assert.ok(brief.examples.filter(item => item.tone === tone.id).length >= 2, `${tone.id} should be mostly shown in its own tone`);
  }
});

test('library examples obey the same rules the model is told to follow', () => {
  for (const example of library.examples) {
    const [min, max] = library.platform.captionTargets[strategyIndex[example.strategy]];
    const lowered = example.caption.toLocaleLowerCase('vi-VN'), facts = example.facts.toLocaleLowerCase('vi-VN');
    assert.ok(count(example.caption) >= min && count(example.caption) <= max, `${example.id} length ${count(example.caption)} outside ${min}-${max}`);
    assert.ok(openingCount(example.caption) <= library.platform.openingMax, `${example.id} opening too long`);
    assert.deepEqual(library.unsafeClaims.filter(pattern => pattern.test(lowered) && !pattern.test(facts)), [], `${example.id} invents a claim`);
    assert.deepEqual(library.cliches.filter(phrase => lowered.includes(phrase)), [], `${example.id} uses a cliché`);
    const emojis = emojiCountOf(example.caption);
    const tone = library.tones.find(item => item.id === example.tone)!;
    assert.ok(emojis <= tone.emojiMax, `${example.id} has ${emojis} emoji`);
    assert.ok(!library.forbiddenEmoji.test(example.caption), `${example.id} uses an emoji that implies an unverified claim`);
    if (example.tone === 'formal') assert.ok(!library.formalForbiddenEmoji.test(example.caption), `${example.id} uses a non-formal emoji`);
    if (example.strategy !== 'benefit-led') assert.ok(emojis >= 2, `${example.id} should show emoji roles (anchor + CTA arrow)`);
  }
  assert.equal(new Set(library.examples.map(item => item.id)).size, library.examples.length);
});

test('feature angles turn raw facts into prompts for benefits without adding facts', () => {
  const angles = buildFeatureAngles(buildProductContext(sampleInput));
  const kinds = Object.fromEntries(angles.map(item => [item.fact, item.kind]));
  assert.equal(kinds['Sổ tay khổ A5'], 'size');
  assert.equal(kinds['80 trang kẻ ngang'], 'quantity');
  assert.equal(kinds['bìa màu xanh'], 'look');
  assert.ok(angles.every(item => item.soWhat.length > 20));
  assert.ok(!angles.some(item => item.fact === sampleInput.productName));
  const drink = buildFeatureAngles(buildProductContext({ productName: 'Trà vải Mây', description: 'Trà trái cây vị vải, chai 350 ml.', audience: 'Người uống trà', tone: 'youthful' }));
  assert.ok(drink.some(item => item.kind === 'sensory') && drink.some(item => item.kind === 'volume'));
});

test('audience matching understands new profiles and short labels need whole words', () => {
  const context = (audience: string) => buildAudienceContext({ ...sampleInput, audience }, buildProductContext(sampleInput));
  assert.equal(context('Phụ nữ 25–35 tuổi').id, 'women');
  assert.equal(context('Người mới bắt đầu học lập trình').id, 'beginners');
  assert.equal(context('Người uống trà').id, 'foodies');
  assert.notEqual(context('Các bạn trẻ yêu nhạc').id, 'parents');
});

test('risk level follows the category', () => {
  assert.equal(buildBrief(sampleInput).claimRisk, 'low');
  assert.equal(buildBrief({ productName: 'Kem dưỡng Ban', description: 'Kem dưỡng có glycerin.', audience: 'Phụ nữ', tone: 'formal' }).claimRisk, 'high');
});

test('scorer catches capitalized invented claims (case bug) and weak catalog-style openings', () => {
  const brief = buildBrief(sampleInput);
  const capital = scoreOutput(set(['Sổ tay Mây. Chứng Nhận ISO 9001 cho học sinh.', 'Bạn ơi?\n\nSổ tay Mây. Nhắn shop nhé.', 'Tối nay\n\nSổ tay Mây. Kể nhé.']), sampleInput, brief);
  assert.ok(capital.issues.some(issue => issue.code === 'unsupported-claim' && issue.hard));
  const weak = scoreOutput(set([
    'Sổ tay Mây khổ A5, 80 trang kẻ ngang dành cho sinh viên ghi bài mỗi ngày.',
    'Giới thiệu sổ tay Mây khổ A5 với 80 trang kẻ ngang, bìa xanh, dùng ghi chép bài học trên lớp mỗi ngày.',
    'Sản phẩm sổ tay Mây gồm 80 trang kẻ ngang, khổ A5, bìa màu xanh, dùng để ghi chép bài học.',
  ]), sampleInput, brief);
  assert.ok(weak.issues.some(issue => issue.code === 'weak-hook'));
  assert.ok(weak.issues.some(issue => issue.code === 'no-cta'));
  assert.ok(weak.dimensions.hook < 1 && weak.dimensions.engagement < 1);
});

test('scorer flags filler adjectives, emoji overload and missing story scene; fake urgency still penalized', () => {
  const brief = buildBrief(sampleInput);
  const filler = scoreOutput(set([
    'Sổ tay Mây tiện lợi, chất lượng, tuyệt vời cho bạn 😀😀😀😀😀😀😀😀',
    'Bạn ơi, sổ hoàn hảo?\n\nSổ tay Mây tiện lợi và chất lượng. Nhắn shop nhé.',
    'Sổ tay Mây độc đáo.\n\nRất tối ưu cho bạn. Kể cho mình nhé.',
  ]), sampleInput, brief);
  for (const code of ['filler', 'emoji-excess', 'no-scene']) assert.ok(filler.issues.some(issue => issue.code === code), code);
  const urgent = scoreOutput(set(['Sổ tay Mây A5 cho bạn.', 'Bạn ơi?\n\nSổ tay Mây, nhanh tay nhé, nhắn shop.', 'Sáng nay\n\nSổ tay Mây, bình luận nhé.']), sampleInput, brief);
  assert.ok(urgent.issues.some(issue => issue.code === 'cta'));
});

test('a well-crafted set scores clean on every structural rule', () => {
  const brief = buildBrief(sampleInput);
  const good = set([
    'Giấy rời hay bay mất đúng lúc cần. Sổ tay Mây khổ A5, 80 trang kẻ ngang: bài học ở yên một chỗ 💙',
    'Thầy đọc nhanh, tay chép chưa xong, tờ ghi chú thì đã lạc đâu mất?\n\nSổ tay Mây khổ A5 có 80 trang kẻ ngang, bìa màu xanh. Chép bài, gạch ý chính, ôn lại cuối tuần đều nằm gọn trong một cuốn.\n\n👉 Đang chọn sổ cho kỳ học mới? Nhắn shop để hỏi thêm nha 📒',
    'Tiết cuối buổi chiều, tay mỏi, bài còn dang dở.\n\nTrong cặp có một cuốn sổ tay Mây:\n✔ Khổ A5 — bỏ vừa cặp\n✔ 80 trang kẻ ngang — chữ thẳng hàng, dễ đọc lại khi ôn\n✔ Bìa màu xanh — nhìn là nhận ra\n\nChép xong thì gập lại, cất vào cặp, không phải đi gom từng tờ lẻ nữa.\n\nBạn thường chép bài vào sổ hay mấy tờ lẻ? Kể ở bình luận nha 📘',
  ]);
  const report = scoreOutput(good, sampleInput, brief);
  assert.equal(report.pass, true);
  assert.deepEqual(report.issues, []);
});

test('formal tone keeps emoji as information anchors, but rejects faces, hearts and exclamations', () => {
  const brief = buildBrief(input('formal'));
  assert.ok(brief.tone.emojiMax >= 3, 'formal must be allowed real emoji');
  const anchored = 'Sổ tay Mây khổ A5, 80 trang kẻ ngang:\n✔ Khổ A5 — bỏ vừa cặp\n✔ 80 trang kẻ ngang\n\n💬 Nhắn shop để hỏi thêm.';
  assert.deepEqual(emojiProblems(anchored, 1, sampleInput, brief), []);
  const codes = (text: string) => emojiProblems(text, 1, sampleInput, brief).map(item => item.code);
  assert.ok(codes('Sổ tay Mây thật tuyệt 😍 ❤️ nhắn shop 👉').includes('emoji-tone'));
  assert.ok(codes('Sổ tay Mây ‼️ nhắn shop 👉').includes('emoji-claim'));
});

test('emoji that silently invent a price, hot-seller, ranking, urgency or health claim are flagged unless the source has them', () => {
  const brief = buildBrief(input('youthful'));
  const flagged = (text: string, source = sampleInput) => emojiProblems(text, 1, source, brief).some(item => item.code === 'emoji-claim');
  for (const bad of ['🎁', '🆓', '💰', '🏷️', '🔥', '⭐', '🏆', '💯', '🥇', '⏳', '🚨', '⚠️', '💊', '🩺', '💪']) assert.ok(flagged(`Sổ tay Mây ${bad} nhắn shop 👉`), bad);
  for (const good of ['✔', '✨', '💬', '👉', '👇']) assert.ok(!flagged(`Sổ tay Mây ${good} nhắn shop`), good);
  // 📍 ⏰ 📅 📞 chỉ hợp lệ khi dữ kiện có địa điểm, giờ/lịch, số liên hệ
  for (const needy of ['📍', '⏰', '📅', '📞']) assert.ok(flagged(`Sổ tay Mây ${needy} khổ A5`), `${needy} without matching fact`);
  const withFacts = { ...sampleInput, description: `${sampleInput.description} Địa chỉ 12 Trần Phú, mở 7:30–15:00 thứ Bảy, hotline 0901234567.` };
  for (const ok of ['📍', '⏰', '📅', '📞']) assert.ok(!flagged(`Sổ tay Mây ${ok} nhắn shop`, withFacts), `${ok} with matching fact`);
  assert.ok(!flagged('Sổ tay Mây 🔥 nhắn shop', { ...sampleInput, description: `${sampleInput.description} 🔥` }));
});

test('longer captions that carry no emoji are nudged, chains and hype openers are flagged, caption 1 may stay clean', () => {
  const brief = buildBrief(input('youthful'));
  const codes = (text: string, slot: number) => emojiProblems(text, slot, sampleInput, brief).map(item => item.code);
  assert.ok(codes('Bạn ơi, sổ tay Mây khổ A5.\n\nNhắn shop nha.', 1).includes('emoji-missing'));
  assert.ok(!codes('Giấy rời hay bay mất đúng lúc cần.', 0).includes('emoji-missing'));
  assert.ok(codes('Sổ tay Mây khổ A5 😍😍 nhắn shop', 1).includes('emoji-style'));
  assert.ok(codes('🎉 Sổ tay Mây khổ A5 nhắn shop', 1).includes('emoji-style'));
  assert.ok(!codes('✔ Khổ A5\n✔ 80 trang', 1).includes('emoji-style'), 'anchors on separate lines are not a chain');
});

test('an emoji that opens the caption does not weaken the hook or inflate opening overlap', () => {
  assert.equal(hookStrength('☕ Chiều muộn, bạn cần một ly?', 1, 'Cold brew'), hookStrength('Chiều muộn, bạn cần một ly?', 1, 'Cold brew'));
  const brief = buildBrief(input('youthful'));
  const withEmoji = scoreCandidate('🏫 Sáng thứ Hai, bạn mở cặp ra.\n\n✔ Sổ tay Mây khổ A5\n✔ 80 trang kẻ ngang\n\n👉 Nhắn shop để hỏi thêm nha, bạn ơi, nhắn cho mình biết bạn thích bìa màu nào để mình tư vấn.', 1, sampleInput, brief);
  assert.ok(!withEmoji.issues.includes('weak-hook'));
});

test('headlines allow one emoji at most and hashtags allow none', () => {
  assert.equal(headlineOk('Sổ tay Mây khổ A5 ✨', sampleInput), true);
  assert.equal(headlineOk('Sổ tay Mây ✨ khổ A5 ✨', sampleInput), false);
  assert.equal(headlineOk('Sổ tay Mây giá sốc 🏷️', sampleInput), false);
  assert.equal(normalizeHashtag('#SoTayMay'), '#SoTayMay');
  assert.equal(normalizeHashtag('#SoTayMay🔥'), '');
});

test('three captions that share one emotional phrase are flagged, product words and function words are not', () => {
  const brief = buildBrief(sampleInput);
  const shared = set([
    'Món này làm mình tò mò mấy hôm nay 😅',
    'Ai cũng tò mò cái tên, nên mình cũng tò mò theo.\n\n👉 Kể mình nghe nhé 💬',
    'Chiều chủ nhật, cả nhà tò mò hộp mới.\n\n📓 Sổ tay Mây khổ A5\n✔ 80 trang kẻ ngang 👀',
  ]);
  assert.ok(scoreOutput(shared, sampleInput, brief).issues.some(item => item.code === 'repeated-motif'));
  assert.ok(scoreOutput(shared, sampleInput, brief).issues.some(item => item.code === 'cliche'), 'tò mò is now a cliché backbone');
  assert.deepEqual(repeatedMotifs(['Sổ tay Mây khổ A5 cho bạn', 'Sổ tay Mây khổ A5 và 80 trang kẻ ngang'], sampleInput), []);
});

test('bullet lines that only repeat the product name or list nothing real are flagged', () => {
  const thin = { ...sampleInput, productName: 'Sẽ toi cho mọi nhà', description: 'món lạ' };
  const brief = buildBrief(thin);
  const codes = (text: string) => emojiProblems(text, 2, thin, brief).map(item => item.code);
  assert.ok(codes('Chiều chủ nhật yên tĩnh.\n\n✔ Sẽ toi\n✔ Sẽ toi cho mọi nhà — đứng trong phòng khách\n\n💬 Kể mình nghe nhé').includes('bullet-empty'));
  assert.ok(!codes('Chiều chủ nhật yên tĩnh, tiếng mở hộp nghe là biết.\n\n💬 Kể mình nghe nhé').includes('bullet-empty'));
});

test('prompt JSON carries factDensity and an emoji kit matched to category and tone', async () => {
  const { briefForPrompt } = await import('../lib/engine/context.ts');
  const thin = { ...sampleInput, productName: 'Sẽ toi cho mọi nhà', description: 'Sản phẩm mới, rất độc đáo, phù hợp cho mọi nhà.' };
  assert.equal((briefForPrompt(buildBrief(thin), thin) as any).product.factDensity, 'thin');
  const rich = briefForPrompt(buildBrief(sampleInput), sampleInput) as any;
  assert.equal(rich.product.factDensity, 'ok');
  assert.ok(rich.emojiKit.theme.length >= 4 && rich.emojiKit.reactions.length >= 1 && rich.emojiKit.pointers.includes('👉'));
  const formal = briefForPrompt(buildBrief(input('formal')), input('formal')) as any;
  assert.ok(formal.emojiKit.reactions.every((item: string) => !library.formalForbiddenEmoji.test(item)));
});

test('pickDistinct prefers a candidate that does not repeat an emotional phrase already used, and the failing gate triggers repair', async () => {
  const { pickDistinct } = await import('../lib/engine/select.ts');
  const picked = pickDistinct([
    [{ index: 0, text: 'Cả nhà tò mò hộp mới, đứng nhìn mãi 😅', score: 0.9 }],
    [{ index: 0, text: 'Ai cũng tò mò hộp mới nên mình hỏi luôn 👉', score: 0.95 }, { index: 1, text: 'Hộp xếp gọn trên kệ, mở ra là thấy ngay 📦', score: 0.8 }],
  ], 0.5, sampleInput);
  assert.equal(picked[1].index, 1);
  const bad = set([
    'Lướt feed thấy cái tên này là dừng lại liền á.',
    'Chắc bạn cũng đang tò mò cái tên.\n\n✔ Sổ tay Mây\n💬 Nhắn shop nhé.',
    'Chiều chủ nhật, cả nhà tò mò cái tên này.\n\nTag bạn vào xem nhé.',
  ]);
  assert.equal(scoreOutput(bad, sampleInput, buildBrief(sampleInput)).pass, false);
});

test('detail coach rates the description and suggests only the kinds of detail still missing', async () => {
  const { detailCoach, splitFacts, substantiveFacts } = await import('../lib/detail.ts');
  assert.equal(detailCoach('Sẽ toi cho mọi nhà', '').level, 'empty');
  const thin = detailCoach('Sẽ toi cho mọi nhà', 'Sản phẩm mới, rất độc đáo, phù hợp cho mọi nhà.');
  assert.equal(thin.level, 'thin');
  assert.ok(thin.prompts.length >= 3 && thin.prompts.length <= 4);
  const ok = detailCoach('Sổ tay Mây', 'Khổ A5, 80 trang kẻ ngang, bìa màu xanh.');
  assert.equal(ok.level, 'ok');
  assert.ok(!ok.prompts.some(item => item.id === 'size' || item.id === 'look'), 'size and colour already given');
  const rich = detailCoach('Sổ tay Mây', 'Khổ A5.\nBìa màu xanh, gáy lò xo.\n80 trang kẻ ngang.\nDùng để ghi bài trên lớp.');
  assert.equal(rich.level, 'rich');
  assert.deepEqual(rich.prompts, []);
  // nhãn bỏ trống do nút gợi ý chèn vào không được tính là dữ kiện
  assert.deepEqual(splitFacts('Khổ A5\nKích thước: \nDùng khi: '), ['Khổ A5']);
  assert.deepEqual(substantiveFacts(['Sổ tay Mây', 'rất độc đáo', 'Khổ A5'], 'Sổ tay Mây'), ['Khổ A5']);
});

test('mangled product names are caught in captions and hashtags, but ordinary look-alike phrases are not', async () => {
  const { nameTypos } = await import('../lib/engine/quality.ts');
  const ielts = 'Lớp IELTS Cuối Tuần';
  assert.deepEqual(nameTypos(['Lớp IELTS Cuối Tuần giữ nhịp học.'], ielts), []);
  assert.ok(nameTypos(['Lớp IELTS Cuottuần giữ nhịp học.'], ielts).length > 0);
  assert.ok(nameTypos(['#LopIELSTCuoiTuan'], ielts).length > 0);
  assert.deepEqual(nameTypos(['#LopIELTSCuoiTuan', '#HocIELTS'], ielts), []);
  assert.ok(nameTypos(['Sổ tay Máy rất gọn.'], 'Sổ tay Mây').length > 0);
  assert.deepEqual(nameTypos(['Bạn thường chép bài vào sổ hay mấy tờ lẻ?'], 'Sổ tay Mây'), []);
  assert.deepEqual(nameTypos(['sổ tay mây khổ A5'], 'Sổ tay Mây'), []);
});

test('repeated bullet emoji, claim-like source-less claims and double CTAs from the real comparison run are flagged', async () => {
  const cream = { ...sampleInput, productName: 'Kem dưỡng Bơ Mộc', description: 'Kem dưỡng ẩm hũ 50g, thành phần có bơ hạt mỡ và glycerin, mùi hương nhẹ.', tone: 'formal' };
  const brief = buildBrief(cream);
  const codes = (text: string, slot = 2) => emojiProblems(text, slot, cream, brief).map(item => item.code);
  assert.ok(codes('Buổi tối.\n\nKem dưỡng Bơ Mộc mang theo:\n🤲 Hũ 50g vừa tay\n🤲 Thành phần bơ hạt mỡ và glycerin\n🤲 Mùi hương nhẹ\n\n📌 Lưu bài.').includes('emoji-monotone'));
  assert.ok(!codes('Buổi tối.\n\nKem dưỡng Bơ Mộc mang theo:\n📏 Hũ 50g vừa tay\n🧴 Thành phần bơ hạt mỡ và glycerin\n🫧 Mùi hương nhẹ').includes('emoji-monotone'));
  assert.ok(codes('Tối nay.\n\n📍 Hũ 50g vừa tay\n\nNhắn tin 👉💬').includes('emoji-claim'));
  assert.ok(codes('Nhắn tin 👉 rồi bình luận 💬').includes('emoji-style'));
  const { claimUnsupported } = await import('../lib/engine/quality.ts');
  assert.ok(claimUnsupported('Mùi hương nhẹ tự nhiên cho buổi tối nhé bạn ơi', cream).length > 0);
  assert.equal(claimUnsupported('Bạn nói chuyện tự nhiên hơn khi có một hũ nhỏ trên bàn mỗi tối', cream).length, 0);
});

test('hook and CTA instructions carry no quotable sample sentence the model can copy across products', () => {
  for (const id of ['tiny-list', 'whisper', 'dialogue']) {
    const how = library.hooks.find(item => item.id === id)!.how;
    assert.ok(!/Cặp của bạn luôn có|Nói nhỏ nghe nè|Chuyện là/.test(how), `${id} still ships a copyable opener`);
  }
  assert.ok(!/Team ☕/.test(library.ctas.find(item => item.id === 'react')!.how));
  for (const frame of ['luôn có:', 'đó là lúc', 'cho đến khi', 'thả emoji bên dưới', 'xem thêm tại đây']) assert.ok(library.cliches.includes(frame), frame);
  assert.ok(clicheHits('Cặp của bạn luôn có: bút. Đó là lúc cần sổ.').length >= 2);
  for (const example of library.examples) assert.equal(clicheHits(example.caption).length, 0, `${example.id} uses a banned stock frame`);
});

test('hashtags that leak the tone name, mix diacritics or lack word capitals are flagged; product-name tags keep their diacritics', () => {
  assert.ok(hashtagProblems(['#Youthful'], sampleInput).length === 1);
  assert.ok(hashtagProblems(['#Humorous', '#TrẻTrung'], sampleInput).length === 2);
  assert.ok(hashtagProblems(['#Đồdùngvănhòng', '#Dụngcụhọctập'], sampleInput).length === 2);
  assert.ok(hashtagProblems(['#Sinhvien', '#Ghichepbai'], sampleInput).length === 2);
  assert.deepEqual(hashtagProblems(['#DoDungHocTap', '#SoTayMay', '#SinhVien', '#GhiChep', '#HocSinh'], sampleInput), []);
  assert.deepEqual(hashtagProblems(['#SổTayMây'], sampleInput), [], 'product name tag with correct diacritics');
});

test('a wireless line led by the plug emoji is flagged, and two stock frames in one output force a repair', () => {
  const brief = buildBrief(input('youthful'));
  assert.ok(emojiProblems('Tai nghe Gió\n🔌 Kết nối Bluetooth không dây', 1, sampleInput, brief).some(item => item.code === 'emoji-claim'));
  assert.ok(!emojiProblems('Tai nghe Gió\n📶 Kết nối Bluetooth không dây', 1, sampleInput, brief).some(item => item.code === 'emoji-claim'));
  const heavy = set(['Sổ tay Mây khổ A5 gọn nhẹ 📓', 'Chuyện cũ.\n\nSổ tay Mây có khổ A5.\n\n💬 Nhắn shop nhé 📒', 'Đó là lúc có Sổ tay Mây, cho đến khi mọi thứ ở yên một chỗ.\n\n📏 Khổ A5\n📝 80 trang kẻ ngang\n\n👉 Kể ở bình luận nha 📘']);
  const report = scoreOutput(heavy, sampleInput, brief);
  assert.ok(report.issues.some(item => item.code === 'cliche-heavy'));
  assert.equal(report.pass, false);
});

test('every brief hands out three different layouts, at most one list, scenes without clock times, and no list when facts are thin', () => {
  for (const tone of ['youthful', 'formal', 'humorous']) for (let seed = 1; seed <= 40; seed++) {
    const brief = buildBrief(input(tone), seed);
    const layouts = brief.strategies.map(item => item.layout.id);
    assert.equal(new Set(layouts).size, 3, `${tone}/${seed}: ${layouts}`);
    assert.ok(layouts.filter(id => id === 'list').length <= 1);
    assert.equal(brief.strategies[0].scene, '');
    assert.ok(brief.strategies.slice(1).every(item => item.scene && !/\d/.test(item.scene)), 'scene seeds carry no clock time');
    if (tone === 'formal') assert.ok(!layouts.includes('dialogue'));
    const hook = brief.strategies[2].hook.id;
    if (hook === 'dialogue') assert.equal(layouts[2], 'dialogue');
  }
  const thin = { ...sampleInput, productName: 'Sẽ toi cho mọi nhà', description: 'Sản phẩm mới, rất độc đáo.' };
  for (let seed = 1; seed <= 40; seed++) assert.ok(!buildBrief(thin, seed).strategies.some(item => item.layout.id === 'list'), 'no list layout without two real facts');
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) buildBrief(input('youthful'), seed).strategies.forEach(item => seen.add(item.layout.id));
  assert.ok(seen.size >= 5, `layouts used: ${[...seen]}`);
});

test('clock openers, several list captions and copied example phrases are flagged; one list among three is fine', async () => {
  const { opensWithClock, hasBulletList, copiedFromExamples } = await import('../lib/engine/quality.ts');
  assert.ok(opensWithClock('7h50 sáng, tiếng trống vào lớp vang lên.', sampleInput));
  assert.ok(opensWithClock('⏰ 11h55, bàn làm việc rôm rả.', sampleInput));
  assert.ok(!opensWithClock('7h50 sáng, tiếng trống.', { ...sampleInput, description: `${sampleInput.description} Mở cửa 7h30 đến 15h.` }));
  assert.ok(!opensWithClock('Giờ ra chơi sắp hết, bạn lục cặp.', sampleInput));
  assert.ok(hasBulletList('Dẫn.\n📏 Khổ A5\n📝 80 trang') && !hasBulletList('Dẫn.\n📏 Khổ A5 trong câu.'));
  const brief = buildBrief(sampleInput);
  const three = (a: string, b: string, c: string) => scoreOutput(set([a, b, c]), sampleInput, brief).issues.map(item => item.code);
  const one = 'Giấy rời hay bay mất đúng lúc cần. Sổ tay Mây khổ A5 giữ bài học ở một nơi 💙';
  const prose = 'Thầy đọc nhanh, tay chép chưa xong, tờ ghi chú đã lạc đâu mất?\n\nSổ tay Mây có 80 trang kẻ ngang 📝 và bìa màu xanh 🎨, mở ra là chép được ngay.\n\n👉 Bạn đang chọn sổ cho kỳ mới? Nhắn shop nha 📒';
  const list = 'Tiết cuối, tay mỏi, bài còn dang dở.\n\nTrong cặp có sổ tay Mây:\n📏 Khổ A5 bỏ vừa ngăn cặp\n📝 80 trang kẻ ngang\n🎨 Bìa màu xanh\n\nBạn chép bài vào sổ hay mảnh lẻ? Kể ở bình luận nha 📘';
  assert.ok(!three(one, prose, list).includes('layout-monotone'));
  assert.ok(three(one, list, list.replace('Tiết cuối', 'Cuối ngày')).includes('layout-monotone'));
  const example = library.examples.find(item => item.id === 'f-f-sto')!.caption;
  assert.ok(copiedFromExamples(example, [{ caption: example }], sampleInput).length >= 2);
  assert.equal(copiedFromExamples('Chiều nay mình dọn bàn, sổ tay Mây nằm gọn một góc.', [{ caption: example }], sampleInput).length, 0);
});

test('autofix repairs mechanical defects in code: hashtags, mangled product name, wireless plug emoji, double CTA, repeated bullet emoji, location pin without a place', async () => {
  const { autofix } = await import('../lib/engine/autofix.ts');
  const ielts = { productName: 'Lớp IELTS Cuối Tuần', description: 'Lớp học trực tiếp tối thứ Bảy và Chủ nhật, mỗi lớp tối đa 12 học viên.', audience: 'Người đi làm', tone: 'formal' };
  const brief = buildBrief(ielts);
  const fixed = autofix({
    captions: ['Dành cho người đi làm muốn học thêm 📚', 'Lớp IELTS Cuottuần diễn ra tối thứ Bảy.\n\n⏰ Tối thứ Bảy và Chủ nhật\n⏰ Tối đa 12 học viên\n\n💬 Nhắn shop để hỏi lịch 👉', 'Cuối tuần yên tĩnh.\n\n📍 Mỗi lớp 12 học viên\n\n💬 Nhắn tin để biết thêm.'],
    headlines: ['Lớp IELTS Cuottuần cho người bận', 'Học IELTS vào cuối tuần', 'Giữ nhịp học cuối tuần'],
    hashtags: ['#LopIELSTCuoiTuan', '#Formal', '#Dụngcụhọctập', '#HocIELTS', '#NguoiDiLam'],
  }, ielts, brief);
  assert.ok(fixed.fixes.includes('name-typo') && fixed.fixes.includes('hashtag') && fixed.fixes.includes('emoji'));
  assert.ok(fixed.output.captions[1].includes('Lớp IELTS Cuối Tuần') && !fixed.output.captions[1].includes('Cuottuần'));
  assert.ok(fixed.output.headlines[0].includes('Lớp IELTS Cuối Tuần'));
  assert.equal(fixed.output.hashtags.length, 5);
  assert.deepEqual(hashtagProblems(fixed.output.hashtags, ielts), []);
  assert.ok(!fixed.output.hashtags.some(tag => /formal/i.test(tag)));
  assert.equal(new Set(fixed.output.hashtags.map(tag => tag.toLowerCase())).size, 5);
  assert.equal((fixed.output.captions[1].match(/[👉👇💬]/gu) ?? []).length, 1, 'one pointer emoji');
  const bullets = fixed.output.captions[1].match(/^⏰/gmu) ?? [];
  assert.ok(bullets.length <= 1, 'repeated bullet emoji replaced');
  const pin = autofix({ captions: ['Sổ tay Mây 📓', 'Chép bài.\n\n📍 Khổ A5\n📍 80 trang', 'Cuối ngày.'], headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#SoTayMay', '#GhiChep', '#HocSinh', '#SinhVien', '#VanPhongPham'] }, sampleInput, buildBrief(sampleInput));
  assert.ok(!pin.output.captions[1].includes('📍'), 'pin without a place is swapped for a theme emoji');
  const phone = { ...sampleInput, productName: 'Tai nghe Gió', description: 'Tai nghe Bluetooth không dây, hộp sạc nhỏ gọn, 3 màu: đen, trắng, hồng.' };
  const wireless = autofix({ captions: ['Tai nghe Gió 🎧', 'Nghe.\n🔌 Kết nối Bluetooth không dây\n🎨 3 màu', 'Đi học.'], headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#A1', '#B2', '#C3', '#D4', '#E5'] }, phone, buildBrief(phone));
  assert.ok(wireless.output.captions[1].includes('📶') && !wireless.output.captions[1].includes('🔌'));
  const clean = getSample(0);
  assert.deepEqual(autofix(clean, sampleInput, buildBrief(sampleInput)).output, clean, 'a clean draft is left untouched');
});

test('repair plan points at the caption that failed instead of rewriting the whole set', async () => {
  const { repairPlan } = await import('../lib/engine/quality.ts');
  const report = (issues: { code: string; detail: string }[]) => ({ pass: false, score: 0.9, dimensions: {}, issues: issues.map(item => ({ ...item, hard: false })) });
  assert.deepEqual(repairPlan(report([{ code: 'cliche', detail: 'Caption 2 có cụm khuôn mẫu.' }])), { captions: [1], hashtags: false });
  assert.deepEqual(repairPlan(report([{ code: 'layout-monotone', detail: 'Caption 2, 3 đều xếp dữ kiện thành danh sách' }])), { captions: [1, 2], hashtags: false });
  assert.deepEqual(repairPlan(report([{ code: 'repeated-motif', detail: 'Các caption lặp cùng cụm "x"' }])), { captions: [1, 2], hashtags: false });
  assert.deepEqual(repairPlan(report([{ code: 'hashtag-style', detail: 'Hashtag chưa đạt' }])), { captions: [], hashtags: true });
  assert.deepEqual(repairPlan(report([{ code: 'other', detail: 'lỗi chung' }])), { captions: [0, 1, 2], hashtags: false });
});

test('risk claims, invented schedule days and link-like invitations are flagged; hypothetical weekday scenes for schedule-free products are fine', async () => {
  const { claimUnsupported } = await import('../lib/engine/quality.ts');
  const cream = { ...sampleInput, productName: 'Kem dưỡng Bơ Mộc', description: 'Kem dưỡng ẩm hũ 50g, thành phần có bơ hạt mỡ và glycerin, mùi hương nhẹ.' };
  assert.ok(claimUnsupported('Kem cung cấp độ ẩm cho làn da thiếu ẩm', cream).length >= 2);
  assert.equal(claimUnsupported('Hũ 50g với bơ hạt mỡ và glycerin, mùi hương nhẹ.', cream).length, 0);
  const ielts = { ...sampleInput, productName: 'Lớp IELTS Cuối Tuần', description: 'Lớp học trực tiếp tối thứ Bảy và Chủ nhật, mỗi lớp tối đa 12 học viên.' };
  assert.ok(claimUnsupported('Chiều tối thứ Sáu, bạn tự hỏi về cuối tuần.', ielts).some(item => item.includes('thứ sáu')));
  assert.equal(claimUnsupported('Tối thứ Bảy và Chủ nhật, tối đa 12 học viên.', ielts).length, 0);
  assert.ok(claimUnsupported('Lớp giúp bạn học IELTS hiệu quả, đảm bảo theo sát từng người, có giảng viên.', ielts).length >= 3);
  assert.equal(claimUnsupported('Tối chủ nhật dọn lại góc bàn, sổ tay Mây nằm đó.', sampleInput).length, 0, 'no schedule in source: weekday scene is hypothetical');
  assert.ok(clicheHits('Mời bạn xem thêm tại đây nhé.').length > 0);
  const { opensWithClock } = await import('../lib/engine/quality.ts');
  assert.ok(opensWithClock('Ba giờ chiều, công việc vẫn còn dang dở.', sampleInput));
  assert.ok(opensWithClock('11 giờ trưa, bàn làm việc rôm rả.', sampleInput));
  const { repeatedMotifs } = await import('../lib/engine/quality.ts');
  assert.deepEqual(repeatedMotifs(['Điều quan trọng là chọn đúng sổ.', 'Thứ quan trọng nhất ở đây là bạn thấy thoải mái.', 'Chỉ vậy thôi.'], sampleInput), [], 'everyday word pairs in two captions are not a motif');
  assert.ok(repeatedMotifs(['Bạn tò mò cái tên này thật.', 'Cả nhà tò mò cái tên này.', 'Ai cũng tò mò cái tên.'], sampleInput).length > 0);
});

test('a lunch box is not classified as fashion, low-confidence categories do not leak into emoji or hashtags, and category hashtags are real hashtags', async () => {
  const { classifyCategory } = await import('../lib/engine/context.ts');
  const { trustedCategory } = await import('../lib/engine/library.ts');
  const { autofix } = await import('../lib/engine/autofix.ts');
  assert.equal(classifyCategory('Hộp cơm Gấp Đôi Hộp cơm 2 ngăn, nắp silicone, bỏ vừa túi xách, dùng được trong lò vi sóng.').id, 'home');
  assert.equal(classifyCategory('Chậu cây Mầm Nhỏ Chậu gốm men trắng cao 10cm, kèm đĩa lót, đặt vừa mép bàn làm việc.').id, 'home');
  assert.equal(trustedCategory('fashion', 0.45), 'generic');
  assert.equal(trustedCategory('education', 0.7), 'education');
  const ielts = { productName: 'Lớp IELTS Cuối Tuần', description: 'Lớp học trực tiếp tối thứ Bảy và Chủ nhật, mỗi lớp tối đa 12 học viên.', audience: 'Người đi làm', tone: 'formal' };
  const fixed = autofix({ captions: ['Một dòng 📚', 'Hai dòng 📅', 'Ba dòng ✨'], headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#LớpIELTSCuốiTuần', '#Formal', '#A', '#B', '#C'] }, ielts, buildBrief(ielts));
  assert.ok(!fixed.output.hashtags.some(tag => /KhoaHocDichVu/.test(tag)), 'no category label turned into a hashtag');
  assert.ok(fixed.output.hashtags.every(tag => /^#[A-Za-z0-9]+$/.test(tag)), 'all ASCII after autofix');
  assert.ok(fixed.output.hashtags.includes('#LopIELTSCuoiTuan'), 'product-name tag unified to ASCII CamelCase');
  const lunch = { ...sampleInput, productName: 'Hộp cơm Gấp Đôi', description: 'Hộp cơm 2 ngăn, nắp silicone, bỏ vừa túi xách, dùng được trong lò vi sóng.' };
  const lunchFixed = autofix({ captions: ['Hộp cơm Gấp Đôi 🍱', 'Cơm.\n👕 Nắp silicone', 'Ăn trưa.'], headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#HopComGapDoi', '#A1', '#B2', '#C3', '#D4'] }, lunch, buildBrief(lunch));
  assert.ok(!lunchFixed.output.captions[1].includes('👕'), 'clothing emoji without clothing facts is swapped');
  assert.ok(!lunchFixed.output.hashtags.includes('#ThoiTrang'));
});

test('autofix removes a product name tacked on after the last emoji and closes an opened quotation', async () => {
  const { autofix } = await import('../lib/engine/autofix.ts');
  const brief = buildBrief(sampleInput);
  const out = autofix({
    captions: ['Sổ tay Mây với khổ A5 gọn cho vào cặp 🎒 Sổ tay Mây', '"Ê, cho mượn bút với.\n— Đợi xíu, tao đang tìm.\n\nSổ tay Mây ở ngăn ngoài.', 'Sổ tay Mây nằm trong cặp, Sổ tay Mây nằm cả trong tay.'],
    headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#SoTayMay', '#GhiChep', '#HocSinh', '#SinhVien', '#VanPhongPham'],
  }, sampleInput, brief).output.captions;
  assert.equal(out[0], 'Sổ tay Mây với khổ A5 gọn cho vào cặp 🎒');
  assert.ok(out[1].split('\n')[0].endsWith('"'));
  assert.equal(out[2], 'Sổ tay Mây nằm trong cặp, Sổ tay Mây nằm cả trong tay.', 'a name that ends a sentence mid-text is left alone');
});

test('invitations to look at more photos are a stock frame, and booking or error-correcting promises count as unsupported for courses', async () => {
  const { claimUnsupported } = await import('../lib/engine/quality.ts');
  assert.ok(clicheHits('Nhắn shop để xem thêm ảnh chi tiết nha!').length > 0);
  const ielts = { ...sampleInput, productName: 'Lớp IELTS Cuối Tuần', description: 'Lớp học trực tiếp tối thứ Bảy và Chủ nhật, mỗi lớp tối đa 12 học viên.' };
  assert.ok(claimUnsupported('Nhắn tin để giữ chỗ ngay.', ielts).length > 0);
  assert.ok(claimUnsupported('Có người chỉnh sửa từng lỗi sai cho bạn.', ielts).length > 0);
});

const khao = {
  productName: 'Khao Pasta', audience: 'Dân văn phòng thích ăn ngon', tone: 'youthful',
  description: 'Thứ 5 hàng tuần đồng giá pasta 148K\nPasta Tôm ngọt thịt, sợi pasta quyện sốt béo thơm\nPasta Cua thơm ngọt, sốt đậm đà\nLưu ý: Ưu đãi áp dụng vào Thứ 5 hàng tuần, không áp dụng đồng thời với các CTKM khác.\nCơ sở 1: 122-K1, Giảng Võ, Đống Đa, Hà Nội - 0922 338 868\nCơ sở 2: HA01-131 Vinhomes Ocean Park, Gia Lâm, Hà Nội - 0965281518',
};

test('shop info (price, offer, schedule, address, contact, terms, urgency) is extracted line by line and pasted links are stripped', async () => {
  const { extractInfo, hasInfo } = await import('../lib/detail.ts');
  const { cleanInput } = await import('../lib/content.ts');
  const info = extractInfo(khao.description);
  assert.ok(info.prices.some(line => line.includes('148K')));
  assert.ok(info.schedule.some(line => /Thứ 5/.test(line)));
  assert.ok(info.terms.some(line => line.startsWith('Lưu ý')));
  assert.equal(info.addresses.length, 2, 'two branches, commas kept inside each address');
  assert.ok(info.addresses[0].includes('122-K1, Giảng Võ, Đống Đa, Hà Nội'));
  assert.ok(info.contacts.some(line => line.includes('0922 338 868')));
  const x10 = extractInfo('Chỉ từ 60K/30 phút\n12 Đống Kỳ, Hoàng Liệt, Hoàng Mai, Hà Nội\nHotline: 093 161 1818\nGiờ mở cửa T2 - CN: 09:00 - 21:00\nĐặt lịch trước để giữ slot đẹp');
  assert.equal(x10.addresses.length, 1, 'address without street words is still recognised');
  assert.ok(x10.schedule.length === 1 && x10.contacts.length === 1 && x10.urgency.length === 1);
  assert.ok(!hasInfo(extractInfo('Sổ tay khổ A5, bìa màu xanh.')));
  assert.deepEqual(extractInfo('Sản phẩm mới, mức giá ưu đãi hơn').prices, [], 'bare word "giá" is not a price');
  const cleaned = cleanInput({ productName: 'X', audience: 'Y', tone: 'youthful', description: 'Hotline 093 161 1818 [#bắncung](https://www.facebook.com/hashtag/b?__cft__[0]=AZh0&__tn__=*NK-R) và https://example.com/x?y=1 hết' } as never);
  assert.equal(cleaned.description, 'Hotline 093 161 1818 #bắncung và  hết');
});

test('the shop voice lives inside the youthful tone (no separate tone), legacy input is mapped, and price/schedule drive the hooks', async () => {
  const { cleanInput } = await import('../lib/content.ts');
  assert.ok(!library.tones.some(item => (item.id as string) === 'friendly'));
  assert.equal(cleanInput({ ...sampleInput, tone: 'friendly' }).tone, 'youthful');
  const brief = buildBrief(khao as never, 3);
  assert.equal(brief.tone.id, 'youthful');
  assert.deepEqual(brief.strategies.slice(0, 2).map(item => item.hook.id), ['price-anchor', 'ritual']);
  assert.ok(brief.examples.filter(item => item.id.startsWith('st-y-shop')).length >= 1, 'shop-voice examples are offered to the youthful tone');
  const plain = buildBrief({ ...khao, description: 'Pasta tôm sốt kem, hộp giấy.' } as never, 3);
  assert.ok(!plain.strategies.some(item => item.hook.id === 'price-anchor' || item.hook.id === 'ritual'), 'no price or schedule given: no price or ritual hook');
});

test('a faithful shop post passes: exact price, hours, hotline and branches copied; price/offer emoji allowed only when the facts exist', async () => {
  const { forbiddenEmojiHit, inventedNumbers, contentText } = await import('../lib/engine/quality.ts');
  assert.equal(forbiddenEmojiHit('Đồng giá 148K 🏷️', khao as never), false, 'price emoji with a real price');
  assert.equal(forbiddenEmojiHit('Đồng giá 148K 🏷️', sampleInput), true, 'price emoji without any price in the facts');
  assert.equal(forbiddenEmojiHit('Hết mẻ hôm nay ⏳', khao as never), true, 'scarcity emoji without scarcity in the facts');
  assert.equal(forbiddenEmojiHit('Hết mẻ hôm nay ⏳', { ...khao, description: `${khao.description}\nSố lượng chưa nhiều, hết mẻ là chờ mẻ sau` } as never), false);
  assert.equal(forbiddenEmojiHit('Mỗi ngày một viên 💊', { ...khao, description: `${khao.description} 💊` } as never), false, 'emoji already in the source is the shop\'s own');
  assert.deepEqual(inventedNumbers('Đồng giá 148K, thứ 5 hàng tuần, hotline 0922 338 868', khao as never), []);
  assert.deepEqual(inventedNumbers('Đồng giá 148.000đ cho cả hai', khao as never), [], '148K and 148.000đ are the same number');
  assert.ok(inventedNumbers('Mất nguyên 3 phút gỡ dây, giảm còn 99K', khao as never).length >= 2);
  assert.deepEqual(inventedNumbers('Thả 1 emoji hoặc 2 từ nha', khao as never), [], 'interaction counts are not facts');
  const brief = buildBrief(khao as never);
  const post = [
    'THỨ 5 NÀY, PASTA ĐỒNG GIÁ 148K — Khao đã “chốt kèo” giúp mình rồi nè 🍝',
    'Thứ 5 hàng tuần có hẹn với đĩa pasta ở Khao chưa nè? 🍝\n\nKhông cần chờ dịp đặc biệt, cũng chẳng phải nghĩ hôm nay ăn gì: Pasta Tôm ngọt thịt hoặc Pasta Cua thơm ngọt, đồng giá 148K.\n\nLưu ý: ưu đãi áp dụng vào Thứ 5 hàng tuần, không áp dụng đồng thời với các CTKM khác nha.\n\n📍 122-K1, Giảng Võ, Đống Đa, Hà Nội - 0922 338 868\n📍 HA01-131 Vinhomes Ocean Park, Gia Lâm, Hà Nội - 0965281518\n\n👉 Tag người bạn hay hỏi “tối nay ăn gì” vào bình luận nè 😋',
    'Có những tối chẳng muốn nghĩ gì, chỉ muốn một đĩa pasta ấm bụng ngồi xuống ăn thôi 🥹\n\nPasta Tôm có phần sốt béo thơm quyện sợi pasta, Pasta Cua thì thơm ngọt, càng trộn càng cuốn. Thứ 5 hàng tuần, hai món cùng đồng giá 148K nên chọn món nào cũng không sợ lố ví.\n\nThứ 5 này mình hẹn nhau ở Khao nha, em để sẵn bàn quen cho khách 😊\n\n💬 Bạn chọn Tôm hay Cua? Nhắn Khao một chữ là em biết nè 👀\n\n📍 122-K1, Giảng Võ, Đống Đa, Hà Nội - 0922 338 868',
  ];
  const report = scoreOutput({ captions: post, headlines: ['Thứ 5 pasta đồng giá 148K', 'Tôm hay Cua, bạn chọn?', 'Note lịch ăn pasta thứ 5'], hashtags: ['#KhaoPasta', '#PastaDongGia', '#AnNgonHaNoi', '#DanVanPhong', '#Thu5AnPasta'] } as never, khao as never, brief);
  assert.equal(report.issues.some(item => ['emoji-claim', 'layout-monotone', 'invented-number', 'unsupported-claim', 'emoji-monotone'].includes(item.code)), false, report.issues.map(item => item.code).join(','));
  assert.ok(contentText(post[1]).length < post[1].length, 'address lines are excluded from the length');
  const faked = post.map(text => text.replace('148K', '99K'));
  assert.ok(scoreOutput({ captions: faked, headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#A1', '#B2', '#C3', '#D4', '#E5'] } as never, khao as never, brief).issues.some(item => item.code === 'invented-number'));
});

test('info lines may repeat (several branches), are not a list layout, and do not count toward length', async () => {
  const { hasBulletList, isInfoLine, contentText } = await import('../lib/engine/quality.ts');
  const text = 'Dẫn vào bài.\n\n📍 12 Phố Mơ, Hà Nội\n📍 5 Phố Lá, Hà Nội\n⏰ 9:00 - 21:00\n📞 0900 000 000';
  assert.ok(!hasBulletList(text));
  assert.ok(isInfoLine('📍 12 Phố Mơ') && isInfoLine('⏰ 9:00') && !isInfoLine('🧴 Hũ 50g'));
  assert.equal(contentText(text), 'Dẫn vào bài.\n');
  const brief = buildBrief(khao as never);
  assert.ok(!emojiProblems(text, 2, khao as never, brief).some(item => item.code === 'emoji-monotone'));
});

test('a price that is really in the facts may be mentioned; only an unknown price is an invented claim', async () => {
  const { claimUnsupported } = await import('../lib/engine/quality.ts');
  const shop = { ...sampleInput, productName: 'Khao Pasta', description: 'Thứ 5 hàng tuần đồng giá pasta 148K.' };
  assert.deepEqual(claimUnsupported('Đồng giá 148K, ưu đãi thứ 5', shop).filter(item => /giá/.test(item)), []);
  assert.ok(claimUnsupported('Chỉ còn 99K thôi nha, giá 99K cho cả hai', shop).length > 0);
  assert.ok(claimUnsupported('Giảm 30% cho khách mới', shop).length > 0);
  assert.deepEqual(claimUnsupported('Giảm 30% cho khách mới', { ...shop, description: `${shop.description} Giảm 30% cho khách mới.` }), []);
});

test('each tone has its own stock words: one is a broken tone, two or more force a rewrite; words the shop itself used are exempt', () => {
  const formal = buildBrief(input('formal'));
  const humorous = buildBrief(input('humorous'));
  const codes = (captions: string[], brief: ReturnType<typeof buildBrief>, source = sampleInput) => scoreOutput(set(captions), source, brief).issues.map(item => item.code);
  const plain = ['Sổ tay Mây khổ A5, 80 trang kẻ ngang 📓', 'Trang giấy còn trắng, cây bút nằm sẵn ở mép bàn.\n\nSổ tay Mây có 80 trang kẻ ngang và bìa màu xanh 🎨\n\n💬 Nhắn tin để biết thêm.', 'Một buổi chiều trên bàn học, sổ tay Mây mở sẵn ở trang mới.\n\nKhổ A5 nằm gọn trong ngăn cặp.\n\n✨ Lưu bài để xem lại.'];
  assert.ok(!codes(plain, formal).some(code => code.startsWith('tone-')));
  const one = plain.map((text, index) => (index === 0 ? text.replace('Sổ tay Mây', 'Sổ tay Mây chỉn chu') : text));
  assert.ok(codes(one, formal).includes('tone-break') && !codes(one, formal).includes('tone-stock-heavy'));
  const two = one.map((text, index) => (index === 2 ? text.replace('Một buổi chiều', 'Một buổi chiều tĩnh lặng và trọn vẹn') : text));
  assert.ok(codes(two, formal).includes('tone-stock-heavy'));
  assert.equal(scoreOutput(set(two), sampleInput, formal).pass, false);
  const jokes = plain.map((text, index) => (index === 1 ? text.replace('Trang giấy', 'Thú thật, trang giấy') : index === 2 ? text.replace('Một buổi chiều', 'Chính thức nghỉ việc, một buổi chiều') : text));
  assert.ok(codes(jokes, humorous).includes('tone-stock-heavy'), 'thú thật + chính thức nghỉ việc');
  assert.ok(!codes(one, { ...formal } as never, { ...sampleInput, description: `${sampleInput.description} Bìa chỉn chu.` }).includes('tone-break'), 'a word in the facts is the shop\'s own');
});

test('library examples do not demonstrate the stock words their own tone forbids', () => {
  for (const example of library.examples) {
    const tone = library.tones.find(item => item.id === example.tone)!;
    const lowered = example.caption.toLocaleLowerCase('vi-VN');
    for (const word of tone.avoid) assert.ok(!lowered.includes(word.toLocaleLowerCase('vi-VN')) || example.facts.toLocaleLowerCase('vi-VN').includes(word.toLocaleLowerCase('vi-VN')), `${example.id} shows "${word}"`);
  }
  for (const toneId of ['formal', 'humorous']) {
    const tone = library.tones.find(item => item.id === toneId)!;
    assert.ok(tone.vocabulary.every(entry => entry.split(/\s+/).length > 2), `${toneId}.vocabulary describes registers, not words to repeat`);
  }
});

test('thin facts use shorter length targets so the model is not pushed to pad; rich facts keep the full targets', async () => {
  const { targetsFor } = await import('../lib/engine/quality.ts');
  const thin = { ...sampleInput, productName: 'Sẽ toi', description: 'hồng hào siêu bự' };
  assert.deepEqual(targetsFor(thin), library.platform.thinCaptionTargets);
  assert.deepEqual(targetsFor(sampleInput), library.platform.captionTargets);
  assert.deepEqual(buildBrief(thin).strategies.map(item => item.length), library.platform.thinCaptionTargets);
  const middle = 'Sẽ toi hồng hào siêu bự nằm giữa phòng, ai vào cũng quay lại nhìn thêm một lần nữa, chắc vì màu quá nổi. Ghé nhìn thử thì biết, nhìn thôi không mất gì cả nha.';
  const captions = ['Sẽ toi hồng hào, siêu bự, nằm giữa phòng 🧸', `${middle}\n\n💬 Bạn thấy sao?`, `${middle} ${middle}\n\n👉 Kể mình nghe nhé 😋`];
  const lengthShort = (source: typeof sampleInput) => scoreOutput(set(captions), source, buildBrief(source)).issues.filter(item => item.code === 'length-short').length;
  assert.ok(lengthShort(thin) < lengthShort({ ...sampleInput, productName: 'Sẽ toi' }), 'the same text is judged short only when facts are rich');
});

test('autofix turns slang copied from the description into standard Vietnamese, but leaves a product name alone', async () => {
  const { autofix } = await import('../lib/engine/autofix.ts');
  const thin = { ...sampleInput, productName: 'Sẽ toi', description: 'hồng hào siêu bự, mún dùng lúc nào cũng được' };
  const out = autofix({ captions: ['Sẽ toi cho bạn mỗi khi mún 🧸', 'Hok cần chờ, ko cần đợi, lấy đc liền.\n\n💬 Nhắn nha', 'Trc khi đi ngủ 😴'], headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#SeToi', '#A1', '#B2', '#C3', '#D4'] }, thin, buildBrief(thin));
  assert.ok(out.fixes.includes('slang'));
  assert.deepEqual(out.output.captions, ['Sẽ toi cho bạn mỗi khi muốn 🧸', 'Không cần chờ, không cần đợi, lấy được liền.\n\n💬 Nhắn nha', 'Trước khi đi ngủ 😴']);
  const named = { ...sampleInput, productName: 'Hok Hok Tea', description: 'Trà sữa size L, vị truyền thống.' };
  assert.equal(autofix({ captions: ['Hok Hok Tea cho bạn 🧋', 'Ko cần đợi.\n\n💬 Nhắn nha', 'Đc rồi 🧋'], headlines: ['Một ví dụ', 'Hai ví dụ', 'Ba ví dụ'], hashtags: ['#HokHokTea', '#A1', '#B2', '#C3', '#D4'] }, named, buildBrief(named)).output.captions[0], 'Hok Hok Tea cho bạn 🧋', 'the brand name itself is kept');
});
