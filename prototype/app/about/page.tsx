import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Về chúng tôi · Team AIT1-HUST' };

export default function Page() {
  const teamMembers = [
    {
      name: 'Hoàng Long Phan',
      role: 'Nhóm trưởng / Founder',
      username: '@hoanglong.phan.10441',
      fb: 'https://facebook.com/hoanglong.phan.10441',
      avatar: '/image/authorAvatar/Long.jpg',
      initials: 'HL',
      isLead: true,
    },
    {
      name: 'Đình Púc',
      role: 'AI & Fullstack Lead',
      username: '@fucdin',
      avatar: '/image/authorAvatar/Puc.jpg',
      initials: 'ĐP',
      isLead: false,
    },
    {
      name: 'Gia Huy Vũ',
      role: 'Frontend & UI Specialist',
      username: '@gia.huy.vu.445284',
      avatar: '/image/authorAvatar/huy.jpg',
      initials: 'GH',
      isLead: false,
    },
    {
      name: 'Lăng Trọng Đạt',
      role: 'Quality & System Tester',
      username: '@LangDat121',
      avatar: '/image/authorAvatar/dat.jpg',
      initials: 'TĐ',
      isLead: false,
    },
  ];

  return (
    <>
      {/* HERO SECTION */}
      <div className="wrap about-hero">
        <div>
          <span className="team-header-badge">Đại học Bách Khoa Hà Nội · HUST</span>
          <h1>
            Đội ngũ AIT1-HUST<br />
            và sứ mệnh xây dựng<br />
            <span className="accent">Bàn biên tập AI.</span>
          </h1>
          <p>
            Dự án được nghiên cứu và phát triển bởi <strong>Team AIT1-HUST</strong> nhằm giải quyết bài toán nhức nhối của các chủ shop và marketer: mất quá nhiều thời gian mỗi ngày để suy nghĩ nội dung đăng bài trên mạng xã hội.
          </p>
        </div>
        <div className="about-figure">
          <span className="about-word">AIT1.</span>
          <p className="serif">Dữ kiện thật của bạn.<br />Sức mạnh từ AI.</p>
          <p className="muted">
            Công nghệ phục vụ con người.<br />
            Nội dung chuẩn xác, sáng tạo và tối ưu chuyển đổi.
          </p>
        </div>
      </div>

      {/* TEAM MEMBERS SECTION */}
      <section className="team-section">
        <div className="wrap">
          <p className="eyebrow">Thành viên đội ngũ</p>
          <h2>Team AIT1-HUST</h2>
          <p className="muted" style={{ maxWidth: 640, marginTop: 10 }}>
            Những thành viên nhiệt huyết từ Đại học Bách Khoa Hà Nội mang công nghệ AI giải quyết bài toán marketing thực chiến.
          </p>

          <div className="team-grid">
            {teamMembers.map((member) => (
              <article key={member.name} className="team-card">
                <div className={`team-avatar ${member.isLead ? 'lead' : ''}`}>
                  <img
                    src={member.avatar}
                    alt={`Avatar của ${member.name}`}
                    width={78}
                    height={78}
                    loading="lazy"
                  />
                </div>
                <h3 className="team-name">{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-username">{member.username}</p>
                {member.fb && (
                  <a
                    href={member.fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="team-fb-link"
                    aria-label={`Facebook của ${member.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Facebook</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTEST & CHALLENGE CONTEXT */}
      <section className="contest-section">
        <div className="wrap">
          <p className="eyebrow">Dự án dự thi</p>
          <h2>Vibe-Coding 2026</h2>
          <p className="muted" style={{ maxWidth: 700, marginTop: 10 }}>
            Đề bài số 2: <strong>Trình tạo Caption Quảng cáo bằng AI</strong>. Được tổ chức bởi FPT Polytechnic, Bộ môn TMĐT & Digital Marketing và Đất Việt Entertainment.
          </p>

          <div className="contest-box">
            <h3 style={{ fontSize: 22, fontFamily: 'var(--serif)' }}>
              Đáp ứng đầy đủ 5 tiêu chuẩn khắt khe của Đề bài:
            </h3>

            <div className="contest-req-grid">
              <div className="contest-req-item">
                <div className="contest-req-num">01</div>
                <h4>Form dữ kiện 4 trường</h4>
                <p>Tên sản phẩm, mô tả ngắn, tệp khách hàng mục tiêu và 3 tông giọng linh hoạt (hài hước / trang trọng / trẻ trung).</p>
              </div>

              <div className="contest-req-item">
                <div className="contest-req-num">02</div>
                <h4>Bộ nội dung 3/3/5</h4>
                <p>AI sinh tự động 03 caption tiếp cận đa góc độ, 03 headline giật tít thôi miên và 05 hashtag tăng tương tác.</p>
              </div>

              <div className="contest-req-item">
                <div className="contest-req-num">03</div>
                <h4>Thao tác 1 chạm</h4>
                <p>Nút sao chép riêng biệt cho từng phần và nút Tạo lại nhanh chóng khi muốn đổi góc viết mới.</p>
              </div>

              <div className="contest-req-item">
                <div className="contest-req-num">04</div>
                <h4>Quản lý lịch sử an toàn</h4>
                <p>Lưu trữ nội bộ an toàn trên thiết bị (localStorage), cho phép xem lại hoặc xóa từng mục bất cứ lúc nào.</p>
              </div>

              <div className="contest-req-item">
                <div className="contest-req-num">05</div>
                <h4>Bộ đếm ký tự chuẩn Meta</h4>
                <p>Đếm Unicode chính xác từng ký tự và cảnh báo vượt ngưỡng "Xem thêm" trên Facebook & Instagram.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PHILOSOPHY (DARK) */}
      <section className="dark-section">
        <div className="wrap about-statement">
          <div>
            <p className="eyebrow">Triết lý thiết kế</p>
            <h2>Bớt thời gian nghĩ câu đầu tiên.</h2>
          </div>
          <p className="muted">
            Chúng tôi không thay thế con người bằng AI; chúng tôi trang bị cho bạn một trợ lý tận tụy để bạn không bao giờ phải đối mặt với nỗi sợ trang giấy trắng. Bạn kiểm soát dữ kiện, bạn đưa ra quyết định câu chữ nào xứng đáng xuất hiện trước khách hàng.
          </p>
        </div>
      </section>

      {/* RESPONSIBLE AI */}
      <section className="light-section">
        <div className="wrap">
          <p className="eyebrow">Nguyên tắc cốt lõi</p>
          <h2>Bản nháp luôn cần người đọc lại.</h2>
          <div className="principles">
            <article>
              <h3>Đi từ dữ kiện thật</h3>
              <p>Không bịa đặt trải nghiệm, không hứa hẹn công dụng khi người dùng chưa cung cấp dữ kiện.</p>
            </article>
            <article>
              <h3>Quyền kiểm soát thuộc về bạn</h3>
              <p>Đọc, chọn lọc và tinh chỉnh từng câu chữ. Không tự động đăng tải khi chưa qua sự xét duyệt của bạn.</p>
            </article>
            <article>
              <h3>Minh bạch & Bảo mật</h3>
              <p>Dữ liệu bài viết lưu trực tiếp trên trình duyệt của bạn, không lo ngại rò rỉ ý tưởng kinh doanh.</p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <div className="wrap">
        <section className="cta-strip">
          <div>
            <h2>Một sản phẩm.<br />Nhiều cách bắt đầu câu chuyện.</h2>
            <p className="muted" style={{ marginTop: 8 }}>Trải nghiệm ngay công cụ hỗ trợ viết bài của Team AIT1-HUST.</p>
          </div>
          <Link className="button" href="/create">
            Mở bàn biên tập
            <span className="arrow" aria-hidden="true">↗</span>
          </Link>
        </section>
      </div>
    </>
  );
}
