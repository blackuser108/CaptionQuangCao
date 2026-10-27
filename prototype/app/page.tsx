import Link from 'next/link';
import type { Metadata } from 'next';
import { samples } from '../lib/samples';
import { count } from '../lib/content';
export const metadata: Metadata = { title: 'Bàn biên tập · Từ dữ kiện đến bài viết' };
export default function Page() {
  return <>
<div className="wrap hero"><div className="hero-copy"><p className="eyebrow">Dành cho chủ shop & marketer</p>
<h1>Từ dữ kiện thật,<br />đến bài viết<br /><span className="accent">của bạn.</span></h1>
<p>Gợi ý caption cho Feed Facebook/Instagram. Bạn đưa thông tin sản phẩm, chọn cách viết và giữ quyền quyết định câu nào được đăng.</p>
<Link className="button " href="/create">Mở bàn biên tập<span className="arrow" aria-hidden="true">↗</span></Link><p className="small muted">Dùng đủ năm chức năng, không cần tài khoản.</p>
</div>
<div className="product-stage" role="img" aria-label="Minh họa sản phẩm: một caption mẫu về Sổ tay Mây và bộ đầu ra 3 caption, 3 headline, 5 hashtag"><div className="stage-label"><span>Một dữ kiện. Nhiều cách viết.</span><span>Ví dụ mẫu</span></div>
<div className="paper"><div className="sample-label">SỔ TAY MÂY / TRẺ TRUNG</div>
<p className="serif">Ghi lại bài học,<br />theo cách của bạn.</p>
<p className="small">{samples[0].captions[0]}</p>
<div className="rule"></div>
<p className="small muted">Gợi ý headline</p>
<p className="small">Sổ tay Mây cho buổi học</p>
<span className="pill">{count(samples[0].captions[0])} ký tự · bản ngắn</span></div>
<div className="mini-totals"><div><strong>03</strong>caption</div>
<div><strong>03</strong>headline gợi ý</div>
<div><strong>05</strong>hashtag</div>
</div>
</div>
</div>
<section className="dark-section"><div className="wrap"><div className="section-head"><div><p className="eyebrow">Một bộ nội dung, nhiều lựa chọn</p>
<h2>Đừng bắt đầu<br />từ một trang trắng.</h2>
</div>
<p className="muted">Từ bốn thông tin đầu vào, có một bộ bản nháp để đọc, chọn và biên tập trước khi đăng.</p>
</div>
<div className="feature-row"><article className="feature"><div className="feature-visual"><div className="line-pair"><span>01</span><span>Ngắn gọn · Giới thiệu sản phẩm</span></div>
<div className="line-pair"><span>02</span><span>Gợi mở · Đặt câu hỏi đầu bài</span></div>
<div className="line-pair"><span>03</span><span>Chi tiết · Trình bày dữ kiện</span></div>
</div>
<h3>Ba góc viết để bạn chọn.</h3>
<p>3 caption, 3 tiêu đề gợi ý và 5 hashtag. Copy riêng phần cần dùng, tạo lại khi muốn một bộ mới.</p>
</article>
<article className="feature"><div className="feature-visual"><span className="small">CAPTION MẪU</span><span className="serif">{count(samples[0].captions[0])}<span className="small"> ký tự</span></span><span className="small">Mục tiêu bản ngắn: 45–90</span></div>
<h3>Một nhịp đọc dễ cân nhắc.</h3>
<p>Bộ đếm và nhắc độ dài giúp biên tập bản nháp. Đây là khuyến nghị sản phẩm, không phải giới hạn Meta.</p>
</article>
</div>
<p className="feature-foot"><Link href="/features">Xem đủ năm chức năng →</Link></p>
</div>
</section>
<section className="light-section"><div className="wrap"><p className="eyebrow">Cách sử dụng</p>
<h2>Bắt đầu từ điều bạn biết rõ.</h2>
<div className="steps"><article><div className="step-number">01</div>
<h3>Đưa dữ kiện sản phẩm</h3>
<p>Tên, mô tả ngắn, người đọc và tông giọng. Không cần thêm ưu đãi hay công dụng chưa xác nhận.</p>
</article>
<article><div className="step-number">02</div>
<h3>Đọc và chọn bản nháp</h3>
<p>So sánh ba cách viết. Kiểm lại thông tin, giọng điệu và độ dài trước khi copy.</p>
</article>
<article><div className="step-number">03</div>
<h3>Giữ lại để xem sau</h3>
<p>Lịch sử lưu trong trình duyệt này. Xem lại hoặc xóa từng mục khi cần.</p>
</article>
</div>
</div>
</section>
<section className="light-section"><div className="wrap faq-grid"><div><p className="eyebrow">Trước khi bắt đầu</p>
<h2>Một vài điều<br />cần nói rõ.</h2>
</div>
<div className="faq"><details open><summary>Tôi có cần đăng nhập không?</summary><p>Không. Bạn vẫn có thể tạo nội dung, copy, tạo lại, dùng lịch sử trên máy và xem bộ đếm. Đăng nhập Google hiện chưa khả dụng.</p>
</details>
<details><summary>Lịch sử có theo tôi sang thiết bị khác?</summary><p>Chưa có đồng bộ. Lịch sử chỉ nằm trong trình duyệt hiện tại; xóa dữ liệu trình duyệt có thể làm mất các mục đã lưu.</p>
</details>
<details><summary>AI có thể viết sai dữ kiện không?</summary><p>Có. Hãy kiểm tra mọi bản nháp. Bộ kiểm cấu trúc 3/3/5 không bảo đảm chất lượng tiếng Việt hoặc tính đúng của nội dung.</p>
</details>
<details><summary>Headline được dùng ở đâu?</summary><p>Đó là tiêu đề gợi ý để copy hoặc biên tập cùng bài viết, không phải một trường native riêng của organic Feed.</p>
</details>
</div>
</div>
</section>
<div className="wrap"><section className="cta-strip"><h2>Sản phẩm đã có câu chuyện.<br />Bắt đầu bằng dữ kiện của bạn.</h2>
<Link className="button " href="/create">Bắt đầu viết<span className="arrow" aria-hidden="true">↗</span></Link></section>
</div>

  </>;
}
