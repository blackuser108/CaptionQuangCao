// Session API and generation doubles only: this does not prove Google OAuth success.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:3000', out = path.resolve(process.env.EVIDENCE_DIR || path.resolve(__dirname, '../../evidence/auth-supabase-2026-10-27'));
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);
const guestKey = 'ban-bien-tap:history:v1', A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const scope = id => id ? `${guestKey}:user:${id}` : guestKey;
const output = { captions: ['MẪU KIỂM THỬ caption một', 'MẪU KIỂM THỬ caption hai', 'MẪU KIỂM THỬ caption ba'], headlines: ['MẪU Một', 'MẪU Hai', 'MẪU Ba'], hashtags: ['#Mau', '#Thu', '#Viet', '#BanNhap', '#NoiDung'] };
const entry = (name, id) => ({ id: name, createdAt: '2026-10-27T14:00:00Z', input: { productName: name, description: 'Dữ kiện giả.', audience: 'Người thử', tone: 'formal' }, output });
const checks = [], errors = []; let owner = null, invalid = false, hold = null, authCalls = 0;
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS', name); }
async function ready(page) { await page.locator('.workspace-badge').waitFor(); }
async function signal(page) { await page.evaluate(() => { const c = new BroadcastChannel('ban-bien-tap:auth'); c.postMessage('recheck'); setTimeout(() => c.close(), 10); }); }
async function historyText(page) { return page.locator('.history-list').innerText(); }
async function allStorage(page) { return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('ban-bien-tap:history')).map(k => [k, localStorage.getItem(k)]))); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await context.addInitScript(({ guestKey, A, B, entries }) => {
      for (const [id, entry] of [[null, entries[0]], [A, entries[1]], [B, entries[2]]]) {
        const key = id ? `${guestKey}:user:${id}` : guestKey;
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ version: 1, entries: [entry] }));
      }
    }, { guestKey, A, B, entries: [entry('KHÁCH ĐÃ LƯU'), entry('A ĐÃ LƯU'), entry('B ĐÃ LƯU')] });
    await context.route('**/api/auth/session', route => {
      authCalls++;
      return route.fulfill({ status: invalid ? 401 : 200, contentType: 'application/json', body: JSON.stringify(invalid ? { error: { code: 'SESSION_UNVERIFIED' } } : { status: owner ? 'authenticated' : 'guest', user: owner ? { id: owner, email: owner === A ? 'a@example.test' : 'b@example.test' } : null, configured: true, loginEnabled: true }) });
    });
    await context.route('**/api/generate', async route => { if (hold) await hold; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(output) }).catch(() => {}); });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(base + '/history', { waitUntil: 'networkidle' }); await ready(page);
    const guestBefore = (await allStorage(page))[guestKey];
    await check('Guest history survives; verified A sees only A, then guest/logout/B/A remain separated', async () => {
      assert.match(await historyText(page), /KHÁCH ĐÃ LƯU/); assert.doesNotMatch(await historyText(page), /A ĐÃ LƯU|B ĐÃ LƯU/);
      for (const [id, title] of [[A, 'A ĐÃ LƯU'], [null, 'KHÁCH ĐÃ LƯU'], [B, 'B ĐÃ LƯU'], [A, 'A ĐÃ LƯU']]) {
        owner = id; await signal(page); await page.getByRole('heading', { name: title, exact: true }).waitFor(); assert.equal(await page.locator('.history-entry').count(), 1);
      }
      assert.equal((await allStorage(page))[guestKey], guestBefore);
    });
    await check('Pending A is aborted on B; late response ignoring abort cannot save or revalidate the new identity', async () => {
      await page.locator('.tool-links a[href="/create"]').click(); await ready(page);
      await page.getByRole('button', { name: 'Dùng thông tin mẫu' }).click(); await page.locator('#productName').fill('NHÁP RIÊNG A');
      await page.evaluate(() => { const original = window.fetch; window.fetch = (url, init) => { if (String(url).endsWith('/api/generate')) { window.__pendingSignal = init.signal; return original(url, { ...init, signal: undefined }); } return original(url, init); }; });
      let release; hold = new Promise(r => { release = r; });
      await page.locator('.primary').click(); await page.waitForFunction(() => window.__pendingSignal);
      owner = B; await signal(page); await page.waitForFunction(() => document.querySelector('#productName')?.value === '');
      assert.equal(await page.evaluate(() => window.__pendingSignal.aborted), true);
      const before = await allStorage(page), beforeCalls = authCalls;
      release(); hold = null;
      await page.waitForTimeout(500);
      assert.deepEqual(await allStorage(page), before);
      assert.equal(authCalls, beforeCalls, 'Aborted old request must not trigger a new auth refresh');
      assert.equal(await page.locator('.result-panel .copy-button').count(), 0);
    });
    await check('Visibility hides private content immediately, then foreground revalidates; expiry never falls back to guest', async () => {
      await page.locator('#productName').fill('NHÁP B');
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal(await page.locator('.tool-page').isVisible(), false);
      invalid = true;
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.getByRole('heading', { name: 'Chưa xác minh được phiên.', exact: true }).waitFor();
      assert.equal(await page.locator('.history-entry, .primary').count(), 0);
      assert.equal((await allStorage(page))[guestKey], guestBefore);
      invalid = false; owner = B; await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).click(); await ready(page);
      assert.equal(await page.locator('#productName').inputValue(), '');
    });
    await check('Multiple tabs invalidate private data via signal, not claimed client identity', async () => {
      const second = await context.newPage(); second.on('dialog', d => d.accept()); second.on('pageerror', e => errors.push(e.message));
      await second.goto(base + '/history', { waitUntil: 'networkidle' }); await second.getByRole('heading', { name: 'B ĐÃ LƯU' }).waitFor();
      owner = A; await signal(page);
      await second.bringToFront(); await second.getByRole('heading', { name: 'A ĐÃ LƯU' }).waitFor();
      assert.doesNotMatch(await historyText(second), /B ĐÃ LƯU/);
      await second.close(); await page.bringToFront(); await ready(page);
    });
    await check('Back/forward within tool retains same-owner draft; departure asks before discarding', async () => {
      await page.locator('#productName').fill('CẦN GIỮ');
      await page.locator('.tool-links a[href="/history"]').click(); await ready(page);
      await page.goBack(); await ready(page); assert.equal(await page.locator('#productName').inputValue(), 'CẦN GIỮ');
      await page.goForward(); await ready(page); await page.locator('.tool-links a[href="/create"]').click(); await ready(page);
      page.removeAllListeners('dialog'); let asked = false;
      page.once('dialog', async d => { asked = true; await d.dismiss(); });
      await page.locator('.nav-actions a[href="/account"]').click();
      assert.equal(asked, true); assert.equal(new URL(page.url()).pathname, '/create'); assert.equal(await page.locator('#productName').inputValue(), 'CẦN GIỮ');
      page.on('dialog', d => d.accept());
    });
    await page.screenshot({ path: path.join(out, 'account-scope-test-double.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    fs.writeFileSync(path.join(out, 'auth-browser.json'), JSON.stringify({ mode: 'Auth session API doubles + generation interception; NOT real Google OAuth', checks, pageErrors: errors, realAiCalls: 0 }, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
