# CaptionQuangCao
Agent tự động Viết Caption Quảng cáo

## Trạng thái

Ứng dụng **Bàn biên tập** trong `prototype/`: Next16.4.3, React19.3.1, TypeScript7, Node24, pnpm11.25.0. Giao diện V2, bốn trường đầu vào, ba caption/ba headline/năm hashtag; copy từng mục, tạo lại, lịch sử xem/xóa và bộ đếm Unicode. Google login Supabase SSR đã kiểm local với tài khoản chủ.

**AI hiện chỉ gọi FreeLLMAPI local; chưa triển khai online.** Người dùng chọn giữ router và làm rõ điều kiện trước; chưa thuê VPS hoặc đổi provider. Chất lượng AI Bước4, Q1/Q3 BTC, tài khoản Google ngoài chủ và hết phiên thật còn mở. [ONLINE_READINESS](ONLINE_READINESS.md) ghi nguồn, giá/giới hạn, cấu hình và các cửa trước deploy.

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

Tạo cấu hình riêng từ `.env.example` ở root; không commit giá trị. Giữ FREELLMAPI_BASE_URL=http://127.0.0.1:31415/v1, FREELLMAPI_MODEL=auto và AI key server trong `.env.local` ở root. Dev/start đọc file cha bằng Node. Đặt riêng SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY/AUTH_SITE_URL/AUTH_GOOGLE_ENABLED trong `prototype/.env.local` để Next nạp ở thư mục chạy; dùng đúng project/key của mình. Thiếu cấu hình auth, guest vẫn dùng được; thiếu AI key/router trả lỗi rõ, không dữ liệu mẫu thay AI. AUTH_SITE_URL local phải khớp127.0.0.1 để giữ origin lịch sử.

Google Client Secret chỉ trong Google provider Supabase, không cần đặt trong app. Đăng ký callback Google→Supabase của project; Supabase→app là `/auth/callback` với allowlist đúng origin, xem ONLINE_READINESS. Không dùng secret/service-role hoặc biến NEXT_PUBLIC_ cho khóa.

## Hợp đồng và dữ liệu

- Client chỉ gửi productName/description/audience/tone, chuẩn hóa NFC/LF/trim; giới hạn120/1.000/300code point, humorous/formal/youthful. Server kiểm field/type/MIME/Origin/Host/body16KiB.
- Upstream cố định server, một request, không retry/repair/fallback mẫu. Timeout90s, phản hồi upstream cap32KiB; app chỉ trả đúng captions[3]/headlines[3]/hashtags[5], kiểm chuỗi/count/trùng. Lỗi Việt, không raw upstream/credential.
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
