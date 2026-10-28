# CaptionQuangCao
Agent tự động Viết Caption Quảng cáo

**Đích hiện hành:** [caption-quang-cao.vercel.app](https://caption-quang-cao.vercel.app/) (Production). Ngày 28/10 người dùng duyệt cập nhật bảy biến server, bốn callback và đúng một Redeploy cùng project. Đã lưu cấu hình; bản sửa đang qua kiểm trước lần Redeploy đó. Xem [DEPLOYMENT_TARGET](DEPLOYMENT_TARGET.md) và [AI_AUTO_PROGRESS](AI_AUTO_PROGRESS.md). Các link Preview bên dưới chỉ là lịch sử project cũ.

**[Mở bản xem online](https://captionquangcao-f65hx7fhz-dragons-projects-e23cb252.vercel.app/)** — Vercel Preview đã READY từ nhánh chore/online-readiness, commit f1a42a7. Chủ dự án đăng nhập Vercel nếu được hỏi. Preview chưa có khóa AI mới, hiển thị rõ AI chưa sẵn sàng; Google online chưa cấu hình, guest truy cập được. Không merge/main production hoặc inference mới. Chi tiết [PREVIEW_PROGRESS](PREVIEW_PROGRESS.md).

## Trạng thái

Ứng dụng **Bàn biên tập** trong `prototype/`: Next16.4.3, React19.3.1, TypeScript7, Node24, pnpm11.25.0. Giao diện V2, bốn trường đầu vào, ba caption/ba headline/năm hashtag; copy từng mục, tạo lại, lịch sử xem/xóa và bộ đếm Unicode. Google login Supabase SSR đã kiểm local với tài khoản chủ.

**AI dùng Gemini Developer API trực tiếp, chọn model tự động phía server.** `GEMINI_MODEL=auto` đọc danh mục được key truy cập, chọn `gemini-3.1-flash-lite` rồi `gemini-3.5-flash-lite` nếu model đầu không có trong danh mục. Gửi đúng một inference, suy luận low; không thử model khác sau lỗi. Google không nhận literal `auto` ở request sinh. Danh mục không chứng minh còn quota; lỗi 429 vẫn trả rõ. Lượt local thật đầu đã trả 200/3-3-5 khoảng 2,9s, nhưng còn suy diễn lợi ích cần biên tập. FreeLLMAPI local được giữ để quay lại thủ công; VPS hoãn, không tự fallback hoặc thêm UI chọn provider. Q1/Q3, tài khoản ngoài chủ và hết phiên thật còn mở.

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

Tạo cấu hình riêng từ `.env.example` ở root; không commit giá trị. Trong `prototype/.env.local`, đặt `AI_PROVIDER=gemini`, `GEMINI_MODEL=auto` và `GEMINI_API_KEY` tự nhập từ [Google AI Studio](https://aistudio.google.com/api-keys). Không gửi khóa vào chat, không dùng Google OAuth Client Secret làm API key. Xác minh project Free tier/quota tại [Rate Limit](https://aistudio.google.com/rate-limit); không bật billing. Thiếu hoặc sai cấu hình trả lỗi rõ, không gọi provider khác.

Giữ FREELLMAPI_BASE_URL=http://127.0.0.1:31415/v1, FREELLMAPI_MODEL=auto và khóa local cũ trong `.env.local` ở root; dev/start đọc file cha bằng Node, không cần chép khóa. Muốn quay lại, đổi **chỉ** `AI_PROVIDER=freellmapi` trong `prototype/.env.local`, mở router cũ rồi restart server. Khi không có AI_PROVIDER, cấu hình cũ vẫn chọn local để tương thích; giá trị provider lạ bị từ chối. Không fallback khi Gemini lỗi.

Đặt SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY/AUTH_SITE_URL/AUTH_GOOGLE_ENABLED trong `prototype/.env.local` để Next nạp ở thư mục chạy; dùng đúng project/key của mình. Thiếu cấu hình auth, guest vẫn dùng được. AUTH_SITE_URL local phải khớp127.0.0.1 để giữ origin lịch sử. Không đặt khóa trong biến NEXT_PUBLIC_. Sau sửa env phải restart server.

Điều kiện thử Gemini Free: người dùng ≥18 tuổi, công cụ phục vụ công việc/kinh doanh trong khu vực được hỗ trợ, không hướng đến hoặc có khả năng được người dưới18 truy cập. Không gửi dữ liệu cá nhân/bí mật/nhạy cảm vì Google có thể dùng input/output và người kiểm duyệt đọc. Trước online cần xác minh audience thực và điều kiện khu vực; chưa thể mở công khai chỉ dựa vào xác nhận local. [Điều khoản Google](https://ai.google.dev/gemini-api/terms).

Google Client Secret chỉ trong Google provider Supabase, không cần đặt trong app. Đăng ký callback Google→Supabase của project; Supabase→app là `/auth/callback` với allowlist đúng origin, xem ONLINE_READINESS. Không dùng secret/service-role hoặc biến NEXT_PUBLIC_ cho khóa.

## Hợp đồng và dữ liệu

- Client chỉ gửi productName/description/audience/tone, chuẩn hóa NFC/LF/trim; giới hạn120/1.000/300code point, humorous/formal/youthful. Server kiểm field/type/MIME/Origin/Host/body16KiB.
- Upstream cố định server, một inference sau một GET danh mục khi dùng auto; không retry/repair/fallback mẫu. Timeout90s chung, danh mục cap256KiB, nội dung cap32KiB; app chỉ trả đúng captions[3]/headlines[3]/hashtags[5], kiểm chuỗi/count/trùng. Lỗi Việt, không raw upstream/credential.
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
