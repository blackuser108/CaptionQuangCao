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
