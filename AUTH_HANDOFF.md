# Nhật ký triển khai email/password — Gia Huy / AIT1-HUST

Cập nhật 31/10/2026 (giờ Việt Nam). File này là mốc để Argon/Antigravity hoặc agent khác tiếp tục. Không chứa secret.

## Yêu cầu và giới hạn

Long giao giao diện + backend đăng nhập email/password bằng Supabase, đăng xuất, branch riêng. Giữ Google OAuth và guest. Không gửi tin Messenger/email, không merge main, không deploy production, không xóa file dự án. Người dùng yêu cầu cập nhật nhật ký chi tiết; đã rút yêu cầu giới hạn usage 20% vì không có bộ đếm đáng tin cậy.

## Checkout và runtime

- Repo: https://github.com/blackuser108/CaptionQuangCao
- Base: main `9feb91a3fee155040a558b36eb414abc0c320f7a`.
- Branch: `feat/huy-email-password-auth`.
- Checkout hiện tại: `/Users/huy/Documents/Codex/2026-10-31/b-n-c-truy-c-p/work/CaptionQuangCao`.
- Node có sẵn: `/Users/huy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` (v24.22.1). Thêm thư mục bin vào PATH khi chạy pnpm.
- App nằm trong `prototype/`, pnpm 11.25.0, dependencies đã cài bằng `pnpm install --frozen-lockfile --ignore-scripts`. Không nâng phiên bản.
- Đã đọc `prototype/AGENTS.md` và Next 16 route handlers docs cài trong node_modules.

## Quyết định thiết kế

1. Tái dùng requestContext/createServerClient, cookie HttpOnly/Lax/Secure, getUser, IdentityFence và namespace lịch sử hiện có. Không thêm hệ token client hoặc schema lưu password.
2. Giữ `/auth/login` là Google để không phá form cũ. Thêm `/auth/password` nhận JSON (mode login/signup).
3. Giữ `loginEnabled` của session API là cờ Google cũ; thêm `emailEnabled` độc lập. Env `AUTH_EMAIL_ENABLED=false` tắt phần email, mặc định bật nếu auth được cấu hình. Dashboard Supabase vẫn phải bật Email provider.
4. Bổ sung signup tối giản để người dùng có cách tạo tài khoản email thực tế. Đây là phần hỗ trợ do triển khai lựa chọn, không phải yêu cầu nguyên văn riêng của Long. Chưa có quên mật khẩu/reset UI; không giả vờ hỗ trợ.
5. Signup dùng PKCE SSR và callback hiện có. Session null → thông báo trung tính, không khẳng định email tồn tại/đã được gửi. Có session → vẫn getUser trước trả authenticated.
6. Không trim/normalize password; trim email. Giới hạn JSON 4KiB, thời gian đọc 5s, MIME JSON, allowlist field, email ≤254 ký tự, password 1–128 ký tự (signup ≥8); Supabase có thể đặt policy mạnh hơn. Redirect chỉ /account,/create,/history.
7. Giữ API auth phía server, không service-role key. Lỗi credential/unconfirmed dùng cùng thông báo, rate limit riêng, không trả raw provider. Rate limit chống brute force dựa Supabase; chưa thêm cơ chế phân tán riêng trong app.
8. Không mở đồng bộ lịch sử cloud; localStorage vẫn theo origin/trình duyệt/tài khoản. Không migration SQL cho chức năng credential.

## File thay đổi

- `prototype/lib/auth/password.ts`: bounded input reader và lỗi tiếng Việt.
- `prototype/lib/auth/handlers.ts`: session thêm emailEnabled; handler password gọi Supabase login/signup, verify, trả cookie.
- `prototype/lib/auth/core.ts`: env flag email độc lập.
- `prototype/app/auth/password/route.ts`: POST route.
- `prototype/components/PasswordAuth.tsx`: form login/signup, autocomplete, show/hide, trạng thái, submit lock, báo lỗi/pending và chuyển /account sau success.
- `prototype/components/AuthProvider.tsx`: truyền availability email được xác nhận từ API.
- `prototype/app/login/page.tsx`, `prototype/app/globals.css`: tích hợp form theo thiết kế hiện tại, giữ Google và guest.
- `.env.example`: cờ AUTH_EMAIL_ENABLED, chỉ placeholder.
- `prototype/tests/password-auth.test.ts`: 8 test nhóm bổ sung gồm SSR thật với upstream giả.
- `prototype/tests/auth-handlers.test.ts`: fixture thêm cờ email.

## Kiểm thử đã chạy

- Trước thay đổi: 46 tests PASS.
- Sau thay đổi: 54 tests PASS. Bao gồm input/origin/config/MIME/body invalid, password giữ khoảng trắng, login không phụ thuộc Google, verify trước success, signup pending/success/error, private errors và SSR password grant tạo cookie với upstream giả.
- Typecheck ban đầu báo fixture thiếu emailEnabled; đã sửa fixture. Typecheck sau đó PASS trước thêm test mới; cần xác nhận lại toàn bộ lần cuối.
- Build đang thực hiện ở thời điểm ghi mốc này; chưa kết luận PASS.
- Chưa browser QA phần form mới, chưa auth thật với project nhóm, chưa gửi email test.

## Quyền và cloud

Người dùng nói đã vào được GitHub/Supabase. Trước đó GitHub ghuy4g có invitation pending, Supabase ghuy4g không có org. Cần kiểm tra lại giao diện để xác nhận project. Không coi lời nói này là bằng chứng đã thử login thật. Không lấy token từ Chrome/keychain để tái dùng trong shell. Chưa xác minh git push.

## Bước tiếp theo

1. Hoàn tất build/typecheck và review diff.
2. Chạy preview localhost, browser test form login/signup (mock), mobile/accessibility/loading/errors/redirect; chạy regression auth-browser và v2-browser hiện có. Phân biệt mocked session với kiểm thật.
3. Kiểm tra quyền repo và đúng project Supabase qua Chrome; không thay cài đặt cloud bảo mật chưa được xác nhận.
4. Nếu có URL/publishable key phù hợp thì cấu hình env local (gitignore). Không chép secret vào log. Test thật cần tài khoản test do người dùng kiểm soát; không tự gửi email cho đồng đội hoặc đặt mật khẩu tài khoản thật.
5. Ghi test report chính xác, ảnh preview, cập nhật README/auth setup và nhật ký này. Commit branch khi kiểm tra đạt; chuẩn bị diff/patch bàn giao. Không merge/deploy.

## Lệnh tiếp tục

Từ `prototype/`, đặt PATH chứa Node ở trên rồi chạy `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm start`. Browser harness dùng `PLAYWRIGHT_MODULE=/Users/huy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` nếu không resolve được playwright. Đọc AGENTS.md trước sửa code; kiểm tra git status và không ghi đè sửa đổi agent khác.

## Mốc cập nhật — hoàn tất triển khai local

- `pnpm test`: **54/54 PASS** (46 cũ + 8 nhóm password mới).
- `pnpm typecheck`: **PASS** sau toàn bộ code/test mới.
- `pnpm build`: **PASS**, có route `/auth/password`; chạy lại sau cập nhật FAQ.
- `git diff --check`: PASS.
- Browser qua Chrome/CUA, backend fixture local trên 127.0.0.1:3101: mật khẩu sai trả lỗi riêng tư; login A chuyển /account; reload giữ A; logout về guest; signup chờ xác nhận không tạo phiên; login B xác minh đúng B; logout B thành công. Đã kiểm form mobile 390×844, scrollWidth=390 (không tràn ngang), có label cho email/password. Ảnh nằm trong outputs của chat. Đây là kiểm qua code SSR/route thật nhưng upstream Supabase giả lập, **không phải auth cloud thật**.
- Đã thêm `prototype/tests/auth-preview-fixture.mjs`: test preload có opt-in `AUTH_TEST_FIXTURE=local-only`, chỉ chấp nhận origin 127.0.0.1:3101, chặn network ngoài fixture. Không import trong code app. Không gửi email, không gọi AI inference.
- Không chạy lại harness `auth-browser.cjs`/`v2-browser.cjs` qua CLI trong lượt này; các cơ chế namespace/IdentityFence có unit tests cũ PASS nhưng không được mô tả là toàn bộ browser regression mới.
- UI bám thiết kế hiện có; chưa cần thuê agent thiết kế hoặc điều khiển Antigravity. Không mở hay sửa các project Antigravity khác.

### Cloud đã kiểm chỉ đọc

Tài khoản ghuy4g đã vào được blackuser108's Org và project **CaptionQuangCao**, ref `malkwhxhvgdxkwhuwrrw`, liên kết đúng repo. Auth Providers: Email ENABLED, Google ENABLED, Allow signup bật, Confirm email bật. Các nút cấu hình bị disabled với quyền hiện tại, vì vậy không coi tài khoản này có quyền sửa settings.

URL config đang có Site URL `http://127.0.0.1:3000`; allowlist có callback local 3000 và domain `https://caption-quang-cao.vercel.app` (bao gồm query next=/account,/create,/history). Port 3101 **chỉ dùng fixture**; không dùng nó để test xác nhận email thật vì không nằm trong allowlist. Khi nghiệm thu thật, chạy local port 3000 hoặc phối hợp owner thêm redirect đúng. Không đổi Site URL/provider hoặc bất kỳ setting cloud nào trong lượt này.

Chưa lấy key về env, chưa tạo tài khoản Auth thật, chưa gửi email xác nhận, chưa thử Google OAuth cloud hoặc email/password cloud. Cần tài khoản test do người dùng kiểm soát; không yêu cầu password/OTP trong chat. Đã hỏi tùy chọn nghiệm thu thật; chưa có câu trả lời lúc ghi mốc.

### Git và gói bàn giao

`GIT_TERMINAL_PROMPT=0 git push --dry-run origin HEAD` thất bại vì Git terminal chưa có HTTPS username/credential. Đăng nhập Chrome không tự cấp credential cho Git. Không cố trích cookie/token Chrome hoặc đọc keychain. Chưa push, chưa PR, chưa merge/deploy. Git user.name/email cũng chưa cấu hình trong checkout; không tự gán danh tính tác giả.

Thay đổi được stage để xuất patch đầy đủ (bao gồm file mới); **chưa commit**. Agent tiếp theo đọc git status/diff --cached trước khi sửa. File patch `huy-email-password-auth.patch` áp dụng lên base main bằng `git apply --check` rồi `git apply`; không apply thêm vào checkout đã có thay đổi. Snapshot source ZIP không có .git/node_modules/.next/env thật. Chỉ .env.example được đi kèm.

### Việc còn lại, theo thứ tự

1. Người dùng tự nghiệm thu tài khoản thật hoặc trực tiếp nhập tài khoản test khi tiếp tục. Dùng URL/publishable key của project nhóm trong env local gitignored, giữ secret ngoài chat; chạy đúng port 3000 và không dùng fixture.
2. Kiểm tra xác nhận email, email/password login/logout/reload và Google regression bằng tài khoản test. Kiểm quota SMTP; ghi PASS/FAIL thực tế, không lấy mock làm thật.
3. Cấu hình Git auth và tác giả commit theo tài khoản người dùng (hoặc connector GitHub đã được cho phép) rồi commit/push branch nếu được ủy quyền. Không tự tạo token rộng quyền.
4. Owner review branch/patch và thay đổi triển khai; không bật autodeploy, không merge main hoặc deploy production tự động.
5. Signup/recovery: signup tối giản đã có; UI quên mật khẩu chưa làm, là phần bổ trợ ngoài P0 cần chốt riêng. Không thay thế recovery bằng thu password Google hay bảng SQL credential.

Bản cập nhật soạn sẵn để người dùng tự gửi Long: “Tôi đã làm xong phần email/password Supabase trên branch riêng, giữ Google/guest. 54 tests, typecheck và production build đạt; đã kiểm login/logout/reload/signup pending trên local với upstream giả. Còn nghiệm thu tài khoản Supabase thật và xác thực Git để push branch; chưa merge/deploy.”

## Mốc cập nhật — đã nghiệm thu Supabase thật

Người dùng đã cho phép tự tạo tài khoản test. Đã tạo **một** tài khoản bằng alias của chính hộp thư người dùng: một email test riêng do người dùng kiểm soát trên project CaptionQuangCao hiện có. Không dùng tài khoản của Long/Púc/Đạt, không gửi tin cho đồng đội. Có một email xác nhận tự động gửi về hộp thư của người dùng theo flow đăng ký được cho phép.

### Kết quả thực tế

- App local 127.0.0.1:3000 nối **Supabase thật**, không dùng fixture/preload.
- POST `/auth/password` mode signup: HTTP200 / confirmation_required.
- Thư xác nhận xuất hiện trong Gmail của người dùng. Kiểm tra đúng host Supabase project, type signup, redirect localhost callback trước khi sử dụng; không in token vào log.
- Endpoint verify của Supabase: HTTP303 về localhost, có code, không có error. Email đã được xác nhận.
- POST login qua app: HTTP200 / authenticated, có cookie HttpOnly. GET session trả authenticated và đúng email test.
- POST logout qua app: HTTP200 / guest. GET session sau logout user=null.
- **Chrome giao diện thật**: nhập tài khoản test đã xác nhận → /account đúng email; reload vẫn thấy đúng email; bấm logout → /login?loggedOut=1. Ảnh `auth-real-account.png` và báo cáo `auth-real-test.json` trong outputs là bằng chứng.
- Google vẫn khả dụng trên form và các tests Google cũ PASS, nhưng chưa lặp lại OAuth Google thật trong lượt nghiệm thu này.

### Giới hạn cần phân biệt

Signup được gửi bằng HTTP test client trước khi lưu cookie PKCE của response, vì vậy việc xác nhận email được kiểm trực tiếp tại endpoint verify, sau đó kiểm password login độc lập. **Chưa kiểm full browser signup → click email → callback tự đăng nhập bằng cookie PKCE gốc**. Không gán kết quả PASS cho phần chưa kiểm này. Callback đã có test unit và luồng Google cũ, nhưng chưa thay nghiệm thu email callback thực tế. Khi agent sau kiểm luồng này, phải đăng ký từ cùng trình duyệt hoặc lưu CookieJar từ lúc signup; đừng kết luận code lỗi chỉ vì test client làm mất verifier.

### Cấu hình và dữ liệu local riêng

- `prototype/.env.local` mới tạo cho project thật; chứa URL/publishable key và AUTH_SITE_URL local3000, cờ Google/email bật. Không có service-role secret hoặc Gemini key. File chmod600 và gitignored, không đóng gói.
- `.env.auth-test.json` ở root checkout lưu credential test ngẫu nhiên, chmod600/gitignored. Không in password ra chat, không đưa vào patch/sourceZIP. Agent tiếp tục có thể dùng file riêng này để test lại, không reset mật khẩu tài khoản khác.
- `.env.auth-confirm-link` chứa URL xác nhận đã dùng, chmod600/gitignored; không đưa vào artifacts. Không xóa file theo yêu cầu người dùng.
- Tài khoản test được giữ lại, không xóa user/project/file. Không thay Confirm email, provider, quyền, SMTP, Site URL hay database schema.
- Preview local thật đã được dừng sau khi kiểm. Chạy lại `pnpm --dir prototype start` với PATH Node đã nêu; port3000 dùng env thật, **không** thêm auth fixture.

### Việc còn lại sau mốc này

1. Full browser email signup callback (nếu cần nghiệm thu thêm), Google OAuth thật và quota/SMTP dài hạn chưa kiểm.
2. Git terminal vẫn chưa có credential; chưa commit/push/PR, chưa merge/deploy. Chrome login không giải quyết Git CLI. Patch và sourceZIP đã cập nhật đầy đủ.
3. Giữ auth localStorage như thiết kế, không tự thêm đồng bộ database hoặc recovery UI ngoài phạm vi.

Bản cập nhật mới để người dùng tự gửi Long: “Phần email/password đã xong local: 54 tests/typecheck/build đạt. Đã tạo tài khoản test, xác nhận email và thử login/session/logout Supabase thật qua API lẫn Chrome; reload giữ đúng tài khoản. Giữ Google/guest, chưa merge/deploy. Còn xác thực Git để push branch; full browser signup-email-callback và Google OAuth thật chưa lặp lại.”

## Chuẩn bị push branch riêng

Người dùng đã yêu cầu push riêng, không merge main. Đã rà staged files, bỏ địa chỉ email test khỏi tài liệu công khai; env và credential test tiếp tục gitignored. Commit dùng tên tài khoản ghuy4g và địa chỉ noreply GitHub, không đổi git config toàn cục. Cần xác thực Git HTTPS/SSH trước khi có thể push.
