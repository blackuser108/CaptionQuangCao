import type { Metadata } from 'next';
import localFont from 'next/font/local';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import AuthProvider from '../components/AuthProvider';
import './globals.css';

const editorial = localFont({
  src: [
    { path: './fonts/lora-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/lora-500.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-editorial',
  display: 'swap',
});

const headline = localFont({
  src: [
    { path: './fonts/playfair-700.ttf', weight: '700', style: 'normal' },
    { path: './fonts/playfair-700i.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-headline',
  display: 'swap',
});

const sans = localFont({
  src: [
    { path: './fonts/be-vietnam-pro-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/be-vietnam-pro-500.ttf', weight: '500', style: 'normal' },
    { path: './fonts/be-vietnam-pro-600.ttf', weight: '600', style: 'normal' },
    { path: './fonts/be-vietnam-pro-700.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Bàn biên tập · Từ dữ kiện đến bài viết', template: '%s · Bàn biên tập' },
  description: 'Tạo bản nháp caption, headline và hashtag tiếng Việt từ dữ kiện sản phẩm.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${editorial.variable} ${headline.variable} ${sans.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <AuthProvider>
          <a className="skip" href="#main">
            Đến nội dung chính
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
