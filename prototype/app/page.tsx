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
              <span className="accent">triệu tương tác.</span>
            </h1>
            <p>
              Chấm dứt việc mất hàng giờ nghĩ ý tưởng. Chỉ cần 30 giây nhập thông tin sản phẩm, AI tự động đề xuất 3 góc viết đa dạng, 3 tiêu đề thôi miên và 5 hashtag tối ưu cho bài đăng Facebook &amp; Instagram.
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
                Tạo bài viết trong 3 giây
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
                  <span>SỔ TAY MÂY · TRẺ TRUNG</span>
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
              Khách hàng chỉ lướt qua bài đăng trong 1,7 giây. Nếu không có mở đầu giật tít và đúng tâm lý, sản phẩm tốt đến mấy cũng chìm nghỉm giữa bảng tin.
            </p>
          </div>

          <div className="problem-grid">
            <article className="problem-card">
              <div className="problem-icon-wrap" aria-hidden="true">⏳</div>
              <h3>Cạn kiệt ý tưởng mỗi ngày</h3>
              <p>
                Mất từ 45–60 phút cho mỗi bài đăng mà văn phong vẫn bị lặp lại, thiếu tính sáng tạo và cảm xúc chân thật để chạm đến người đọc.
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
                Gắn hashtag tùy tiện hoặc chung chung làm thuật toán phân phối sai tệp khách hàng tiềm năng, lãng phí ngân sách tiếp thị.
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
                  Mở đầu trong 45–90 ký tự vàng, giữ chân người đọc trước khi bài viết bị cắt bởi nút &quot;Xem thêm&quot;.
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
                    Ngắn gọn để chốt đơn nhanh, Gợi mở để kích thích bình luận, và Chi tiết để xây dựng lòng tin với xuất xứ &amp; thông số rõ ràng.
                  </p>
                </div>
              </div>

              <div className="showcase-point-item">
                <div className="showcase-point-num">02</div>
                <div className="showcase-point-content">
                  <h3>Bộ đếm nhịp đọc vàng 45–90 ký tự</h3>
                  <p>
                    Cảnh báo trực quan giúp bạn kiểm soát chính xác từng câu mở đầu, đảm bảo thông điệp chính không bị che khuất trên màn hình di động.
                  </p>
                </div>
              </div>

              <div className="showcase-point-item">
                <div className="showcase-point-num">03</div>
                <div className="showcase-point-content">
                  <h3>5 Hashtag phân loại tự nhiên theo ngữ cảnh</h3>
                  <p>
                    Lựa chọn chuẩn xác theo ngành hàng và thói quen tìm kiếm của người dùng, gia tăng tối đa khả năng tiếp cận tự nhiên.
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
              <div className="impact-stat-number">3 Giây</div>
              <div>
                <div className="impact-stat-title">Tốc độ sinh trọn bộ</div>
                <p className="impact-stat-desc">
                  Tự động đề xuất trọn gói 3 caption, 3 headline và 5 hashtag chỉ trong một lượt bấm duy nhất.
                </p>
              </div>
            </div>

            <div className="impact-stat-card">
              <div className="impact-stat-number">95%</div>
              <div>
                <div className="impact-stat-title">Tiết kiệm thời gian</div>
                <p className="impact-stat-desc">
                  Rút ngắn quy trình từ lúc có ý tưởng sản phẩm đến khi có bài đăng hoàn chỉnh từ 45 phút xuống dưới 1 phút.
                </p>
              </div>
            </div>

            <div className="impact-stat-card">
              <div className="impact-stat-number">100%</div>
              <div>
                <div className="impact-stat-title">Bảo mật cục bộ</div>
                <p className="impact-stat-desc">
                  Lưu trữ an toàn trên trình duyệt của bạn. Sử dụng đầy đủ toàn bộ 5 tính năng mà không bắt buộc tạo tài khoản.
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
                  <span>Mất từ 30–60 phút cho mỗi bài đăng mà văn phong vẫn bị trùng lặp, thiếu sáng tạo.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">❌</span>
                  <span>Tiêu đề thiếu cuốn hút, khách hàng lướt qua bảng tin mà không buồn dừng lại đọc.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">❌</span>
                  <span>Quên gắn hashtag hoặc dùng hashtag chung chung, giảm lượt phân phối tự nhiên.</span>
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
                  <span>Chỉ 30 giây điền thông tin, nhận ngay 3 phương án bài viết hoàn chỉnh và trau chuốt.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">✅</span>
                  <span>Sẵn 3 headline giật tít bắt mắt, tối ưu tỷ lệ click và giữ chân người đọc ngay từ 3 giây đầu.</span>
                </li>
                <li>
                  <span className="comp-icon" aria-hidden="true">✅</span>
                  <span>5 hashtag chuẩn ngữ cảnh sản phẩm, giúp bài viết dễ dàng tiếp cận đúng tệp khách tiềm năng.</span>
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
            <img src="/image/creator-work.jpg" alt="Creator" className="avatar-bubble" />
          </div>
          <h2 className="social-proof-heading">
            Đồng hành cùng các nhà sáng tạo nội dung &amp; chủ shop kinh doanh
          </h2>

          <div className="testimonial-card">
            <div className="testimonial-stars" aria-label="Đánh giá 5 sao">
              ★★★★★
            </div>
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
                So sánh 3 góc viết. Kiểm tra câu từ, xem bộ đếm ký tự để đảm bảo bài viết không bị che mất nội dung quan trọng.
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
              Tạo bài viết đầu tiên hoàn toàn miễn phí chỉ với 30 giây thao tác.
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
