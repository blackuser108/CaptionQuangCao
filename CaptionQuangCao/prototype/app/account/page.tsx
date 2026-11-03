import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { authSettings } from '../../lib/auth/core';
import { requestContext, verifiedUser } from '../../lib/auth/supabase';
import AccountDetails from '../../components/AccountDetails';
import AuthActions from '../../components/AuthActions';

export const metadata: Metadata = { title: 'Tài khoản', robots: { index: false } };
export const dynamic = 'force-dynamic';
export default async function Account() {
  const settings = authSettings(process.env);
  if (!settings) redirect('/login?next=/account');
  const ctx = requestContext(new Request(settings.origin + '/account', { headers: await headers() }), settings);
  if (!ctx.hasSession) redirect('/login?next=/account');
  let user;
  try { user = await verifiedUser(ctx.client); } catch { return <div className="wrap list-page"><h1>Chưa xác minh được phiên.</h1><p>Không hiển thị thông tin tài khoản khi chưa xác minh. Bạn có thể đăng nhập lại hoặc chủ động thoát trên trình duyệt này.</p><Link href="/login">Đăng nhập lại</Link><AuthActions logout /></div>; }
  return <AccountDetails user={user} />;
}
