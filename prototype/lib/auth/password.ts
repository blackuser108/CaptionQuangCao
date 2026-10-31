import { safeNext } from './core.ts';
import { privateHeaders } from './supabase.ts';

export function passwordFailure(status: number, code: string, headers = privateHeaders()) {
  const messages: Record<string, string> = {
    AUTH_NOT_CONFIGURED: 'Đăng nhập email chưa khả dụng. Bạn vẫn có thể dùng khách.',
    INVALID_ORIGIN: 'Yêu cầu không hợp lệ. Hãy tải lại trang rồi thử lại.',
    INVALID_INPUT: 'Kiểm tra email và mật khẩu đã nhập.',
    INVALID_CREDENTIALS: 'Chưa đăng nhập được. Kiểm tra email, mật khẩu và trạng thái xác nhận email.',
    RATE_LIMITED: 'Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.',
    AUTH_UNAVAILABLE: 'Dịch vụ tài khoản chưa phản hồi. Hãy thử lại; bạn vẫn dùng khách được.',
  };
  return Response.json({ error: { code, message: messages[code] || messages.AUTH_UNAVAILABLE } }, { status, headers });
}

export async function readPasswordInput(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json' || Number(request.headers.get('content-length')) > 4096) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  const timeout = AbortSignal.timeout(5000), cancel = () => { void reader.cancel().catch(() => {}); };
  timeout.addEventListener('abort', cancel, { once: true });
  let text = '', size = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      const { value, done } = await reader.read(); timeout.throwIfAborted();
      if (done) { text += decoder.decode(); break; }
      size += value.byteLength;
      if (size > 4096) throw new Error('INVALID_INPUT');
      text += decoder.decode(value, { stream: true });
    }
    const input = JSON.parse(text);
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['email', 'password', 'next'].includes(k))) throw new Error('INVALID_INPUT');
    if (typeof input.email !== 'string' || typeof input.password !== 'string') throw new Error('INVALID_INPUT');
    const email = input.email.trim(), password = input.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 128) throw new Error('INVALID_INPUT');
    return { email, password, next: safeNext(input.next) };
  } catch (error) { cancel(); throw error; }
  finally { timeout.removeEventListener('abort', cancel); reader.releaseLock(); }
}
