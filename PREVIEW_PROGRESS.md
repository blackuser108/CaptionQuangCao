# Vercel Preview — 28/10/2026

Người dùng đã cho phép push GitHub và dựng bản xem online trong chat gốc; quyền này thay cửa chưa deploy của lượt Gemini trước. Phạm vi chỉ Preview trên chore/online-readiness; không merge main/production, đổi visibility, billing, Convex hoặc inference mới.

## Nội dung bản xem thử

- Giữ UI V2, form4trường, hợp đồng3/3/5, copy/tạo lại/lịch sử/count và Supabase Auth source. **AI chưa sẵn sàng trên bản xem thử**: không upload khóa Gemini đã lộ; không env FreeLLMAPI hoặc Google OAuth secret. Form hợp lệ trả503 AI_NOT_CONFIGURED; không dữ liệu mẫu giả kết quả AI. “Dùng thông tin mẫu” chỉ điền form.
- Google đăng nhập Preview tạm chưa cấu hình; nút thông báo đúng trạng thái, guest vẫn truy cập trang/create/history. Không phiên giả. Supabase local/provider/SiteURL/callback giữ nguyên; không di chuyển auth/database. Bật Google cho preview sau khi có origin/callback chính xác và kiểm flow thật.
- API generation giữ MIME/request16KiB/normalization/response32KiB/timeout90s/no-store/no redirects/no retries. Bổ sung HTTPS guard: đối chiếu chính xác URL origin, Host và Origin với APP_ORIGIN hoặc HTTPS VERCEL_URL do platform cấp cho deployment; không wildcard domain, không tin X-Forwarded-* từ client. Thiếu origin cloud hợp lệ trả503 trước fetch; local loopback giữ hành vi cũ.
- Vercel project captionquangcao, team hiện có: framework nextjs, RootDirectory prototype, Node24.x, pnpm11.25.0/lockfile, install --frozen-lockfile --ignore-scripts, build pnpm build; system env bật. Chỉ3env Config cho preview/nhánh này: AI_PROVIDER=gemini, GEMINI_MODEL=gemini-3.8-flash, AUTH_GOOGLE_ENABLED=false. Không GEMINI_API_KEY hoặc Supabase credentials online trong lượt này.
- Giữ Vercel Authentication hiện có; chủ dự án cần đăng nhập Vercel để xem nếu được hỏi. Không tự hạ protection hoặc mở cho BTC. Git autodeploy=false ở cả hai vercel.json; deploy Preview chủ động từ commit đã kiểm, không đổi production.

## Kiểm và kết quả

TDD thêm2ca HTTPS/preview: đỏ trước guard, xanh sau; bao forged Host/URL/Origin/subdomain/port/proto, thiếu Origin, forged forwarded headers, cấu hình có userinfo/path/query/HTTP/thiếu URL, thiếu key không inference. Các kết quả build/browser/deployment thực được bổ sung sau xác minh.

Trước push:40/40 node tests đạt; production build và typecheck exit0. pnpm audit --prod theo lockfile:0info/low/moderate/high/critical. Không nâng dependency hoặc thêm framework. Source và env sẽ được quét lại trước cập nhật ref; nhánh remote trước push430d379, main07bc854.

Ngân sách Gemini cũ4/4 đã hết; **0 inference mới**. Google503 và chất lượng ba tông/tạo lại thật vẫn chưa được nghiệm thu. Q1/Q3, Google ngoài chủ và expiry thật chưa đóng. Cần key mới nhập an toàn vào Vercel Preview Secret và kiểm quota/điều kiện/rate limit dùng chung trước khi cấp quyền bật AI; không lấy test giả làm bằng chứng chất lượng.

## Preview thực và kiểm sau deploy

- URL chủ dự án: **https://captionquangcao-f65hx7fhz-dragons-projects-e23cb252.vercel.app/**. Dùng chính URL deployment này; guard hiện đối chiếu VERCEL_URL chính xác, không mặc định nhận mọi alias.
- Deployment **dpl_E9WCtuTka6nPD3pUfqEJSTbhn1vB**, READY, target=null (Preview), region iad1. Source **f1a42a77f4c08bbf06e63d08a105e5f44d7c0f38**, tree dbb260e4c741f82bb937651c32201fbda73d3f56, nhánh chore/online-readiness. GitHub MCP đọc lại SHA sau push đúng; cập nhật ref với lease430d379 và force=false. Build cloud báo hoàn tất20s. Không PR/merge/promote/production hoặc đổi visibility.
- Vercel Authentication giữ enabled/all_except_custom_domains. Chrome context mới chưa đăng nhập bị chặn đúng; trình duyệt có phiên chủ dự án mở được UI. Người dùng cần đăng nhập Vercel đúng tài khoản có quyền nếu được hỏi. Chưa chia sẻ quyền BTC. GET qua MCP dùng cơ chế truy cập tạm của Vercel, không công bố token trong URL bàn giao, tài liệu hoặc source.
- CUA dùng phiên Vercel chủ dự án, kiểm **14tổ hợp:7route ×390/1440**, mở trực tiếp + refresh,1h1/trang, không tràn ngang. Home/features/about/create/history/login mở đúng; account guest chuyển login; Google button disabled và thông báo đúng. Viewport tạm đã reset; tab trang chủ giữ làm bàn giao. Không OAuth/account giả hoặc thay Supabase config.
- Form sample chỉ điền4trường; gửi thật tới API ứng dụng khi Preview không có key cho lỗi AI_NOT_CONFIGURED có kiểm soát, giữ nguyên form,0caption/0bản ghi mới. Không inference upstream. Session GET trả guest/user=null/configured=false/loginEnabled=false, Cache-Control private/no-store,Vary Cookie,nosniff. Cookie Secure/HttpOnly/Lax cho HTTPS có tests SDK; chưa có session Google Preview thật để kiểm cookie end-to-end.
- 61file source trước deploy và32client chunks qua scan giá trị key đã biết/mẫu secret/OAuth code/PII/artifact cấm không có phát hiện; env/log/ảnh/evidence không nằm trong Git. Vercel env chỉ3Config kể trên, không GEMINI_API_KEY/FreeLLMAPI key/Supabase key/Google secret. Không inference mới: budget cũ vẫn4/4.
- Bằng chứng riêng: evidence/vercel-preview-2026-10-28/owner-browser-results.json và ảnh desktop/mobile; không push ảnh hoặc trạng thái/cookie phiên. Headless không có phiên Vercel dừng ngay ở protection, không hạ bảo vệ để test.

## Tiếp theo

1. Người dùng có thể xem và góp ý UI ngay tại URL trên khi máy phát triển tắt; đây là Preview giới hạn, không nghiệm thu AI/BTC dài hạn.
2. Để bật AI: tạo khóa Gemini thay thế, nhập trực tiếp vào **Vercel→captionquangcao→Settings→Environment Variables→GEMINI_API_KEY**, loại Secret/Sensitive, target **Preview**, Git branch **chore/online-readiness**. Không dán chat hoặc đưa key cũ lên cloud. Cần quyền/ngân sách inference mới và hạn mức dùng chung trước redeploy bật AI; chưa gọi thêm trong lượt này.
3. Để bật Google: đặt3biến Supabase URL/publishable/AUTH_SITE_URL đúng origin Preview và AUTH_GOOGLE_ENABLED=true sau khi thêm4callback chính xác vào allowlist Supabase, giữ callback/SiteURL local và secret provider. Chưa cần làm việc này để xem UI. Kiểm account ngoài chủ/expiry và protection BTC trước tuyên bố dùng thật.
4. Nhánh có thể có commit docs sau f1a42a7; Preview vẫn trỏ đúng source f1a42a7, không cần redeploy vì chỉ đổi tài liệu bàn giao.
