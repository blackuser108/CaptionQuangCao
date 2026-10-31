// Explicitly opt-in local browser fixture. Never imported by application code.
if (process.env.AUTH_TEST_FIXTURE !== 'local-only' || process.env.AUTH_SITE_URL !== 'http://127.0.0.1:3303') throw new Error('Fixture requires fixed loopback origin and explicit opt-in');
const upstream='https://abcdefghijklmnopqrst.supabase.co/auth/v1/';
const user=email=>({id:email.startsWith('b@')?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',email});
globalThis.fetch=async(input,init)=>{
  const url=String(input); if(!url.startsWith(upstream))throw new Error('Fixture blocks external network');
  if(url.includes('/token?grant_type=password')){
    const {email,password}=JSON.parse(String(init.body));
    await new Promise(r=>setTimeout(r,250));
    if(password==='provider-error')return Response.json({msg:'PRIVATE_PROVIDER'},{status:503});
    if(password!=='Fixture-pass-123')return Response.json({msg:'PRIVATE_CREDENTIALS',code:'invalid_credentials'},{status:400});
    const u=user(email),exp=Math.floor(Date.now()/1000)+3600;
    const jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:u.id,email,exp})).toString('base64url'),'fixture'].join('.');
    return Response.json({access_token:jwt,refresh_token:'LOCAL_FIXTURE_ONLY',expires_at:exp,expires_in:3600,token_type:'bearer',user:u});
  }
  if(url.includes('/logout'))return new Response(null,{status:204});
  if(url.endsWith('/user')){const auth=new Headers(init?.headers).get('Authorization')||'';const claims=JSON.parse(Buffer.from(auth.split('.')[1],'base64url').toString());return Response.json(user(claims.email));}
  throw new Error('Unexpected fixture endpoint');
};
