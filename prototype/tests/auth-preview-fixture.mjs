// Local browser QA only. Never import this module in the app or deploy it.
// Run next start with: AUTH_TEST_FIXTURE=local-only node --import ./tests/auth-preview-fixture.mjs ...
if (process.env.AUTH_TEST_FIXTURE !== 'local-only' || process.env.AUTH_SITE_URL !== 'http://127.0.0.1:3101') throw new Error('Local fixture requires explicit opt-in and fixed loopback origin');
const upstream = 'https://abcdefghijklmnopqrst.supabase.co/auth/v1';
const user = email => ({ id: email.startsWith('b@') ? '22222222-2222-4222-8222-222222222222' : '11111111-1111-4111-8111-111111111111', email });
function session(email) {
  const exp = Math.floor(Date.now() / 1000) + 3600, u = user(email);
  const jwt = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: u.id, email, exp })).toString('base64url'), 'fixture'].join('.');
  return { access_token: jwt, refresh_token: 'LOCAL_FIXTURE_ONLY', expires_in: 3600, expires_at: exp, token_type: 'bearer', user: u };
}
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith(upstream + '/')) throw new Error('Browser fixture forbids external network');
  if (url.includes('/token?grant_type=password')) {
    const body = JSON.parse(String(init.body));
    if (body.password !== 'Fixture-pass-123') return Response.json({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 });
    return Response.json(session(body.email));
  }
  if (url.includes('/signup')) return Response.json({ ...user('pending@example.test'), identities: [] });
  if (url.includes('/logout')) return new Response(null, { status: 204 });
  if (url.endsWith('/user')) {
    const auth = new Headers(init?.headers).get('Authorization') || '';
    const claims = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString());
    return Response.json(user(claims.email));
  }
  throw new Error('Unexpected local auth fixture endpoint');
};
