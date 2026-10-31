// Run against explicit local fixture only. No real credentials, accounts or inference.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:3303',out=path.resolve(process.env.EVIDENCE_DIR||'../evidence/auth-port-20261101');
const result={checks:[],pageErrors:[],realAuth:false,realInference:0};
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const ctx=await browser.newContext(),p=await ctx.newPage();await ctx.route('**/api/generate',r=>r.abort());p.on('pageerror',e=>result.pageErrors.push(e.message));p.on('dialog',d=>d.accept());
 async function check(name,fn){await fn();result.checks.push(name);console.log('PASS',name)}
 async function login(email,password){await p.goto(base+'/login',{waitUntil:'networkidle'});await p.getByLabel('Email',{exact:true}).fill(email);await p.getByLabel('Mật khẩu ứng dụng',{exact:true}).fill(password);await p.getByRole('button',{name:'Đăng nhập bằng email',exact:true}).click();}
 for(const width of[390,1440]){await p.setViewportSize({width,height:1000});for(const route of['/','/login','/create']){await p.goto(base+route,{waitUntil:'networkidle'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(out,`after-${route.slice(1)||'home'}-${width}.png`),fullPage:true});}}
 await check('Email form retains main design, Google/guest options and has no signup/reset',async()=>{
  await p.goto(base+'/login',{waitUntil:'networkidle'});assert.equal(await p.getByRole('button',{name:'Tiếp tục với Google'}).isEnabled(),true);
  assert.equal(await p.getByText(/Đăng ký|Quên mật khẩu/).count(),0);
  const field=p.getByLabel('Mật khẩu ứng dụng',{exact:true});await p.getByRole('button',{name:'Hiện mật khẩu'}).click();assert.equal(await field.getAttribute('type'),'text');await p.getByRole('button',{name:'Ẩn mật khẩu'}).click();assert.equal(await field.getAttribute('type'),'password');
  await p.getByRole('button',{name:'Đăng nhập bằng email',exact:true}).click();assert.equal(await p.getByLabel('Email',{exact:true}).evaluate(e=>e.validity.valueMissing),true);
 });
 await check('Wrong credentials and provider outage show private errors and focus; pending locks submit',async()=>{
  await login('a@example.test','wrong');await p.getByRole('button',{name:'Đang đăng nhập…'}).waitFor();await p.locator('.password-login [role=alert]').filter({hasText:'Chưa đăng nhập được'}).waitFor();assert.equal(await p.locator('.password-login [role=alert]').evaluate(e=>e===document.activeElement),true);
  await login('a@example.test','provider-error');await p.locator('.password-login [role=alert]').filter({hasText:'Hãy thử lại sau'}).waitFor();assert.doesNotMatch(await p.locator('main').innerText(),/PRIVATE_PROVIDER|PRIVATE_CREDENTIALS/);
  await p.screenshot({path:path.join(out,'after-login-error.png'),fullPage:true});
 });
 await check('SSR login A, account reload, HttpOnly cookie, menu and logout',async()=>{
  await login('a@example.test','Fixture-pass-123');await p.waitForURL(base+'/account');await p.getByText('a@example.test',{exact:true}).waitFor();await p.reload({waitUntil:'networkidle'});await p.getByText('a@example.test',{exact:true}).waitFor();
  const cookies=await ctx.cookies();assert.ok(cookies.some(c=>c.name==='bbt-auth'&&c.httpOnly&&c.sameSite==='Lax'));
  await p.screenshot({path:path.join(out,'after-account-A.png'),fullPage:true});
  await p.getByRole('button',{name:'Đăng xuất / dùng khách'}).click();await p.waitForURL(/\/login\?loggedOut=1/);assert.equal((await (await ctx.request.get(base+'/api/auth/session')).json()).status,'guest');
 });
 await check('SSR login B is verified separately; failed session stays unverified',async()=>{
  await login('b@example.test','Fixture-pass-123');await p.waitForURL(base+'/account');await p.getByText('b@example.test',{exact:true}).waitFor();
  await p.goto(base+'/history',{waitUntil:'networkidle'});
  await p.route('**/api/auth/session',r=>r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:{code:'SESSION_UNVERIFIED'}})}));
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));});
  await p.getByRole('heading',{name:'Chưa xác minh được phiên.',exact:true}).waitFor();await p.unroute('**/api/auth/session');
 });
 await check('Google initiation retains fixed provider, PKCE and redirect without external login',async()=>{
  const r=await ctx.request.post(base+'/auth/login',{headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},data:'next=%2Faccount',maxRedirects:0});assert.equal(r.status(),303);const u=new URL(r.headers().location);assert.equal(u.origin,'https://abcdefghijklmnopqrst.supabase.co');assert.equal(u.searchParams.get('provider'),'google');assert.ok(u.searchParams.get('code_challenge'));assert.ok(r.headers()['set-cookie']);
 });
 await check('Leaving pending email login aborts and a late response cannot redirect the new page',async()=>{
  const other=await browser.newContext(),q=await other.newPage();let release;
  await other.route('**/api/auth/session',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'guest',user:null,configured:true,loginEnabled:true,emailEnabled:true})}));
  await other.route('**/api/generate',r=>r.abort());
  await other.route('**/auth/password',async r=>{await new Promise(resolve=>release=resolve);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'authenticated',next:'/account'})}).catch(()=>{});});
  await q.addInitScript(()=>{const fetch=window.fetch;window.fetch=(url,init)=>{if(String(url)==='/auth/password')window.__loginSignal=init.signal;return fetch(url,init)};});
  await q.goto(base+'/login',{waitUntil:'networkidle'});await q.getByLabel('Email',{exact:true}).fill('a@example.test');await q.getByLabel('Mật khẩu ứng dụng',{exact:true}).fill('Fixture-pass-123');await q.getByRole('button',{name:'Đăng nhập bằng email',exact:true}).click();await q.waitForFunction(()=>window.__loginSignal);await q.getByRole('link',{name:/Tiếp tục không đăng nhập/}).click();await q.waitForURL(base+'/create');assert.equal(await q.evaluate(()=>window.__loginSignal.aborted),true);release();await q.waitForTimeout(500);assert.equal(q.url(),base+'/create');await other.close();
 });
 assert.deepEqual(result.pageErrors,[]);
}finally{await browser.close();fs.writeFileSync(path.join(out,'password-browser.json'),JSON.stringify(result,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
