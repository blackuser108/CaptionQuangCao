// Every generation is intercepted before it can reach the local AI API.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:3000', key = 'ban-bien-tap:history:v1', oldKey = 'ban-bien-tap:prototype:history:v1';
const out = path.resolve(__dirname, process.argv.find(arg => arg.startsWith('--out='))?.slice(6) || '../../evidence/redesign-v2-implementation');
const checks = [], errors = [], layouts = [], requests = [], external = [];
const norm = text => text.normalize('NFC').replace(/\r\n?/g, '\n');
const output = { captions: ['MẪU KIỂM THỬ · Sổ tay Mây A5, 80 trang kẻ ngang.', 'MẪU KIỂM THỬ · Đi học cần ghi gì?\n\nSổ tay Mây có bìa xanh, khổ A5 và 80 trang kẻ ngang.', 'MẪU KIỂM THỬ · '+ 'Nội dung dài để kiểm tra. '.repeat(13)+'\n📘👩🏽‍💻'], headlines: ['MẪU · Sổ tay Mây', 'MẪU · Ghi chép bài học', 'MẪU · '+ 'Tiêu đề dài '.repeat(5)], hashtags: ['#MauKiemThu', '#SoTayMay', '#GhiBai', '#SinhVien', '#SoTayA5'] };
const entry = { id: 'v2-legacy-fixture', createdAt: '2026-10-27T10:00:00.000Z', input: { productName: 'MẪU KIỂM THỬ CŨ', description: 'Sổ tay A5, 80 trang.', audience: 'Sinh viên', tone: 'youthful' }, output };
let reply = { status: 200, body: output }, hold = null;
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS', name); }
async function shot(page, name) { await page.screenshot({ path: path.join(out, name+'.png'), fullPage: true }); }
async function saved(page) { return page.evaluate(k => localStorage.getItem(k), key); }
async function navigate(page, route) { await page.goto(base+route, { waitUntil:'networkidle' }); }
async function done(page) { await page.waitForFunction(() => document.querySelector('.primary') && !document.querySelector('.primary').disabled); }
async function generate(page, again=false) {
  await page.getByRole('button',{name:again?'Tạo lại':'Tạo nội dung',exact:again}).click();
  await done(page);
}
async function copyAll(page, scope, expected) {
  const texts = [...expected.captions,...expected.headlines,...expected.hashtags];
  const buttons = page.locator(scope+' .copy-button');
  assert.equal(await buttons.count(),11);
  for(let i=0;i<11;i++) {
    await buttons.nth(i).click();
    assert.equal(norm(await page.evaluate(()=>navigator.clipboard.readText())),texts[i]);
  }
}
async function layout(page,width,route,state='empty') {
  const metric = await page.evaluate(()=>({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,
    badLinks:[...document.querySelectorAll('a')].filter(a=>a.getAttribute('href')?.includes('.html')).length}));
  assert.ok(metric.scroll<=metric.client,JSON.stringify({width,route,state,...metric}));
  assert.equal(metric.h1,1); assert.equal(metric.badLinks,0);
  layouts.push({route,state,...metric});
}

(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
  await context.route('**/api/generate',async route=>{
    requests.push(route.request().postDataJSON());
    if(hold)await hold.promise;
    await route.fulfill({status:reply.status,contentType:'application/json',body:JSON.stringify(reply.body)}).catch(()=>{});
  });
  const page=await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url())});
  try {
    await check('35 route/viewport combinations: direct URLs, refresh, no auto generation, no overflow',async()=>{
      for(const width of [320,390,768,1024,1440]) {
        await page.setViewportSize({width,height:1000});
        for(const route of ['/','/features','/create','/history','/about','/login','/account']) {
          const response=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);
          await page.reload({waitUntil:'networkidle'});await layout(page,width,route);
          if([390,1440].includes(width)&&['/','/create','/history','/about','/login'].includes(route))await shot(page,(route==='/'?'home':route.slice(1))+'-empty-'+width);
        }
      }
      assert.equal(requests.length,0);
    });
    await check('Honest auth pages and no team placeholders or unapproved links',async()=>{
      await navigate(page,'/login');const auth=await page.evaluate(()=>fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.json()));
      assert.equal(await page.getByRole('button',{name:'Tiếp tục với Google'}).isDisabled(),!auth.loginEnabled);
      await navigate(page,'/account');assert.equal(new URL(page.url()).pathname,'/login');assert.equal(await page.getByRole('button',{name:/Đăng xuất/}).count(),0);
      await navigate(page,'/about');assert.doesNotMatch(await page.locator('main').innerText(),/chờ xác nhận|thành viên mẫu/);
      const links=await page.locator('a').evaluateAll(a=>a.map(e=>e.getAttribute('href')));assert.ok(!links.some(x=>/pricing|enterprise|newsletter|blog|\.html/.test(x)));
    });
    await check('Mobile keyboard Menu Enter/Space/Escape, current page, focus and 48px targets',async()=>{
      await page.setViewportSize({width:390,height:844});await navigate(page,'/');
      const summary=page.locator('.mobile-menu summary');await summary.focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('.mobile-menu').getAttribute('open'),'');
      assert.ok((await summary.evaluate(e=>getComputedStyle(e).outlineStyle))!=='none');
      for(const h of await page.locator('.mobile-menu nav a').evaluateAll(a=>a.map(e=>e.getBoundingClientRect().height)))assert.ok(h>=44);
      await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-menu').getAttribute('open'),null);assert.equal(await summary.evaluate(e=>e===document.activeElement),true);
      await page.keyboard.press('Space');await page.getByRole('navigation',{name:'Điều hướng điện thoại'}).getByRole('link',{name:'Tạo nội dung',exact:true}).click();
      await page.waitForURL(base+'/create');assert.equal(await page.locator('.mobile-menu').getAttribute('open'),null);
      assert.equal(await page.locator('.mobile-menu a[aria-current=page]').textContent(),'Tạo nội dung');
    });
    await check('FAQ keyboard and reduced motion',async()=>{
      await navigate(page,'/');const faq=page.getByText('Lịch sử có theo tôi sang thiết bị khác?',{exact:true});await faq.focus();await page.keyboard.press('Enter');
      assert.equal(await faq.evaluate(e=>e.parentElement.open),true);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
      await page.emulateMedia({reducedMotion:'no-preference'});
    });
    await check('Form validates four fields, supports three tones, no invalid request',async()=>{
      await navigate(page,'/create');await generate(page);assert.equal(await page.locator('#form-errors li').count(),4);assert.equal(requests.length,0);
      await page.getByRole('button',{name:'Dùng thông tin mẫu'}).click();
      for(const name of ['Hài hước','Trang trọng','Trẻ trung']){await page.getByRole('radio',{name,exact:true}).check();assert.equal(await page.getByRole('radio',{name,exact:true}).isChecked(),true)}
      await page.locator('#description').fill('a\u0301\r\n👩🏽‍💻');
      assert.equal(await page.locator('#description-count').innerText(),[...norm('a\u0301\r\n👩🏽‍💻')].length+'/1.000');
      await page.locator('#productName').fill('D'.repeat(121));await generate(page);assert.match(await page.locator('#productName-error').innerText(),/120/);assert.equal(requests.length,0);
    });
    await check('Draft persists create↔history, back/forward; no form data in URL',async()=>{
      await page.locator('#productName').fill('Bản đang nhập 📘');
      await page.locator('.tool-links').getByRole('link',{name:/Lịch sử/}).click();await page.waitForURL(base+'/history');
      await page.goBack();await page.waitForURL(base+'/create');assert.equal(await page.locator('#productName').inputValue(),'Bản đang nhập 📘');
      await page.goForward();await page.waitForURL(base+'/history');
      await page.locator('.tool-links').getByRole('link',{name:/Tạo nội dung/}).click();await page.waitForURL(base+'/create');
      assert.equal(await page.locator('#productName').inputValue(),'Bản đang nhập 📘');assert.equal(new URL(page.url()).search,'');
    });
    await check('INTERCEPTED success: 3/3/5, exact Unicode counts, 11 real clipboard copies',async()=>{
      await page.getByRole('button',{name:'Dùng thông tin mẫu'}).click();await generate(page);
      assert.equal(await page.locator('.result-panel .caption-card').count(),3);
      await copyAll(page,'.result-panel',output);
      for(let i=0;i<3;i++)assert.match(await page.locator('.caption-card .counts').nth(i).innerText(),new RegExp([...norm(output.captions[i])].length+' ký tự'));
      assert.match(await page.locator('.result-panel').innerText(),/Caption hơi dài/);
      for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await layout(page,width,'/create','intercepted-result');if([390,1440].includes(width))await shot(page,'create-result-intercepted-'+width)}
    });
    await check('Result/draft and history survive navigation; history copies and reload',async()=>{
      const before=await saved(page);await page.locator('#productName').fill('Tên mới chưa tạo');
      await page.locator('.tool-links').getByRole('link',{name:/Lịch sử/}).click();await page.waitForURL(base+'/history');
      await page.getByRole('button',{name:'Xem lại',exact:true}).first().click();await copyAll(page,'.history-detail',output);
      for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await layout(page,width,'/history','intercepted-result');if([390,1440].includes(width))await shot(page,'history-result-intercepted-'+width)}
      await page.locator('.tool-links').getByRole('link',{name:/Tạo nội dung/}).click();assert.equal(await page.locator('#productName').inputValue(),'Tên mới chưa tạo');assert.equal(await page.locator('.result-panel .copy-button').count(),11);
      await page.locator('.tool-links').getByRole('link',{name:/Lịch sử/}).click();await page.reload({waitUntil:'networkidle'});assert.equal(await saved(page),before);
    });
    await check('Legacy guest data remains; view/delete/cancel focus affects only one item',async()=>{
      await page.evaluate(({key,oldKey,entry})=>{const s=JSON.parse(localStorage.getItem(key));s.entries.push(entry);localStorage.setItem(key,JSON.stringify(s));localStorage.setItem(oldKey,'prototype-preserved')},{key,oldKey,entry});
      await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.history-entry').count(),2);
      await page.getByRole('button',{name:'Xóa',exact:true}).first().click();await page.getByRole('button',{name:'Hủy',exact:true}).click();
      await page.waitForFunction(()=>document.activeElement.id.startsWith('delete-'));
      await page.getByRole('button',{name:'Xóa',exact:true}).first().click();await page.getByRole('button',{name:'Xóa mục này',exact:true}).click();assert.equal(await page.locator('.history-entry').count(),1);
      assert.equal(JSON.parse(await saved(page)).entries[0].id,entry.id);assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),'prototype-preserved');
    });
    await check('INTERCEPTED regeneration uses current form and preserves old output on all errors',async()=>{
      await page.locator('.tool-links').getByRole('link',{name:/Tạo nội dung/}).click();await page.getByRole('button',{name:'Dùng thông tin mẫu'}).click();await generate(page);
      await page.locator('#productName').fill('Sổ kiểm thử mới');await page.getByRole('radio',{name:'Hài hước',exact:true}).check();await generate(page,true);
      assert.equal(requests.at(-1).productName,'Sổ kiểm thử mới');assert.equal(requests.at(-1).tone,'humorous');const before=await saved(page);
      for(const [status,code] of [[502,'INVALID_AI_OUTPUT'],[504,'AI_TIMEOUT'],[429,'RATE_LIMITED'],[503,'AI_UNAVAILABLE'],[502,'UPSTREAM_ERROR'],[200,null]]){
        reply={status,body:code?{error:{code,message:'PRIVATE_UPSTREAM'}}:{captions:[]}};await generate(page,true);
        assert.match(await page.locator('#generate-error').innerText(),/giữ nguyên/);assert.doesNotMatch(await page.locator('main').innerText(),/PRIVATE_UPSTREAM/);
        assert.equal(await saved(page),before);assert.equal(await page.locator('.result-panel .copy-button').count(),11);assert.equal(await page.locator('#productName').inputValue(),'Sổ kiểm thử mới');
      }
      await shot(page,'create-error-preserved');reply={status:200,body:output};
    });
    await check('INTERCEPTED pending request continues create→history exactly once',async()=>{
      hold={};hold.promise=new Promise(resolve=>hold.resolve=resolve);const before=requests.length;
      await page.getByRole('button',{name:'Tạo lại',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#productName').matches(':disabled'));
      await page.locator('form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
      await page.locator('.tool-links').getByRole('link',{name:/Lịch sử/}).click();await page.waitForURL(base+'/history');
      assert.match(await page.locator('.busy-status').innerText(),/vẫn tiếp tục/);const release=hold;hold=null;release.resolve();
      await page.waitForFunction(()=>!document.querySelector('.busy-status')?.textContent);assert.equal(requests.length,before+1);
      await page.locator('.tool-links').getByRole('link',{name:/Tạo nội dung/}).click();await done(page);assert.equal(await page.locator('.result-panel .copy-button').count(),11);
    });
    await check('INTERCEPTED leave tool cancels; late response never persists',async()=>{
      hold={};hold.promise=new Promise(resolve=>hold.resolve=resolve);const before=await saved(page);
      await page.getByRole('button',{name:'Tạo lại',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#productName').matches(':disabled'));
      await page.getByRole('link',{name:'Bàn biên tập — Trang chủ',exact:true}).click();await page.waitForURL(base+'/');
      const release=hold;hold=null;release.resolve();await page.waitForLoadState('networkidle');assert.equal(await saved(page),before);
      await page.getByRole('link',{name:'Mở bàn biên tập',exact:true}).click();await page.waitForURL(base+'/create');await done(page);assert.equal(await saved(page),before);
    });
    await check('INJECTED full storage keeps new output and old history',async()=>{
      await page.getByRole('button',{name:'Dùng thông tin mẫu'}).click();const before=await saved(page);
      await page.evaluate(k=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===k)throw new DOMException('Injected','QuotaExceededError');return set.call(this,name,value)}},key);
      await generate(page);assert.equal(await page.locator('.result-panel .copy-button').count(),11);assert.match(await page.locator('.sample-caption').innerText(),/đầy/);assert.equal(await saved(page),before);
      await shot(page,'storage-full-intercepted');
      await page.locator('.tool-links').getByRole('link',{name:/Lịch sử/}).click();
      await page.getByRole('button',{name:'Xóa',exact:true}).first().click();await page.getByRole('button',{name:'Xóa mục này',exact:true}).click();
      assert.match(await page.locator('.history-section').innerText(),/Chưa xóa được lịch sử/);assert.equal(await saved(page),before);
      await page.locator('.tool-links').getByRole('link',{name:/Tạo nội dung/}).click();
    });
    await check('INJECTED clipboard rejection remains readable and all data stays',async()=>{
      const before=await saved(page);await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>{throw new DOMException('Injected','NotAllowedError')}}));
      await page.getByRole('button',{name:'Copy caption 1',exact:true}).click();assert.match(await page.locator('.copy-feedback').first().innerText(),/Không thể copy/);assert.equal(await saved(page),before);
    });
    await check('INJECTED corrupt/blocked storage never resets old data or hides new result',async()=>{
      for(const mode of ['corrupt','blocked']) {
        const ctx=await browser.newContext();await ctx.route('**/api/generate',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(output)}));
        await ctx.addInitScript(({key,mode})=>{if(mode==='corrupt')localStorage.setItem(key,'{broken');else{const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k===key)throw new DOMException('Injected','SecurityError');return get.call(this,k)}}},{key,mode});
        const p=await ctx.newPage();await navigate(p,'/create');await p.getByRole('button',{name:'Dùng thông tin mẫu'}).click();await generate(p);
        assert.equal(await p.locator('.result-panel .copy-button').count(),11);assert.match(await p.locator('.sample-caption').innerText(),mode==='corrupt'?/Dữ liệu cũ/:/không cho lưu/);
        if(mode==='corrupt')assert.equal(await saved(p),'{broken');await p.locator('.tool-links').getByRole('link',{name:/Lịch sử/}).click();assert.equal(await p.locator('.history-entry').count(),0);await ctx.close();
      }
    });
    await check('No real AI or external requests; contract unchanged, no browser errors',async()=>{
      for(const input of requests)assert.deepEqual(Object.keys(input).sort(),['audience','description','productName','tone']);
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    });
  } catch(error) {
    await shot(page,'failure');
    fs.writeFileSync(path.join(out,'failure.txt'),String(error)+'\n'+await page.locator('body').innerText());
    throw error;
  } finally {
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({mode:'All generation intercepted; storage and clipboard errors injected; clipboard successes real',realInferences:0,checks,layouts,requests:requests.length,pageErrors:errors,externalRequests:external},null,2));
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
