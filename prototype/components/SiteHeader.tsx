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
      Bàn biên tập
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
  const navLink = ([href, label]: readonly [string, string]) => (
    <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
      {label}
    </Link>
  );

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
        <nav className="nav-links" aria-label="Điều hướng chính">
          {(
            [
              ['/features', 'Tính năng'],
              ['/about', 'Về chúng tôi'],
              ['/history', 'Lịch sử'],
            ] as const
          ).map(navLink)}
        </nav>
        <div className="nav-actions">
          {navLink(accountLink)}
          <Link
            className="button"
            href="/create"
            aria-current={pathname === '/create' ? 'page' : undefined}
          >
            Bắt đầu viết <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <details
          className="mobile-menu"
          ref={menu}
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
            {links.map((link) => navLink(link[0] === '/login' ? accountLink : link))}
          </nav>
        </details>
      </div>
    </header>
  );
}
