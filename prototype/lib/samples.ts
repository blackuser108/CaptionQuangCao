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
      'Giấy rời hay bay mất đúng lúc cần. Sổ tay Mây khổ A5, 80 trang kẻ ngang: bài học ở yên một chỗ 💙',
      'Thầy đọc nhanh, tay chép chưa xong, tờ giấy rời thì đã lạc đâu mất?\n\nSổ tay Mây khổ A5 có 80 trang kẻ ngang, bìa màu xanh. Chép bài, gạch ý chính, ôn lại cuối tuần đều nằm gọn trong một cuốn, không còn cảnh lục cặp tìm từng tờ.\n\nĐang chọn sổ cho kỳ học mới? Nhắn shop để hỏi thêm nha.',
      'Tiết cuối buổi chiều, tay mỏi, bài còn dang dở.\n\nTrong cặp có một cuốn sổ tay Mây:\n✔ Khổ A5 — bỏ vừa cặp, mang đi học không cồng kềnh\n✔ 80 trang kẻ ngang — chữ thẳng hàng, dễ đọc lại khi ôn\n✔ Bìa màu xanh — nhìn là nhận ra giữa chồng sách vở\n\nGhi hết bài học vào một chỗ, tối về mở ra là ôn được ngay.\nBạn thường chép bài vào sổ hay giấy rời? Kể ở bình luận cho mình biết nha 📘',
    ],
    headlines: ['Sổ A5 gom trọn bài học', 'Hết cảnh lục cặp tìm giấy', 'Một cuốn, một chỗ cho bài vở'],
    hashtags: ['#SoTayMay', '#SoTayA5', '#GhiChepBaiHoc', '#DoDungHocTap', '#SinhVien'],
  },
  {
    captions: [
      'A5. 80 trang. Kẻ ngang. Sổ tay Mây cho những ai muốn bài học nằm yên một chỗ.',
      'Thú thật đi: bài học của bạn đang nằm ở bao nhiêu chỗ khác nhau?\n\nSổ tay Mây là cách gom lại. Khổ A5, 80 trang kẻ ngang, bìa màu xanh, dùng để ghi chép bài học. Một cuốn, một chỗ, đỡ mất công tìm khi cần ôn.\n\nLưu bài này lại nếu bạn cũng đang chọn sổ cho kỳ mới.',
      'Chủ nhật tối, bạn ngồi gom lại bài cả tuần: một tờ trong cặp, một tờ dưới gầm bàn, một tờ không biết ở đâu.\n\nSổ tay Mây gom chuyện đó về một chỗ. Khổ A5 gọn trong cặp, 80 trang kẻ ngang cho từng buổi học nối tiếp nhau, bìa màu xanh để bạn nhận ra ngay cuốn của mình.\n\nTuần sau thử gom bài vào một cuốn xem sao? Nhắn shop nếu bạn muốn xem thêm về sổ nha.',
    ],
    headlines: ['Bài học nằm ở một chỗ', 'Sổ A5 bìa xanh, 80 trang', 'Chép bài gọn hơn trong A5'],
    hashtags: ['#SoTayMay', '#SoKeNgang', '#GhiBai', '#KyHocMoi', '#DoDungSinhVien'],
  },
];

export const longSample: Output = {
  ...samples[0],
  captions: [samples[0].captions[0], samples[0].captions[1],
    'Bạn đang tìm một cuốn sổ khổ A5, có trang kẻ ngang và bìa màu xanh để ghi chép nội dung bài học trên giảng đường mỗi ngày, từ buổi đầu tiên của kỳ học cho tới những tuần ôn tập?\n\nSổ tay Mây có 80 trang kẻ ngang để bạn ghi lại ý chính, nội dung trên lớp và phần bài học cần nhớ. Đây là các thông tin về cuốn sổ để bạn cân nhắc cùng nhu cầu ghi chép của mình, từ khổ giấy, số trang cho đến màu bìa. Khổ A5 giúp cuốn sổ gọn hơn các khổ lớn khi bỏ vào cặp, còn dòng kẻ ngang giữ cho chữ viết thẳng hàng. Bạn có thể dùng mỗi trang cho một buổi học, hoặc mỗi vài trang cho một môn. Xem thông tin sản phẩm trước khi lựa chọn. 📘'],
  headlines: [...samples[0].headlines.slice(0, 2), 'Sổ tay Mây khổ A5 với 80 trang kẻ ngang cho ghi chép bài học'],
};

export function getSample(index: number, long = false): Output {
  const source = long ? longSample : samples[index % samples.length];
  return { captions: source.captions.map(normalize), headlines: source.headlines.map(normalize), hashtags: source.hashtags.map(normalize) };
}
