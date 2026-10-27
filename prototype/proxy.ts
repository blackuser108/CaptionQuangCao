import { NextResponse, type NextRequest } from 'next/server';
import { authSettings } from './lib/auth/core';
import { requestContext } from './lib/auth/supabase';

export async function proxy(request: NextRequest) {
  const config = authSettings(process.env);
  if (!config) return NextResponse.next();
  const ctx = requestContext(request, config);
  if (ctx.hasSession) { try { await ctx.client.auth.getClaims(); } catch { /* Route kiểm getUser và trả lỗi nếu không xác minh được. */ } }
  const changed = ctx.headers.getSetCookie();
  // Cookie mới phải tới cả Server Components và browser trong cùng request.
  for (const cookie of changed) { const [pair] = cookie.split(';'); const split = pair.indexOf('='); request.cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
  const response = NextResponse.next({ request });
  ctx.headers.forEach((value, name) => { if (name !== 'set-cookie') response.headers.set(name, value); });
  for (const value of changed) response.headers.append('Set-Cookie', value);
  return response;
}
export const config = { matcher: ['/account', '/create', '/history', '/api/auth/:path*', '/auth/:path*'] };
