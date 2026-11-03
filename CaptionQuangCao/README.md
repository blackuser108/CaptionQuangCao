# CaptionQuangCao
Agent tự động Viết Caption Quảng cáo

**Đang chạy online:** [Mở Bàn biên tập](https://caption-quang-cao.vercel.app/). Google đăng nhập/đăng xuất đã kiểm thật với chủ dự án; AI AUTO đã tạo thật3/3/5 trong khoảng4,3s bằng gemini-3.1-flash-lite. Copy và lịch sử sau reload đạt. Source runtime main1261f83; tích hợp tiếp trực tiếp main. Chưa nghiệm thu chất lượng toàn bộ/tài khoản ngoài/quota tải BTC. Xem AI_AUTO_PROGRESS.md; các mục lỗi/chờ phía dưới là lịch sử lượt tích hợp.

## Trạng thái

Ứng dụng **Bàn biên tập** trong `prototype/`: Next16.4.3, React19.3.1, TypeScript7, Node24, pnpm11.25.0. Giao diện V2, bốn trường đầu vào, ba caption/ba headline/năm hashtag; copy từng mục, tạo lại, lịch sử xem/xóa và bộ đếm Unicode. Google login Supabase SSR đã kiểm local với tài khoản chủ.

**Caption engine (server):** rule-based context → campaign brief → LLM → schema/quality check. `AI_PROVIDER=deepseek` (mặc định gợi ý) gọi `https://api.deepseek.com/chat/completions`, model `deepseek-flash` hoặc `deepseek-v4-pro`, JSON mode, thinking tắt. DeepSeek có retry ngắn với 429/5xx và tối đa một lần sửa output; nếu vẫn lỗi và `GEMINI_API_KEY` đã cấu hình thì mới fallback Gemini. `AI_PROVIDER=gemini` giữ hành vi cũ: catalog auto rồi đúng một inference, không fallback. Thiếu `AI_PROVIDER` vẫn chọn FreeLLMAPI local để tương thích. Không có UI chọn provider. Q1/Q3, tài khoản ngoài chủ và hết phiên thật còn mở.

Hai vercel.json chặn Git autodeploy (`git.deploymentEnabled=false`). Không tự merge/bật deploy vì build thành công. Giữ lịch sử commit gốc; nhánh chuẩn bị `chore/online-readiness`.

## Chạy local

```powershell
cd prototype
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
pnpm typecheck
pnpm start
```

Mở http://127.0.0.1:3000. `pnpm dev` để sửa code. Build/test không cần khóa và không gọi inference. Font local có OFL đi kèm. Không static-export vì có API và SSR.

Tạo cấu hình riêng từ `.env.example` ở root; không commit giá trị. DeepSeek: `AI_PROVIDER=deepseek`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-flash` ([tài liệu API](https://api-docs.deepseek.com/)). Không phải gói miễn phí vĩnh viễn. Gemini (chính hoặc fallback): `GEMINI_MODEL=auto` và `GEMINI_API_KEY` từ [Google AI Studio](https://aistudio.google.com/api-keys). Không gửi khóa vào chat, không đặt `NEXT_PUBLIC_*` cho API key. Thiếu hoặc sai cấu hình trả lỗi rõ.

Giữ FREELLMAPI_BASE_URL=http://127.0.0.1:31415/v1, FREELLMAPI_MODEL=auto và khóa local cũ trong `.env.local` ở root; dev/start đọc file cha bằng Node. Muốn quay lại router local, đổi **chỉ** `AI_PROVIDER=freellmapi`. Khi không có AI_PROVIDER, cấu hình cũ vẫn chọn local. `AI_PROVIDER=gemini` không fallback sang DeepSeek hay FreeLLMAPI. `AI_PROVIDER=deepseek` mới fallback Gemini nếu DeepSeek lỗi và Gemini đã cấu hình.

Đặt SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY/AUTH_SITE_URL/AUTH_GOOGLE_ENABLED trong `prototype/.env.local` để Next nạp ở thư mục chạy; dùng đúng project/key của mình. Thiếu cấu hình auth, guest vẫn dùng được. AUTH_SITE_URL local phải khớp127.0.0.1 để giữ origin lịch sử. Không đặt khóa trong biến NEXT_PUBLIC_. Sau sửa env phải restart server.

Điều kiện thử Gemini Free: người dùng ≥18 tuổi, công cụ phục vụ công việc/kinh doanh trong khu vực được hỗ trợ, không hướng đến hoặc có khả năng được người dưới18 truy cập. Không gửi dữ liệu cá nhân/bí mật/nhạy cảm vì Google có thể dùng input/output và người kiểm duyệt đọc. Trước online cần xác minh audience thực và điều kiện khu vực; chưa thể mở công khai chỉ dựa vào xác nhận local. [Điều khoản Google](https://ai.google.dev/gemini-api/terms).

Google Client Secret chỉ trong Google provider Supabase, không cần đặt trong app. Đăng ký callback Google→Supabase của project; Supabase→app là `/auth/callback` với allowlist đúng origin, xem ONLINE_READINESS. Không dùng secret/service-role hoặc biến NEXT_PUBLIC_ cho khóa.

## Hợp đồng và dữ liệu

- Client chỉ gửi productName/description/audience/tone, chuẩn hóa NFC/LF/trim; giới hạn120/1.000/300code point, humorous/formal/youthful. Server kiểm field/type/MIME/Origin/Host/body16KiB.
- Upstream cố định server. Gemini auto: một GET danh mục rồi một inference. DeepSeek: JSON object, retry 429/5xx tối đa 3 lần, tối đa một lần sửa chất lượng; fallback Gemini khi được cấu hình. Timeout90s, danh mục cap256KiB, nội dung cap32KiB; app chỉ trả captions[3]/headlines[3]/hashtags[5]. Lỗi Việt, không raw upstream/credential. Brief/rule library ở server, không lưu API key vào localStorage.
- Account dùng getUser xác minh server; cookie HttpOnly/Lax/Secure trên HTTPS, private/no-store; browser không giữ auth token trong localStorage. Kiểm lại danh tính/ẩn vùng riêng lúc chưa xác minh, hủy pending/chặn response muộn khi đổi chủ.
- Guest key `ban-bien-tap:history:v1` giữ nguyên; user namespace theo UUID Supabase đã server xác minh. Không nhập guest→account, không xóa key mẫu cũ. localStorage chỉ cùng origin/trình duyệt, không mã hóa/sao lưu/đồng bộ. Đổi domain không tự chuyển lịch sử.
- State giữ giữa Create/History; rời tool/đổi chủ có thể bỏ draft, UI có cảnh báo. JSON hợp lệ không chứng minh chất lượng/sự thật; đọc lại bản nháp trước dùng.

## Kiểm trình duyệt tùy chọn

Chrome và Playwright cần có sẵn. Harness nạp module `playwright`; nếu dùng runtime ngoài repo, đặt PLAYWRIGHT_MODULE thành đường dẫn module đã cài. Không cần thêm dependency runtime của app.

```powershell
node tests/auth-browser.cjs
node tests/v2-browser.cjs --out=../../evidence/online-check
node tests/v2-visual.cjs --out=../../evidence/online-check
```

Preview3000 phải đang chạy. Harness dùng browser context riêng; mọi generation bị interception, **không inference thật**, không gọi Google OAuth thật. Auth browser dùng session API doubles, không thay kiểm tài khoản ngoài. Kết quả/ảnh vào evidence bị gitignore; không chạy bằng profile cá nhân. Chưa kiểm thiết bị thật/screen reader/zoom native hoặc bảo đảm uptime/quota dài hạn.
