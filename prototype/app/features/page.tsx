import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Năm chức năng' };
export default function Page() {
  return <>
<div className="wrap list-page"><p className="eyebrow">Năm chức năng</p>
<h1>Đủ để bắt đầu một bài viết.</h1>
<p>Các ví dụ dưới đây là minh họa, không phải kết quả AI vừa tạo.</p>
<article className="draft"><p className="eyebrow">01</p>
<h2>Bốn trường, ba tông giọng</h2>
<p className="muted">Tên, mô tả ngắn, đối tượng khách hàng và tông giọng hài hước / trang trọng / trẻ trung.</p>
<div className="editorial-note">Sổ tay Mây → Sinh viên → Trẻ trung</div>
</article>
<article className="draft"><p className="eyebrow">02</p>
<h2>Một bộ đầu ra 3 / 3 / 5</h2>
<p className="muted">Ba caption, ba headline gợi ý và năm hashtag; không thêm điểm tự đánh giá do AI khai.</p>
<div className="editorial-note">Sổ tay Mây A5, 80 trang kẻ ngang cho những ghi chép trên giảng đường.</div>
</article>
<article className="draft"><p className="eyebrow">03</p>
<h2>Copy riêng và tạo lại</h2>
<p className="muted">Mỗi nội dung có nút copy. Tạo lại dùng form hiện tại; khi lỗi, giữ kết quả cũ.</p>
<div className="editorial-note">Sổ tay Mây cho buổi học</div>
</article>
<article className="draft"><p className="eyebrow">04</p>
<h2>Lịch sử trên trình duyệt</h2>
<p className="muted">Xem lại và xóa từng mục. Chưa đồng bộ thiết bị và chưa kết nối đăng nhập.</p>
<div className="editorial-note">Khách | Tài khoản A | Tài khoản B</div>
</article>
<article className="draft"><p className="eyebrow">05</p>
<h2>Bộ đếm để biên tập</h2>
<p className="muted">Chuẩn hóa NFC và LF rồi đếm code point. Nhắc độ dài vẫn cho copy và tạo lại.</p>
<div className="editorial-note">45–90 / 150–260 / 180–280 ký tự</div>
</article>
<div className="section-cta"><Link className="button " href="/create">Xem không gian viết<span className="arrow" aria-hidden="true">↗</span></Link></div>
</div>

  </>;
}
