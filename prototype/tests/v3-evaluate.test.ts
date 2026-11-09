import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrief, scoreOutput } from '../lib/engine/index.ts';
import { count, openingCount, validOutput, type Input, type Output } from '../lib/content.ts';
import { getSample, sampleInput } from '../lib/samples.ts';

const fixtures: { name: string; input: Input; output: Output }[] = [
  { name: 'old-sample', input: sampleInput, output: getSample(0) },
  {
    name: 'engine-shaped-stationery',
    input: sampleInput,
    output: {
      captions: [
        'Sổ tay Mây A5, 80 trang kẻ ngang cho buổi ghi bài 📓',
        'Giấy rời dễ thất lạc giữa hai tiết học.\n\nSổ tay Mây có sẵn:\n📏 Khổ A5\n📝 80 trang kẻ ngang\n🎨 Bìa màu xanh\n\n👉 Xem thông tin sản phẩm nếu bạn đang chọn sổ.',
        'Cần một cuốn sổ kẻ ngang cho buổi ghi chép?\n\nSổ tay Mây 80 trang, khổ A5, bìa màu xanh. Dùng để ghi chép, không hứa bạn sẽ học giỏi hơn.\n\n💬 Muốn biết thêm, nhắn shop trước buổi học tới nhé ✨',
      ],
      headlines: ['Sổ A5 cho giờ học', '80 trang kẻ ngang', 'Ghi bài một chỗ'],
      hashtags: ['#SoTayMay', '#SoA5', '#KeNgang', '#GhiBai', '#SinhVien'],
    },
  },
];

function metrics(output: Output) {
  const openings = output.captions.map(text => text.split('\n')[0]);
  const uniqueOpenings = new Set(openings.map(text => text.toLocaleLowerCase('vi-VN'))).size;
  const lengths = output.captions.map(count);
  const longOpenings = output.captions.filter(text => openingCount(text) > 115).length;
  return { uniqueOpenings, lengths, longOpenings, questions: output.captions.filter(text => text.includes('?')).length };
}

test('evaluation rubric: schema, length, openings, claims — no live inference', () => {
  const rows = fixtures.map(fixture => {
    const brief = buildBrief(fixture.input);
    const quality = scoreOutput(fixture.output, fixture.input, brief);
    const shape = metrics(fixture.output);
    assert.equal(validOutput(fixture.output), true);
    return { name: fixture.name, score: quality.score, hard: quality.issues.filter(issue => issue.hard).length, ...shape, pass: quality.pass };
  });
  const old = rows.find(row => row.name === 'old-sample')!;
  const next = rows.find(row => row.name === 'engine-shaped-stationery')!;
  assert.equal(old.uniqueOpenings, 3);
  assert.equal(next.uniqueOpenings, 3);
  assert.equal(next.hard, 0);
  assert.ok(next.score >= old.score || next.pass);
  assert.ok(next.questions < 3);
});
