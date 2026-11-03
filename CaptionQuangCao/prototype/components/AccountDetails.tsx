'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, IdentityNotice } from './AuthProvider';
import AuthActions from './AuthActions';
export default function AccountDetails({ user }: { user: { id: string; email: string | null } }) {
  const auth = useAuth(), router = useRouter();
  useEffect(() => { if (auth.phase === 'ready' && auth.user?.id !== user.id) router.refresh(); }, [auth.phase, auth.user?.id, user.id, router]);
  if (auth.phase !== 'ready' || auth.user?.id !== user.id) return <IdentityNotice />;
  return <div className="wrap list-page" data-auth-private><p className="eyebrow">Tài khoản đã xác minh phía server</p><h1>Chào bạn, mời vào bàn.</h1><p>{user.email || 'Tài khoản Google'}</p><section className="draft"><h2>Lịch sử riêng trên trình duyệt này.</h2><p>Không tự nhập lịch sử khách. localStorage không phải kho bảo mật, sao lưu hoặc đồng bộ đa thiết bị.</p><Link className="button" href="/history">Xem lịch sử tài khoản</Link></section><p>Đăng xuất hoặc đổi tài khoản sẽ bỏ bản đang nhập; hãy copy trước khi chuyển.</p><AuthActions logout /></div>;
}
