import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Năm chức năng' };

export default function Page() {
  const features = [
    {
      num: '01',
      title: 'Bốn trường dữ kiện, ba tông giọng linh hoạt',
      desc: 'Form chuẩn hóa gồm Tên sản phẩm, Mô tả ngắn, Đối tượng khách hàng mục tiêu và 3 tông giọng tùy chọn: Hài hước / Trang trọng / Trẻ trung.',
      impact: 'Bạn không cần viết prompt phức tạp. Điền dữ kiện có thể xác nhận và chọn tông giọng, sau đó đọc lại bản nháp để kiểm tra cách diễn đạt và tính đúng của nội dung.',
      exampleLabel: 'DỮ LIỆU ĐẦU VÀO FORM MẪU',
      example: 'Sổ tay Mây → Sinh viên → Trẻ trung',
    },
    {
      num: '02',
      title: 'Một bộ đầu ra toàn diện 3 / 3 / 5',
      desc: 'Tự động sinh đồng thời: Ba caption độc lập theo 3 góc tiếp cận, ba headline gợi ý giật tít và năm hashtag phân loại; tuyệt đối không thêm thắt điểm tự đánh giá ảo do AI tự khai.',
      impact: 'Có ba góc viết, ba tiêu đề và năm hashtag để cân nhắc. Gợi ý không bảo đảm tương tác hay được đưa lên đề xuất; bạn quyết định nội dung nào phù hợp.',
      exampleLabel: 'BẢN NHÁP CAPTION MẪU TẠO RA',
      example: 'Sổ tay Mây A5, 80 trang kẻ ngang cho những ghi chép trên giảng đường.',
    },
    {
      num: '03',
      title: 'Sao chép 1 chạm và Tạo lại tức thì',
      desc: 'Mỗi nội dung đều có nút copy riêng biệt. Nút "Tạo lại" cho phép sinh bộ nội dung mới từ form đang nhập; khi gặp sự cố mạng, kết quả cũ vẫn được bảo toàn nguyên vẹn.',
      impact: 'Tối ưu tốc độ làm việc: chỉ 1 click là copy ngay phần cần dùng để đăng Fanpage hoặc gửi sếp duyệt. Không sợ mất ý tưởng đang có khi mạng chập chờn.',
      exampleLabel: 'TIÊU ĐỀ GỢI Ý ĐỂ COPY',
      example: 'Sổ tay Mây cho buổi học',
    },
    {
      num: '04',
      title: 'Lịch sử lưu trên trình duyệt',
      desc: 'Tự động lưu lịch sử các lần tạo vào bộ nhớ trình duyệt (localStorage). Xem lại và xóa từng mục dễ dàng mà không phụ thuộc đồng bộ đám mây hay bắt buộc đăng nhập.',
      impact: 'Lịch sử không mã hóa, không sao lưu hoặc đồng bộ thiết bị; xóa dữ liệu trình duyệt có thể làm mất lịch sử. Dữ kiện form được gửi tới dịch vụ AI để sinh nội dung, nên không nhập bí mật hoặc dữ liệu nhạy cảm.',
      exampleLabel: 'PHÂN VÙNG LƯU TRỮ LỊCH SỬ',
      example: 'Khách | Tài khoản A | Tài khoản B',
    },
    {
      num: '05',
      title: 'Bộ đếm ký tự Unicode & Cảnh báo độ dài',
      desc: 'Chuẩn hóa NFC/LF rồi đếm code point; một emoji ghép có thể tính nhiều ký tự. Các mốc là khuyến nghị biên tập, vẫn cho phép copy và tạo lại khi nội dung ngoài khoảng mục tiêu.',
      impact: 'Caption 1 hướng tới 45–90 ký tự, dòng mở đầu ≤115; nhắc khi caption vượt 280. Đây không phải giới hạn Meta và không dự đoán vị trí "Xem thêm".',
      exampleLabel: 'NGƯỠNG ĐỘ DÀI KHUYẾN NGHỊ',
      example: '45–90 / 150–260 / 180–280 ký tự',
    },
  ];

  return (
    <div className="wrap features-container">
      {/* HEADER SECTION */}
      <div className="features-header">
        <span className="eyebrow-pill">⚡ Bàn biên tập AI v2.0</span>
        <h1>Năm chức năng cốt lõi</h1>
        <p className="lead">
          Đủ cấu trúc và công cụ để bạn hoàn thiện một bài viết quảng cáo chất lượng cao mà không bao giờ phải bắt đầu từ con số không.
        </p>

        <div className="features-notice-banner" role="note">
          <span style={{ fontSize: 18 }} aria-hidden="true">💡</span>
          <div>
            <strong>Quy ước trực quan:</strong> Các hộp có khung viền nét đứt và nhãn <code>[VÍ DỤ MINH HỌA]</code> bên dưới là các trường hợp dữ liệu mẫu thực tế để bạn dễ hình dung, không phải nội dung do AI vừa tạo.
          </div>
        </div>
      </div>

      {/* 5 FEATURE CARDS */}
      <div className="features-list">
        {features.map((feat) => (
          <article className="feature-card" key={feat.num}>
            <div className="feature-card-top">
              <span className="feature-num-badge">{feat.num}</span>
              <h2>{feat.title}</h2>
            </div>

            <p className="feature-desc">{feat.desc}</p>

            {/* HIỆU QUẢ CHO NGƯỜI DÙNG */}
            <div className="feature-impact">
              <div className="feature-impact-title">
                <span aria-hidden="true">🚀</span>
                <span>Hiệu quả thực tế cho bạn:</span>
              </div>
              <p>{feat.impact}</p>
            </div>

            {/* HỘP VÍ DỤ MINH HỌA RÕ RÀNG */}
            <div className="feature-example-container">
              <div className="feature-example-header">
                <span className="feature-example-tag">
                  <span aria-hidden="true">📌</span>
                  <span>Ví dụ minh họa thực tế</span>
                </span>
                <span className="feature-example-hint">{feat.exampleLabel}</span>
              </div>
              <p className="feature-example-text">
                {feat.example}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* CTA STRIP */}
      <div className="section-cta" style={{ marginTop: 48, textAlign: 'center' }}>
        <Link className="button" href="/create">
          Mở bàn biên tập trải nghiệm ngay
          <span className="arrow" aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
