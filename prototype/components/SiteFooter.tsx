import Link from 'next/link';
import { Brand } from './SiteHeader';

export default function SiteFooter() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="wrap">
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div className="footer-brand-col">
            <Link href="/" className="brand" aria-label="Bàn biên tập — Về trang chủ">
              <Brand />
            </Link>
            <p className="footer-tagline">
              Agent AI hỗ trợ viết caption, giật headline và tạo hashtag tối ưu cho bài đăng Facebook &amp; Instagram từ dữ kiện sản phẩm thật.
            </p>
            <div className="footer-badges">
              <span className="footer-badge">⚡ Bộ bản nháp 3 / 3 / 5</span>
              <span className="footer-badge">Lịch sử trên trình duyệt</span>
            </div>
          </div>

          {/* Developer Contact Info */}
          <div className="footer-col">
            <h4 className="footer-heading">Thông tin liên hệ</h4>
            <ul className="footer-contact-list">
              <li>
                <span className="contact-icon" aria-hidden="true" style={{ overflow: 'hidden', padding: 0 }}>
                  <img src="/image/authorAvatar/Long.jpg" alt="Hoàng Long" width="32" height="32" style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: 8 }} />
                </span>
                <div>
                  <span className="contact-label">Phụ trách:</span>
                  <strong className="contact-value">Phan Hoàng Long</strong>
                </div>
              </li>
              <li>
                <span className="contact-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                </span>
                <div>
                  <span className="contact-label">Email:</span>
                  <a href="mailto:longph140108@gmail.com" className="contact-link">longph140108@gmail.com</a>
                </div>
              </li>
              <li>
                <span className="contact-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </span>
                <div>
                  <span className="contact-label">Hotline / Zalo:</span>
                  <a href="tel:0934865593" className="contact-link">0934865593</a>
                </div>
              </li>
            </ul>
          </div>

          {/* Social Media & Channels */}
          <div className="footer-col">
            <h4 className="footer-heading">Mạng xã hội</h4>
            <p className="footer-subtext">Kết nối với chúng tôi trên các nền tảng:</p>
            <div className="footer-socials">
              <a href="https://facebook.com/hoanglong.phan.10441" target="_blank" rel="noopener noreferrer" className="social-pill" aria-label="Facebook Hoàng Long Phan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </a>
              <a href="https://zalo.me/0934865593" target="_blank" rel="noopener noreferrer" className="social-pill" aria-label="Zalo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.42 3.86 7.02-.17.9-.62 2.53-.66 2.68-.07.24.13.43.35.31.28-.15 2.45-1.52 3.42-2.15.97.24 2 .38 3.03.38 5.52 0 10-4.03 10-9s-4.48-9-10-9zm-3.5 11.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3.5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3.5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <span>Zalo</span>
              </a>
              <a
                href="https://github.com/blackuser108/CaptionQuangCao/tree/main/prototype"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill"
                aria-label="GitHub Repository CaptionQuangCao"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-copy">
            <p>Bản nháp cho Feed Facebook &amp; Instagram. Luôn kiểm tra nội dung trước khi đăng.</p>
            <p className="footer-note">Lịch sử chỉ lưu trên trình duyệt này, không mã hóa hoặc đồng bộ thiết bị.</p>
          </div>
          <div className="footer-credit">
            <span>© 2026 Bàn biên tập.</span>
            <span>Phát triển bởi <strong>Team AIT1-HUST</strong> · Hoàng Long (14/01)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
