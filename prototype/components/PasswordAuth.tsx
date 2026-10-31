'use client';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export default function PasswordAuth() {
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const inFlight = useRef(false), notice = useRef<HTMLParagraphElement>(null);
  const available = auth.phase === 'ready' && auth.emailEnabled;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !available || !auth.confirmDiscard()) return;
    const form = event.currentTarget, fields = new FormData(form);
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ email: fields.get('email'), password: fields.get('password'), mode, next: '/account' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Chưa xác minh được đăng nhập. Hãy thử lại.');
      if (result.status === 'authenticated' && result.next === '/account') {
        form.reset(); auth.announce(); window.location.assign('/account'); return;
      }
      if (result.status !== 'confirmation_required') throw new Error('Chưa xác minh được đăng nhập. Hãy thử lại.');
      form.reset(); setMessage(result.message); setVisible(false);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'Kết nối bị gián đoạn. Hãy thử lại hoặc tiếp tục dùng khách.');
    } finally {
      inFlight.current = false; setBusy(false);
      requestAnimationFrame(() => notice.current?.focus());
    }
  }
  return <div className="password-auth">
    <form onSubmit={submit}>
      <div className="input-fields">
        <label htmlFor="auth-email">Email<input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy} placeholder="ban@example.com" /></label>
        <label htmlFor="auth-password">Mật khẩu ứng dụng<input id="auth-password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : 1} maxLength={128} required disabled={busy} aria-describedby="password-help" /></label>
        <button type="button" className="password-toggle" onClick={() => setVisible(value => !value)} aria-controls="auth-password" aria-pressed={visible} disabled={busy}>{visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
      </div>
      <p className="small" id="password-help">{mode === 'signup' ? 'Dùng ít nhất 8 ký tự. Kiểm tra email xác nhận sau khi đăng ký.' : 'Dùng mật khẩu đã tạo cho ứng dụng, không phải mật khẩu Google.'}</p>
      <button className="button primary" type="submit" disabled={!available || busy}>{busy ? 'Đang xử lý…' : mode === 'signup' ? 'Tạo tài khoản bằng email' : 'Đăng nhập bằng email'}</button>
      {!available && <p className="small" role="status">{auth.phase === 'checking' ? 'Đang kiểm tra khả năng đăng nhập…' : 'Đăng nhập email chưa khả dụng. Bạn vẫn có thể dùng khách.'}</p>}
      <p ref={notice} tabIndex={-1} role={error ? 'alert' : 'status'} className="auth-feedback">{error || message}</p>
    </form>
    <button className="password-switch" type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); setVisible(false); }}>{mode === 'login' ? 'Chưa có tài khoản? Đăng ký email' : 'Đã có tài khoản? Đăng nhập'}</button>
  </div>;
}
