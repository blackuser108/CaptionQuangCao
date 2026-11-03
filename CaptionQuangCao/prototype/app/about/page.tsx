import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Về chúng tôi' };
export default function Page() {
  return <>
<div className="wrap about-hero"><div><p className="eyebrow">Về bàn biên tập</p>
<h1>Giúp bạn bắt đầu.<br />Giữ tiếng nói<br /><span className="accent">ở lại với bạn.</span></h1>
<p>Chủ shop và marketer cần viết bài cho sản phẩm mỗi ngày. Bàn biên tập được xây quanh một việc cụ thể: từ dữ kiện sản phẩm đến những bản nháp dễ đọc, chọn và kiểm tra.</p>
</div>
<div className="about-figure"><span className="about-word">Aa.</span><p className="serif">Dữ kiện của bạn.<br />Quyết định của bạn.</p>
<p className="muted">AI đề xuất cách diễn đạt.<br />Con người quyết định nội dung được đăng.</p>
</div>
</div>
<section className="dark-section"><div className="wrap about-statement"><div><p className="eyebrow">Bài toán chúng tôi chọn</p>
<h2>Bớt thời gian<br />nghĩ câu đầu tiên.</h2>
</div>
<p className="muted">Một form với bốn trường. Một bộ đầu ra gồm ba caption, ba headline và năm hashtag. Công cụ tập trung vào bài viết Feed Facebook/Instagram, để việc bắt đầu có một cấu trúc rõ ràng.</p>
</div>
</section>
<section className="light-section"><div className="wrap"><p className="eyebrow">Cách dùng AI có trách nhiệm</p>
<h2>Bản nháp luôn cần người đọc lại.</h2>
<div className="principles"><article><h3>Đi từ dữ kiện thật</h3>
<p>Không thêm trải nghiệm, chứng thực, ưu đãi hay công dụng khi đầu vào chưa cung cấp.</p>
</article>
<article><h3>Giữ quyền biên tập</h3>
<p>Đọc, kiểm tra và chọn từng phần cần dùng. Không tự đăng bài lên tài khoản mạng xã hội.</p>
</article>
<article><h3>Nói rõ giới hạn</h3>
<p>AI vẫn có thể viết sai. Chất lượng tiếng Việt đang được kiểm chứng; cấu trúc đúng không đồng nghĩa nội dung đúng.</p>
</article>
</div>
</div>
</section>
<div className="wrap"><section className="cta-strip"><h2>Một sản phẩm.<br />Nhiều cách bắt đầu câu chuyện.</h2>
<Link className="button " href="/create">Mở bàn biên tập<span className="arrow" aria-hidden="true">↗</span></Link></section>
</div>

  </>;
}
