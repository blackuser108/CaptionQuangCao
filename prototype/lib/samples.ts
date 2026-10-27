import { normalize } from './content.ts';
import type { Input, Output } from './content.ts';

export const sampleInput: Input = {
  productName: 'Sổ tay Mây',
  description: 'Sổ tay khổ A5, 80 trang kẻ ngang, bìa màu xanh, dùng để ghi chép bài học.',
  audience: 'Sinh viên', tone: 'youthful',
};

// Fixtures soạn sẵn cho test offline; luồng tạo thật không sử dụng các bộ này.
export const samples: Output[] = [
  {
    captions: [
      'Sổ tay Mây A5, 80 trang kẻ ngang cho những ghi chép trên giảng đường.',
      'Giờ học có nhiều điều cần ghi lại?\n\nSổ tay Mây khổ A5 có 80 trang kẻ ngang, bìa màu xanh để bạn ghi chép bài học. Nếu đang tìm sổ cho buổi học tới, hãy xem thông tin sản phẩm nhé.',
      'Cần một cuốn sổ để ghi chép bài học?\n\nSổ tay Mây có khổ A5, 80 trang kẻ ngang và bìa màu xanh. Những trang kẻ ngang dành cho phần ghi bài của bạn, từ ý chính đến nội dung cần nhớ. Xem thông tin sản phẩm để cân nhắc cho buổi học tiếp theo.',
    ],
    headlines: ['Sổ tay Mây cho buổi học', 'Ghi bài trên 80 trang kẻ ngang', 'Một cuốn sổ A5 cho giảng đường'],
    hashtags: ['#SoTayMay', '#SoTayA5', '#GhiChepBaiHoc', '#GiangDuong', '#SoTay'],
  },
  {
    captions: [
      'Bìa xanh, khổ A5, 80 trang kẻ ngang: Sổ tay Mây cho buổi học của bạn.',
      'Buổi học tiếp theo, bạn cần ghi gì?\n\nSổ tay Mây có khổ A5 cùng 80 trang kẻ ngang để ghi chép bài học. Bìa màu xanh là một chi tiết để bạn cân nhắc khi chọn sổ. Xem thông tin sản phẩm nhé.',
      'Tìm sổ kẻ ngang cho việc ghi bài?\n\nSổ tay Mây khổ A5 có 80 trang kẻ ngang, bìa màu xanh, dành cho ghi chép bài học. Bạn có thể dùng các trang sổ để ghi lại nội dung trên lớp. Hãy xem thông tin sản phẩm trước khi lựa chọn cho buổi học tới.',
    ],
    headlines: ['Sổ A5, bìa xanh, trang kẻ ngang', 'Sổ tay Mây cho giờ lên lớp', '80 trang dành cho ghi chép'],
    hashtags: ['#SoTayA5', '#SoKeNgang', '#GhiBai', '#BuoiHoc', '#SoTayMay'],
  },
];

export const longSample: Output = {
  ...samples[0],
  captions: [samples[0].captions[0], samples[0].captions[1],
    'Bạn đang tìm một cuốn sổ khổ A5, có trang kẻ ngang và bìa màu xanh để ghi chép nội dung bài học trên giảng đường mỗi ngày?\n\nSổ tay Mây có 80 trang kẻ ngang để bạn ghi lại ý chính, nội dung trên lớp và phần bài học cần nhớ. Đây là các thông tin về cuốn sổ để bạn cân nhắc cùng nhu cầu ghi chép của mình. Xem thông tin sản phẩm trước khi lựa chọn. 📘'],
  headlines: [...samples[0].headlines.slice(0, 2), 'Sổ tay Mây khổ A5 với 80 trang kẻ ngang cho ghi chép bài học'],
};

export function getSample(index: number, long = false): Output {
  const source = long ? longSample : samples[index % samples.length];
  return { captions: source.captions.map(normalize), headlines: source.headlines.map(normalize), hashtags: source.hashtags.map(normalize) };
}
