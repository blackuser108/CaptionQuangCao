'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function AuthActions({ logout = false, enabled }: { logout?: boolean; enabled?: boolean }) {
  const auth = useAuth(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function exit() {
    if (!auth.confirmDiscard()) return;
    setBusy(true); setError('');
    try {
      const result = await fetch('/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
      if (!result.ok) throw new Error('SIGNOUT_FAILED');
      auth.announce(); window.location.assign('/login?loggedOut=1');
    } catch { setError('Chưa đăng xuất được. Hãy kiểm tra kết nối rồi thử lại.'); setBusy(false); }
  }
  if (logout) return <div><button className="button ghost" disabled={busy} onClick={exit}>{busy ? 'Đang thoát…' : 'Đăng xuất / dùng khách'}</button>{error && <p role="alert">{error}</p>}</div>;
  const available = enabled ?? (auth.phase === 'ready' && auth.loginEnabled);
  return <><form action="/auth/login" method="post" onSubmit={event => { if (!auth.confirmDiscard()) event.preventDefault(); }}><input type="hidden" name="next" value="/account" /><button className="google-button" disabled={!available}><span className="google-symbol" aria-hidden="true">G</span>Tiếp tục với Google</button></form>{!available && <p className="small" id="google-unavailable">Chưa khả dụng — Google OAuth chưa được cấu hình hoặc phiên đang được kiểm tra.</p>}</>;
}
