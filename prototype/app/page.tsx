import Link from 'next/link';
import type { Metadata } from 'next';
import { samples } from '../lib/samples';
import { count } from '../lib/content';

export const metadata: Metadata = { title: 'Bàn biên tập · Từ dữ kiện đến bài viết' };

export default function Page() {
  const sampleCaption = samples[0].captions[0];
  const charCount = count(sampleCaption);

  return (
    <>
      {/* 1. HERO SECTION (Cloaked-inspired Hero Layout) */}
      <section className="hero-wrapper">
        <div className="wrap hero">
          <div className="hero-copy">
            <span className="eyebrow-pill">⚡ Trợ lý AI Content Marketing thế hệ mới</span>
            <h1>
              Từ dữ kiện thật,<br />
              đến bài viết quảng cáo<br />
              <span className="accent">để bạn biên tập.</span>
            </h1>
            <p>
              Nhập dữ kiện sản phẩm để AI đề xuất 3 góc viết, 3 tiêu đề và 5 hashtag tham khảo cho Feed Facebook &amp; Instagram. Bạn kiểm tra và biên tập trước khi đăng.
            </p>

            <div className="hero-cta-group">
              <Link className="button" href="/create">
                Mở bàn biên tập ngay
                <span className="arrow" aria-hidden="true">↗</span>
              </Link>
              <Link className="button ghost" href="/features">
                Khám phá tính năng
              </Link>
            </div>

            <ul className="hero-trust-list" aria-label="Cam kết tính năng">
              <li className="trust-item">
                <span className="trust-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                Một lượt tạo bộ 3 / 3 / 5
              </li>
              <li className="trust-item">
                <span className="trust-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                3 Góc tiếp cận chuyên biệt
              </li>
              <li className="trust-item">
                <span className="trust-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                Sử dụng ngay không cần đăng ký
              </li>
            </ul>
            <p className="small muted">Dùng đủ năm chức năng, không cần tài khoản.</p>
          </div>

          {/* HERO VISUAL WITH REALISTIC PHOTO & FLOATING PREVIEW CARDS */}
          <div className="hero-visual-card" aria-label="Minh họa sáng tạo nội dung quảng cáo bằng AI">
            <div className="hero-photo-wrap">
              <img
                src="/image/hero-collaborate.jpg"
                alt="Đội ngũ sáng tạo và marketer đang lên ý tưởng bài viết quảng cáo"
                className="hero-photo"
              />
              <div className="hero-photo-overlay" aria-hidden="true"></div>

              {/* Floating Status Pill */}
              <div className="hero-floating-pill">
                <span className="hero-floating-badge-pulse" aria-hidden="true"></span>
                <span>✨ 3 góc viết đã sẵn sàng</span>
              </div>

              {/* Floating Ad Draft Card */}
              <div className="hero-floating-card">
                <div className="hero-floating-card-meta">
                  <span>VÍ DỤ MINH HỌA · SỔ TAY MÂY</span>
                  <span>{charCount} KÝ TỰ</span>
                </div>
                <div className="hero-floating-card-title">Ghi lại bài học theo cách của riêng bạn.</div>
                <div className="hero-floating-card-body">{sampleCaption}</div>
                <div className="hero-floating-card-tags">
                  <span className="hero-tag-pill">#SoTayMay</span>
                  <span className="hero-tag-pill">#SinhVien</span>
                  <span className="hero-tag-pill">#GhiChep</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM (DARK SECTION - Inspired by Cloaked "Data parasites") */}
      <section className="dark-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow-pill dark">Vấn đề thực tế</span>
              <h2>Cạn kiệt ý tưởng đang kìm hãm<br />doanh số bán hàng của bạn.</h2>
            </div>
            <p className="muted">
              Một bài đăng có nhiều nội dung để cân nhắc: câu mở đầu, cách diễn đạt và thông tin sản phẩm. Bản nháp giúp bạn có thêm lựa chọn trước khi biên tập.
            </p>
          </div>

          <div className="problem-grid">
            <article className="problem-card">
              <div className="problem-icon-wrap" aria-hidden="true">⏳</div>
              <h3>Cạn kiệt ý tưởng mỗi ngày</h3>
              <p>
                Viết từ trang trắng có thể khiến bạn khó tìm câu mở đầu hoặc vô tình lặp lại cách diễn đạt quen thuộc.
              </p>
            </article>

            <article className="problem-card">
              <div className="problem-icon-wrap" aria-hidden="true">🎯</div>
              <h3>Headline thiếu lực hút</h3>
              <p>
                Tiêu đề mờ nhạt khiến khách hàng lướt qua trong nháy mắt mà không dừng lại bấm nút &quot;Xem thêm&quot; để tìm hiểu sản phẩm.
              </p>
            </article>

            <article className="problem-card">
              <div className="problem-icon-wrap" aria-hidden="true">🏷️</div>
              <h3>Hashtag và phân phối lan man</h3>
              <p>
                Hashtag cần liên quan đến sản phẩm và bối cảnh. Gợi ý hashtag không bảo đảm khả năng phân phối hoặc tương tác của bài viết.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. SHOWCASE / SOLUTION IN ACTION (Inspired by "Cloaked lets you take back control") */}
      <section className="showcase-section">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <span className="eyebrow-pill">Giải pháp toàn diện</span>
              <h2>Bàn biên tập trao lại<br />quyền làm chủ nội dung cho bạn.</h2>
            </div>
            <p className="muted">
              Không phụ thuộc vào văn mẫu sáo rỗng. Bàn biên tập lấy dữ kiện cốt lõi về sản phẩm và biến thành những mẩu quảng cáo sắc bén, có cấu trúc chuẩn mực.
            </p>
          </div>

          <div className="showcase-grid">
            {/* Visual Photo Column */}
            <div className="showcase-visual-col">
              <img
                src="/image/creator-mobile.jpg"
                alt="Người bán hàng và nhà sáng tạo sử dụng điện thoại để kiểm tra bài đăng quảng cáo"
                className="showcase-photo"
              />
              <div className="showcase-floating-badge">
                <div className="showcase-badge-title">
                  <span aria-hidden="true">📱</span>
                  <span>Tối ưu hiển thị cho Feed Facebook &amp; Instagram</span>
                </div>
                <p className="showcase-badge-desc">
                  Mốc độ dài là khuyến nghị biên tập, không phải giới hạn Meta và không dự đoán vị trí &quot;Xem thêm&quot;.
                </p>
              </div>
            </div>

            {/* Core Capabilities List */}
            <div className="showcase-points-list">
              <div className="showcase-point-item">
                <div className="showcase-point-num">01</div>
                <div className="showcase-point-content">
                  <h3>Ba góc viết chuyên biệt cho từng tệp khách</h3>
                  <p>
                    Giới thiệu ngắn, tình huống sử dụng và nhu cầu có căn cứ. Đối chiếu từng câu với dữ kiện bạn đã cung cấp.
                  </p>
                </div>
              </div>

              <div className="showcase-point-item">
                <div className="showcase-point-num">02</div>
                <div className="showcase-point-content">
                  <h3>Bộ đếm và mốc độ dài tham khảo</h3>
                  <p>
                    Caption 1 hướng tới 45–90 ký tự; dòng mở đầu hướng tới ≤115 ký tự. Đây là lựa chọn biên tập, không bảo đảm vị trí hiển thị trên Feed.
                  </p>
                </div>
              </div>

              <div className="showcase-point-item">
                <div className="showcase-point-num">03</div>
                <div className="showcase-point-content">
                  <h3>5 Hashtag phân loại tự nhiên theo ngữ cảnh</h3>
                  <p>
                    Năm hashtag tham khảo gắn với dữ kiện sản phẩm và bối cảnh người đọc; bạn kiểm tra lại ý nghĩa trước khi dùng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MASSIVE IMPACT STATS (Bold Orange Blocks - Cloaked Style) */}
      <section className="impact-stats-section">
        <div className="wrap">
          <div className="impact-stats-grid">
            <div className="impact-stat-card">
              <div className="impact-stat-number">3 / 3 / 5</div>
              <div>
                <div className="impact-stat-title">Cấu trúc một bộ bản nháp</div>
                <p className="impact-stat-desc">
                  Tự động đề xuất trọn gói 3 caption, 3 headline và 5 hashtag chỉ trong một lượt bấm duy nhất.
                </p>
              </div>
            </div>

            <div className="impact-stat-card">
              <div className="impact-stat-number">3 tông</div>
              <div>
                <div className="impact-stat-title">Lựa chọn cách diễn đạt</div>
                <p className="impact-stat-desc">
                  Hài hước, Trang trọng và Trẻ trung. Thời gian phản hồi tùy dịch vụ AI; mỗi bản nháp đều cần đọc lại.
                </p>
              </div>
            </div>

            <div className="impact-stat-card">
              <div className="impact-stat-number">5 chức năng</div>
              <div>
                <div className="impact-stat-title">Dùng được ở chế độ khách</div>
                <p className="impact-stat-desc">
                  Lịch sử lưu trên trình duyệt, không mã hóa hoặc đồng bộ thiết bị. Dữ kiện form được gửi tới dịch vụ AI để xử lý.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMPARISON: TRADITIONAL VS BÀN BIÊN TẬP */}
      <section className="comp-section">
        <div className="wrap">
          <span className="eyebrow-pill">So sánh hiệu quả</span>
          <h2>Tại sao nên viết bài<br />cùng Bàn biên tập?</h2>
          <p className="muted" style={{ maxWidth: 640, marginTop: 10 }}>
            Tối ưu hóa thời gian và công sức sáng tạo, để bạn tập trung vào vận hành và chốt đơn.
          </p>

          <div className="comp-grid">
            <div className="comp-card old-way">
              <span className="comp-badge old-badge">Cách làm thủ công</span>
              <h3>Ngồi cắn bút &amp; Thử sai</h3>
              <ul className="comp-list">
                <li>
                  <span className="comp-icon" aria-hidden="true">❌</span>
                  <span>Tự tìm câu mở đầu và thử nhiều cách diễn đạt cho mỗi bài đăng.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">❌</span>
                  <span>Tiêu đề thiếu cuốn hút, khách hàng lướt qua bảng tin mà không buồn dừng lại đọc.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">❌</span>
                  <span>Tự chọn và kiểm tra hashtag liên quan đến sản phẩm.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">❌</span>
                  <span>Khó thay đổi linh hoạt tông giọng giữa khách trẻ trung, khách công sở hay khách cao cấp.</span>
                </li>
              </ul>
            </div>

            <div className="comp-card ai-way">
              <span className="comp-badge ai-badge">⚡ Với Bàn biên tập AI</span>
              <h3>Dữ kiện thật &amp; Trợ lý thông minh</h3>
              <ul className="comp-list">
                <li>
                  <span className="comp-icon" aria-hidden="true">✅</span>
                  <span>Điền bốn trường thông tin để yêu cầu ba bản nháp theo ba góc tiếp cận.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">✅</span>
                  <span>Ba headline tham khảo để bạn lựa chọn và biên tập cùng bài viết.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">✅</span>
                  <span>Năm hashtag theo ngữ cảnh để kiểm tra và sử dụng khi phù hợp.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">✅</span>
                  <span>Bạn luôn là người kiểm soát: Đọc, biên tập, chọn lọc và giữ trọn vẹn bản sắc thương hiệu.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SOCIAL PROOF & TESTIMONIAL (Cloaked-inspired Avatar Strip & Review) */}
      <section className="social-proof-section">
        <div className="wrap social-proof-wrapper">
          <div className="avatars-overlap-row" aria-hidden="true">
            <img src="/image/authorAvatar/Long.jpg" alt="Hoàng Long" className="avatar-bubble" />
            <img src="/image/authorAvatar/Puc.jpg" alt="Púc" className="avatar-bubble" />
            <img src="/image/authorAvatar/huy.jpg" alt="Gia Huy" className="avatar-bubble" />
            <img src="/image/authorAvatar/dat.jpg" alt="Đạt" className="avatar-bubble" />
          </div>
          <h2 className="social-proof-heading">
            Đồng hành cùng các nhà sáng tạo nội dung &amp; chủ shop kinh doanh
          </h2>

          <div className="testimonial-card">
            <p className="testimonial-quote">
              &quot;Trước đây mỗi lần viết bài bán hàng là mình mất cả buổi sáng ngồi cắn bút. Từ khi dùng Bàn biên tập, chỉ cần nhập đúng tính năng và đối tượng, AI cho ra 3 góc viết rất trúng tâm lý, tiêu đề giật tít tự nhiên và không hề bị sáo rỗng!&quot;
            </p>
            <div className="testimonial-author">
              <strong>Thu Hà</strong>
              <span>Founder Tiệm Gốm An Yên</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="steps-section">
        <div className="wrap">
          <span className="eyebrow-pill">Quy trình đơn giản</span>
          <h2>Bắt đầu từ điều bạn biết rõ.</h2>
          <p className="muted" style={{ maxWidth: 640, marginTop: 10 }}>
            Không cần kỹ năng viết quảng cáo chuyên sâu, chỉ cần thực tế về sản phẩm của bạn.
          </p>

          <div className="steps-grid">
            <article className="step-card">
              <div className="step-card-num">01</div>
              <h3>Đưa dữ kiện sản phẩm</h3>
              <p>
                Nhập tên sản phẩm, mô tả ngắn, đối tượng người đọc và lựa chọn tông giọng (Hài hước, Trang trọng hoặc Trẻ trung).
              </p>
            </article>

            <article className="step-card">
              <div className="step-card-num">02</div>
              <h3>Đọc và chọn bản nháp</h3>
              <p>
                So sánh 3 góc viết, kiểm tra dữ kiện và xem bộ đếm theo mốc biên tập tham khảo. Bộ đếm không dự đoán phần nội dung bị thu gọn trên Feed.
              </p>
            </article>

            <article className="step-card">
              <div className="step-card-num">03</div>
              <h3>Sao chép &amp; Đăng bài</h3>
              <p>
                Một chạm copy từng caption, headline hoặc hashtag. Bản nháp được tự động lưu trong lịch sử để bạn xem lại bất kỳ lúc nào.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION (Contains required test element) */}
      <section className="faq-section">
        <div className="wrap faq-grid">
          <div>
            <span className="eyebrow-pill">Trước khi bắt đầu</span>
            <h2>Một vài điều<br />cần nói rõ.</h2>
            <p className="muted" style={{ marginTop: 14 }}>
              Chúng tôi luôn minh bạch về cách thức hoạt động và giới hạn của công cụ AI.
            </p>
          </div>

          <div className="faq-card-list">
            <details open>
              <summary>Tôi có cần đăng nhập không?</summary>
              <p>
                Không. Bạn vẫn có thể tạo nội dung, copy, tạo lại, dùng lịch sử trên máy và xem bộ đếm. Google là lựa chọn bổ sung khi được cấu hình; chế độ khách không cần tài khoản.
              </p>
            </details>

            <details>
              <summary>Lịch sử có theo tôi sang thiết bị khác?</summary>
              <p>
                Chưa có đồng bộ. Lịch sử chỉ nằm trong trình duyệt hiện tại; xóa dữ liệu trình duyệt có thể làm mất các mục đã lưu.
              </p>
            </details>

            <details>
              <summary>AI có thể viết sai dữ kiện không?</summary>
              <p>
                Có. Hãy kiểm tra mọi bản nháp. Bộ kiểm cấu trúc 3/3/5 không bảo đảm chất lượng tiếng Việt hoặc tính đúng của nội dung.
              </p>
            </details>

            <details>
              <summary>Headline được dùng ở đâu?</summary>
              <p>
                Đó là tiêu đề gợi ý để copy hoặc biên tập cùng bài viết, không phải một trường native riêng của organic Feed.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* 9. CTA BANNER */}
      <div className="wrap cta-wrapper">
        <div className="cta-banner">
          <div>
            <h2>Sản phẩm đã có câu chuyện.<br />Bắt đầu bằng dữ kiện của bạn.</h2>
            <p>
              Mở công cụ, nhập dữ kiện và kiểm tra bản nháp trước khi dùng. Khả năng tạo nội dung phụ thuộc kết nối và quota dịch vụ AI.
            </p>
          </div>
          <Link className="button" href="/create">
            Bắt đầu viết ngay
            <span className="arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </>
  );
}
