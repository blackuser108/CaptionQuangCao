'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';

const links = [
  ['/', 'Trang chủ'],
  ['/features', 'Tính năng'],
  ['/create', 'Tạo nội dung'],
  ['/history', 'Lịch sử'],
  ['/about', 'Về chúng tôi'],
  ['/login', 'Đăng nhập'],
] as const;

export function Brand() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="brand-name">Bàn biên tập</span>
    </>
  );
}

export default function SiteHeader() {
  const pathname = usePathname(),
    menu = useRef<HTMLDetailsElement>(null);
  const auth = useAuth();
  const accountLink: readonly [string, string] =
    auth.phase === 'ready' && auth.user
      ? ['/account', 'Tài khoản']
      : auth.phase === 'ready'
        ? ['/login', 'Đăng nhập']
        : ['/account', 'Kiểm tra phiên…'];

  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="wrap nav">
        <Link className="brand" href="/" aria-label="Bàn biên tập — Trang chủ">
          <Brand />
        </Link>
        <nav className="nav-links nav-pill-group" aria-label="Điều hướng chính">
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Trang chủ</span>
          </Link>
          <Link href="/features" aria-current={pathname === '/features' ? 'page' : undefined}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Tính năng</span>
          </Link>
          <Link href="/history" aria-current={pathname === '/history' ? 'page' : undefined}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Lịch sử</span>
          </Link>
          <Link href="/about" aria-current={pathname === '/about' ? 'page' : undefined}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Về chúng tôi</span>
          </Link>
        </nav>
        <div className="nav-actions">
          <Link
            className="nav-account-btn"
            href={accountLink[0]}
            aria-current={pathname === accountLink[0] ? 'page' : undefined}
          >
            {accountLink[1]}
          </Link>
          <Link
            className="button nav-cta-btn"
            href="/create"
            aria-current={pathname === '/create' ? 'page' : undefined}
          >
            Bắt đầu viết <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <details
          className="mobile-menu"
          ref={menu}
          suppressHydrationWarning
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menu.current?.open) {
              closeMenu();
              menu.current.querySelector('summary')?.focus();
            }
          }}
        >
          <summary>
            Menu <span aria-hidden="true">＋</span>
          </summary>
          <nav
            aria-label="Điều hướng điện thoại"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a')) closeMenu();
            }}
          >
            {links.map((link) => (
              <Link
                key={link[0]}
                href={link[0] === '/login' ? accountLink[0] : link[0]}
                aria-current={pathname === link[0] ? 'page' : undefined}
              >
                {link[0] === '/login' ? accountLink[1] : link[1]}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
