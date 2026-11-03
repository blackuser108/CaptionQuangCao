const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out=path.resolve(__dirname,process.argv.find(arg=>arg.startsWith('--out='))?.slice(6)||'../../evidence/redesign-v2-implementation');
function luminance(rgb) {
  const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
(async()=>{
  const { samples }=await import('../lib/samples.ts');
  const output=structuredClone(samples[0]);output.hashtags[0]='#'+ 'DữLiệuDài'.repeat(26);
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const ctx=await browser.newContext();
    await ctx.route('**/api/generate',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(output)}));
    const page=await ctx.newPage();await page.goto('http://127.0.0.1:3000/create',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Dùng thông tin mẫu'}).click();await page.getByRole('button',{name:'Tạo nội dung',exact:false}).click();
    await page.locator('.result-panel .copy-button').first().waitFor();
    const counts=await page.locator('.caption-card .counts').allTextContents();
    for(let i=0;i<3;i++)assert.ok(counts[i].includes('Dòng mở đầu: '+[...output.captions[i].split('\n')[0]].length+' ký tự'));
    await page.mouse.move(0,0);
    const colors=await page.evaluate(()=>{
      const body=getComputedStyle(document.body), primary=getComputedStyle(document.querySelector('.primary')),
        muted=getComputedStyle(document.querySelector('.muted')), link=getComputedStyle(document.querySelector('.hashtag-text'));
      return [{name:'body',fg:body.color,bg:body.backgroundColor},{name:'primary',fg:primary.color,bg:primary.backgroundColor},
        {name:'muted on paper',fg:muted.color,bg:body.backgroundColor},
        {name:'hashtag',fg:link.color,bg:getComputedStyle(document.querySelector('.hashtag-list')).backgroundColor}];
    });
    const ratios=colors.map(c=>{const l=[luminance(c.fg),luminance(c.bg)].sort((a,b)=>a-b);return {...c,ratio:Math.round((l[1]+.05)/(l[0]+.05)*100)/100}});
    for(const c of ratios)assert.ok(c.ratio>=4.5,JSON.stringify(c));
    const layouts=[];
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      const metric=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
      assert.ok(metric.scroll<=metric.client);assert.equal(await page.locator('.result-panel .copy-button').count(),11);layouts.push(metric);
      if([390,1440].includes(width))await page.screenshot({path:path.join(out,'long-hashtag-intercepted-'+width+'.png'),fullPage:true});
    }
    fs.writeFileSync(path.join(out,'visual-checks.json'),JSON.stringify({realInferences:0,openingCountsVerified:true,hashtagCodePoints:[...output.hashtags[0]].length,ratios,layouts,nativeZoom:'Not tested: browser UI zoom is not exposed by this headless harness'},null,2));
    console.log('PASS actual CSS contrast, opening-line counts and long hashtag at five widths; all generation intercepted');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
