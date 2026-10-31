'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export default function PasswordLogin() {
  const auth = useAuth(), inFlight = useRef(false), notice = useRef<HTMLParagraphElement>(null), pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [visible, setVisible] = useState(false), [error, setError] = useState('');
  const available = auth.phase === 'ready' && auth.emailEnabled;
  useEffect(() => { if (error) notice.current?.focus(); }, [error]);
  useEffect(() => () => pending.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !available || !auth.confirmDiscard()) return;
    const form = event.currentTarget, fields = new FormData(form);
    const controller = new AbortController(); pending.current = controller;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]), body: JSON.stringify({ email: fields.get('email'), password: fields.get('password'), next: '/account' }) });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || result.status !== 'authenticated' || result.next !== '/account') {
        const messages: Record<string, string> = {
          INVALID_CREDENTIALS: 'Chưa đăng nhập được. Kiểm tra email, mật khẩu và trạng thái xác nhận email.',
          INVALID_INPUT: 'Kiểm tra email và mật khẩu đã nhập.',
          RATE_LIMITED: 'Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.',
        };
        throw new Error(Object.hasOwn(messages, result.error?.code) ? messages[result.error.code] : 'Chưa đăng nhập được. Hãy thử lại sau; bạn vẫn dùng khách được.');
      }
      form.reset(); auth.announce(); window.location.assign('/account');
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error && cause.name === 'Error' ? cause.message : 'Kết nối bị gián đoạn. Hãy thử lại hoặc tiếp tục dùng khách.');
    } finally { pending.current = null; inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <form className="password-login" onSubmit={submit} aria-busy={busy}>
    <fieldset className="input-fields" disabled={busy}>
      <legend className="sr-only">Đăng nhập bằng email</legend>
      <label htmlFor="auth-email">Email<input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label htmlFor="auth-password">Mật khẩu ứng dụng<input id="auth-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" minLength={1} maxLength={128} required aria-describedby="password-help" /></label>
      <button type="button" className="text-link" aria-controls="auth-password" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
    </fieldset>
    <p className="small muted" id="password-help">Dùng tài khoản đã có và mật khẩu của ứng dụng, không phải mật khẩu Google.</p>
    <button className="button primary" type="submit" disabled={!available || busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập bằng email'}</button>
    {!available && <p className="small" role="status">{auth.phase === 'checking' ? 'Đang kiểm tra khả năng đăng nhập…' : 'Đăng nhập email chưa khả dụng. Bạn vẫn có thể dùng khách.'}</p>}
    <p ref={notice} tabIndex={-1} role="alert" className="small">{error}</p>
  </form>;
}
