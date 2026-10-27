import Link from 'next/link';
import { Brand } from './SiteHeader';

export default function SiteFooter() {
  return <footer className="footer"><div className="wrap"><div className="footer-top">
    <Link href="/" className="brand" aria-label="Bàn biên tập — Về trang chủ"><Brand /></Link>
    <nav className="footer-links" aria-label="Chân trang">
      <Link href="/">Trang chủ</Link><Link href="/features">Tính năng</Link><Link href="/create">Tạo nội dung</Link>
      <Link href="/history">Lịch sử</Link><Link href="/about">Về chúng tôi</Link><Link href="/login">Đăng nhập</Link>
    </nav></div><p>Bản nháp cho Feed Facebook/Instagram. Luôn kiểm tra nội dung trước khi đăng.<br />Lịch sử chỉ lưu trên trình duyệt này.</p>
  </div></footer>;
}
