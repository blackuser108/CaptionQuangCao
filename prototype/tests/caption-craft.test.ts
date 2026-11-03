import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrief, scoreOutput } from '../lib/engine/index.ts';
import { buildAudienceContext, buildFeatureAngles, buildProductContext } from '../lib/engine/context.ts';
import { library } from '../lib/engine/library.ts';
import { count, openingCount, type Input, type Output } from '../lib/content.ts';
import { sampleInput } from '../lib/samples.ts';

const strategyIndex = { 'benefit-led': 0, 'audience-led': 1, 'story-led': 2 } as const;
const emoji = /\p{Emoji_Presentation}/gu;
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
    const emojis = (example.caption.match(emoji) ?? []).length;
    const tone = library.tones.find(item => item.id === example.tone)!;
    assert.ok(emojis <= tone.emojiMax, `${example.id} has ${emojis} emoji`);
    assert.ok(!/^\p{Emoji_Presentation}/u.test(example.caption), `${example.id} opens with emoji`);
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
    'Sổ tay Mây tiện lợi, chất lượng, tuyệt vời cho bạn 😀😀😀😀',
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
    'Thầy đọc nhanh, tay chép chưa xong, tờ giấy rời thì đã lạc đâu mất?\n\nSổ tay Mây khổ A5 có 80 trang kẻ ngang, bìa màu xanh. Chép bài, gạch ý chính, ôn lại cuối tuần đều nằm gọn trong một cuốn.\n\nĐang chọn sổ cho kỳ học mới? Nhắn shop để hỏi thêm nha.',
    'Tiết cuối buổi chiều, tay mỏi, bài còn dang dở.\n\nTrong cặp có một cuốn sổ tay Mây:\n✔ Khổ A5 — bỏ vừa cặp\n✔ 80 trang kẻ ngang — chữ thẳng hàng, dễ đọc lại khi ôn\n✔ Bìa màu xanh — nhìn là nhận ra\n\nBạn thường chép bài vào sổ hay giấy rời? Kể ở bình luận nha 📘',
  ]);
  const report = scoreOutput(good, sampleInput, brief);
  assert.equal(report.pass, true);
  assert.deepEqual(report.issues, []);
});
