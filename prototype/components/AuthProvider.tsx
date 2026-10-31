'use client';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IdentityFence, validUserId } from '../lib/auth/core';

type User = { id: string; email: string | null };
type Snapshot = { phase: 'checking' | 'ready' | 'error'; user: User | null; configured: boolean; loginEnabled: boolean; emailEnabled: boolean; path: string };
const initial: Snapshot = { phase: 'checking', user: null, configured: false, loginEnabled: false, emailEnabled: false, path: '' };
function useIdentity() {
  const pathname = usePathname(), [snapshot, setSnapshot] = useState(initial);
  const fence = useRef(new IdentityFence()).current;
  const serial = useRef(0), pending = useRef<AbortController | null>(null), dirty = useRef(false), channel = useRef<BroadcastChannel | null>(null);
  const confirmDiscard = useCallback(() => !dirty.current || window.confirm('Chuyển trang hoặc tài khoản sẽ bỏ bản đang nhập và hủy yêu cầu chưa xong. Lịch sử đã lưu vẫn còn. Tiếp tục?'), []);
  const markDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const announce = useCallback(() => {
    if (channel.current) channel.current.postMessage('recheck');
    else { try { localStorage.setItem('ban-bien-tap:auth-change', crypto.randomUUID()); } catch { /* Tín hiệu không phải bằng chứng danh tính. */ } }
  }, []);
  const refresh = useCallback(async () => {
    const seq = ++serial.current;
    document.documentElement.dataset.authHidden = 'true';
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    fence.suspend(); setSnapshot(previous => ({ ...previous, phase: 'checking' }));
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      const data = await response.json();
      if (!response.ok || !['guest', 'authenticated'].includes(data.status) || (data.status === 'authenticated' && (!validUserId(data.user?.id) || (data.user.email !== null && typeof data.user.email !== 'string'))) || (data.status === 'guest' && data.user !== null)) throw new Error('IDENTITY_UNVERIFIED');
      if (seq !== serial.current) throw new Error('SUPERSEDED');
      const user: User | null = data.status === 'guest' ? null : { id: data.user.id, email: data.user.email };
      const previous = fence.revision; fence.verify(user?.id || null);
      setSnapshot({ phase: 'ready', user, configured: data.configured === true, loginEnabled: data.loginEnabled === true, emailEnabled: data.emailEnabled === true, path: window.location.pathname });
      if (previous !== fence.revision) announce();
      return fence.capture();
    } catch (error) {
      if (seq === serial.current) { fence.fail(); setSnapshot(previous => ({ ...previous, phase: 'error' })); }
      throw error;
    }
  }, [announce, fence]);
  useEffect(() => { void refresh().catch(() => {}); }, [pathname, refresh]);
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') void refresh().catch(() => {}); };
    const hide = () => { document.documentElement.dataset.authHidden = 'true'; fence.suspend(); setSnapshot(previous => ({ ...previous, phase: 'checking' })); };
    const changed = () => { hide(); check(); };
    const visibility = () => { if (document.visibilityState === 'hidden') hide(); else check(); };
    const storage = (event: StorageEvent) => { if (event.key === 'ban-bien-tap:auth-change') changed(); };
    const leaving = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest?.('a[href]');
      if (!anchor || !dirty.current) return;
      const url = new URL((anchor as HTMLAnchorElement).href);
      if (['/create', '/history'].includes(url.pathname) && url.origin === location.origin) return;
      if (!confirmDiscard()) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const unload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    if ('BroadcastChannel' in window) { channel.current = new BroadcastChannel('ban-bien-tap:auth'); channel.current.onmessage = changed; }
    window.addEventListener('focus', check); window.addEventListener('pageshow', check); window.addEventListener('pagehide', hide); window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility); document.addEventListener('click', leaving, true); window.addEventListener('beforeunload', unload);
    const timer = setInterval(check, 30000);
    return () => { clearInterval(timer); pending.current?.abort(); channel.current?.close(); channel.current = null; window.removeEventListener('focus', check); window.removeEventListener('pageshow', check); window.removeEventListener('pagehide', hide); window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', leaving, true); window.removeEventListener('beforeunload', unload); };
  }, [confirmDiscard, fence, refresh]);
  const phase = snapshot.phase === 'ready' && snapshot.path !== pathname ? 'checking' : snapshot.phase;
  useEffect(() => { if (phase === 'ready') delete document.documentElement.dataset.authHidden; else document.documentElement.dataset.authHidden = 'true'; }, [phase]);
  return { ...snapshot, phase, fence, refresh, announce, markDirty, confirmDiscard };
}
const AuthContext = createContext<ReturnType<typeof useIdentity> | null>(null);
export default function AuthProvider({ children }: { children: React.ReactNode }) { return <AuthContext.Provider value={useIdentity()}>{children}</AuthContext.Provider>; }
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is required'); return value; }
export function IdentityNotice() {
  const auth = useAuth();
  return <section className="wrap list-page" role="status"><h1>{auth.phase === 'checking' ? 'Đang kiểm tra phiên…' : 'Chưa xác minh được phiên.'}</h1><p>Nội dung riêng được ẩn trong lúc kiểm tra. Không tự chuyển lịch sử sang vùng khác.</p>{auth.phase === 'error' && <><button onClick={() => void auth.refresh().catch(() => {})}>Kiểm tra lại</button><p><Link href="/login">Đăng nhập lại</Link> hoặc chủ động thoát phiên ở <Link href="/account">Tài khoản</Link> để dùng khách.</p></>}</section>;
}
