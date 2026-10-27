# CaptionQuangCao — chuẩn bị online, 27–28/10/2026

**Quyết định mới 28/10:** người dùng chọn **A — giữ router, làm rõ điều kiện trước**. Bên dưới giữ B làm phương án đối chiếu, không còn là hướng được chọn. Chưa duyệt VPS/billing, mở router hoặc inference. Cần xác định provider thực trong chuỗi auto và điều kiện cho demo BTC trước khi triển khai A.

**Chưa deploy và chưa đổi provider AI.** OAuth local chạy thật không đồng nghĩa toàn bộ ứng dụng đã sẵn sàng cho BTC khi máy phát triển tắt.

## Hiện trạng đã đối chiếu

| Hạng mục | Kết quả |
|---|---|
| Google OAuth local | Đã kiểm Google → Supabase → callback → account/server verification, reload, logout, Back về guest |
| Tài khoản Google ngoài chủ/BTC | Chưa thử thật; không lấy tài khoản chủ làm bằng chứng |
| Hết hạn/refresh/remote revocation | Có tests SDK/upstream giả; chưa kiểm hết hạn thật |
| Chức năng local Bước 3 | Copy/tạo lại/lịch sử/count đã đạt phạm vi đã thử |
| Chất lượng AI Bước 4 | Chưa đạt: có bịa dữ kiện, hashtag/tiếng Việt/tông hài hước lỗi; injection chưa đủ bằng chứng ngữ nghĩa |
| AI đang chạy | Next server → FreeLLMAPI `127.0.0.1:31415/v1/chat/completions`, alias `auto`, timeout90s; Vercel không gọi được router desktop |
| BTC Q1/Q3 | Còn mở; Bước0 tổng thể MỘT PHẦN |

## GitHub: đích và cách tích hợp

Đích đã xác minh bằng GitHub MCP: [blackuser108/CaptionQuangCao](https://github.com/blackuser108/CaptionQuangCao), owner/account kết nối blackuser108, quyền admin/push, **đã public sẵn**, không đổi visibility. Remote main tại `07bc85405239cc38620cda228bdafe5659edad42` chỉ có README hai dòng. Không mặc định repo trống; giữ commit gốc và hai dòng README.

Workspace làm việc chưa có Git. Tạo checkout riêng `online-source`, nhánh `chore/online-readiness` từ remote main; chỉ đưa app và tài liệu vận hành đã lọc. Không thay thế lịch sử/force push, không tự merge main. Git CLI đọc được remote nhưng chưa có đăng nhập push; GitHub MCP có quyền ghi nên dùng Git Database API sau khi kiểm nội dung. Bản commit/remote cuối được ghi trong báo cáo bàn giao tại workspace, không tự tham chiếu SHA của chính tài liệu này.

Hai `vercel.json` ở root và `prototype` đặt `git.deploymentEnabled=false`: chặn push tự tạo deployment khi Root Directory hiện còn ở root hoặc sau này chuyển sang prototype. Chưa bật pipeline deploy/Actions; chỉ bỏ chặn sau khi có quyền deploy riêng và các cửa bên dưới được xử lý. [Cấu hình Git chính thức](https://vercel.com/docs/project-configuration/git-configuration).

Không đưa env chứa giá trị, workbook, ảnh/log/evidence cá nhân, cookie/OAuth code, baseline, node_modules/.next, DB hoặc credential files vào Git. `.env.example` chỉ placeholder. Tests dùng UUID/email `.test` và token giả rõ nhãn. Giữ bản local đầy đủ bằng chứng riêng, không xóa dữ liệu người dùng. Bản công khai chứa source/UI V2, pinned lockfile, test logic và ba harness browser hiện hành; harness lịch sử có chế độ live được giữ local, không phát hành.

## Vercel: đã đọc, chưa thay cấu hình

MCP và Dashboard cùng xác minh project `captionquangcao`, id `prj_6AILQykwQf5nUmTFhrcz5pSiQ38a`, team Dragon's projects (`dragons-projects-e23cb252`), **Hobby**, Git link đúng blackuser108/CaptionQuangCao. Sau người dùng cấp team access, đọc được project và danh sách env **rỗng** mà không decrypt giá trị.

Dashboard Build and Deployment hiện: **Framework Other**, **Root Directory trống**, Node24.x; Build/Install/Output/Development overrides đều tắt, Ignored Build Step=Automatic. Vì vậy chưa phải cấu hình Next app trong prototype. MCP `live=false`, có deployment production READY cũ; trạng thái đó không chứng minh app AI hiện tại đã lên mạng. Không tạo deployment mới để kiểm.

| Cần đặt sau khi được duyệt | Giá trị/kế hoạch |
|---|---|
| Root Directory | `prototype` |
| Framework | Next.js |
| Node/package manager | Node24.x, packageManager pnpm11.25.0, lockfile pin |
| Install | `pnpm install --frozen-lockfile --ignore-scripts` đã kiểm sạch; không bật scripts hàng loạt |
| Build | `pnpm build`; Output Directory dùng mặc định Next, không static export |
| Start local | `pnpm start` bind127.0.0.1; Vercel dùng framework/serverless, không đổi local thành public |
| Duration | Dashboard xác minh Fluid Compute Enabled, region iad1; giữ Node runtime, dự kiến maxDuration120s cho budget app90s sau duyệt |
| Protection/BTC | Hiện Vercel Authentication `all_except_custom_domains`; cần kiểm quyền BTC mở domain, không tự tắt protection |

Dashboard đã xác minh **Fluid Compute Enabled**, region **iad1**, Hobby có300s default/max theo tài liệu;90s app +95s browser nằm dưới mức này. Chưa đo latency cloud/P95 hoặc kiểm một function đã deploy; cần kiểm output function config maxDuration khi build online. Request16KiB/output32KiB nhỏ hơn payload4,5MB hosting. Hobby chỉ personal/non-commercial; demo học tập cần đúng mục đích đó, kinh doanh phải xét gói riêng, không tự nâng. [Function limits](https://vercel.com/docs/functions/limitations), [duration](https://vercel.com/docs/functions/configuring-functions/duration), [Hobby](https://vercel.com/docs/plans/hobby).

## Hai hướng AI, đều cần quyết định riêng

### A. Giữ FreeLLMAPI, chạy Docker trên VPS riêng

Kỹ thuật có thể chạy khi desktop tắt: VM luôn chạy, Docker + volume SQLite và ENCRYPTION_KEY ổn định, provider keys riêng; app server gọi endpoint HTTPS kiểm soát truy cập, dashboard/router không public. Cần thiết kế kết nối Vercel→router được bảo vệ, không mở proxy cho mọi người, không chia sẻ unified key cho client. Docker là server lâu dài, không đặt router SQLite trong Vercel Functions. Chưa di chuyển key/DB local hoặc tạo VPS.

**Cửa điều kiện chưa qua:** FAQ định vị personal-use/single-user và khuyến cáo không public proxy; **MIT của phần mềm cho phép dùng/sửa/phân phối, kể cả thương mại**, nên không suy FAQ thành điều khoản MIT cấm nhiều người. Nhưng MIT không cấp quyền dùng quota/tài khoản upstream phục vụ người khác. Cần đối chiếu provider thật trong auto và điều kiện tài khoản tương ứng; hiện chưa đủ để chốt demo BTC hợp lệ. Premium terms chỉ điều chỉnh dịch vụ catalog, không mua hạ tầng/inference hay quyền upstream. Không tìm khóa khác. [Docker](https://github.com/tashfeenahmed/freellmapi/blob/main/docker/README.md), [FAQ](https://freellmapi.co/faq), [MIT](https://github.com/tashfeenahmed/freellmapi/blob/main/LICENSE), [Premium terms](https://freellmapi.co/terms).

Giá VM tham chiếu chính thức DigitalOcean Basic1GiB/1vCPU/25GiB SSD/1.000GiB transfer **$6/tháng**, hoặc2GiB **$12/tháng**; không khẳng định1GiB đủ trước khi đo. Chưa gồm thuế/backup/domain/egress bổ sung; không có cam kết VM miễn phí lâu dài. Tài khoản/billing VPS cần người dùng chấp thuận, không tự tạo hoặc thanh toán. Router có free tiers upstream theo tài khoản nhưng quota/model thay đổi; VM không tạo thêm quota. [Droplet pricing](https://www.digitalocean.com/pricing/droplets).

Thêm một hop mạng và `auto` có thể đổi model/fallback, nên chưa hứa latency ổn định. Bằng chứng local có timeout45s và các lượt hợp lệ khoảng7–14s, không ngoại suy sang VPS. Sau duyệt: pin image/version, xác minh quyền upstream, URL/Host allowlist, secret server, volume/restart/backup, timeout90s bên app, limiter dùng chung, test fake HTTP/JSON/timeout và budget inference chất lượng được giao riêng. Không tự mở router/tunnel.

### B. Hosted API trực tiếp từ Next server — khuyến nghị có điều kiện

Ứng viên cụ thể: **Gemini Developer API**, model `gemini-3.5-flash-lite`; không phải tên model của Codex. Hạ tầng Google chạy khi desktop tắt, bớt VM/router/fallback khó kiểm. Cần Google AI Studio/project có quyền API và quota thực, key riêng chỉ trên server, model cố định. BTC chỉ gọi app; không cần API key của BTC. OAuth Google của website không tự cấp Gemini API quota/key.

Giá Standard hiện niêm yết Free input/output trong quota thực được cấp; Paid **$0,30/triệu input +$2,50/triệu output token**, output gồm thinking. Ví dụ phép tính1.000lượt×(1.000input+700output)≈**$2,05** inference nếu Paid; không dự báo token thực, chưa hosting/thuế. Quota RPM/TPM/RPD theo project/tier trong AI Studio, không có một số Free chung được bảo đảm cho tài khoản này; vượt quota trả429, không tự mua hoặc đổi model. [Pricing](https://ai.google.dev/gemini-api/docs/pricing), [quota](https://ai.google.dev/gemini-api/docs/rate-limits).

Điều kiện:18+, API client không hướng tới/có khả năng trẻ dưới18 truy cập, mục đích professional/business development; vùng hỗ trợ gồm Việt Nam, EEA/UK/Switzerland phải Paid. Free input/output có thể được dùng cải thiện sản phẩm và người đánh giá xem; không gửi dữ liệu cá nhân/bí mật/nhạy cảm vào Free. Chưa xác nhận audience sản phẩm đáp ứng điều kiện18+ hoặc quota tài khoản, nên phải chốt trước triển khai; demo phi thương mại trên Hobby và mục đích dùng Gemini phải được xét riêng, không suy một điều kiện thay điều kiện kia. [Terms](https://ai.google.dev/gemini-api/terms), [regions](https://ai.google.dev/gemini-api/docs/available-regions).

Cách tích hợp dự kiến: dùng fetch sẵn có, không thêm SDK chỉ để gọi một endpoint; API chính thức hoặc compatibility `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` đã có tài liệu, không tự đoán endpoint. Sau lựa chọn mới viết adapter cấu hình server/allowlist, schema3/3/5, cap/timeout/HTTP/JSON/lỗi Việt; giữ không retry/repair/fallback mẫu. Kiểm unit fake cho adapter/auth/origin và budget inference có giới hạn để đo chất lượng/latency. Chưa gọi inference nên không tuyên bố nhanh hơn hoặc đạt Bước4. [Compatibility](https://ai.google.dev/gemini-api/docs/openai), [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

Khuyến nghị ban đầu B dựa trên ít thành phần vận hành, nhưng **người dùng đã chọn A**. Không chuyển Gemini trực tiếp. Trước A cần danh sách provider thực (không khóa), quyền/quota/dữ liệu cho demo nhiều người, kiến trúc router private và budget VPS được duyệt; chưa có các thông tin đó thì giữ cửa triển khai đóng.

## Biến môi trường và ranh giới API online

| Biến | Nơi/giá trị sau duyệt |
|---|---|
| SUPABASE_URL | Server Vercel, đúng project CaptionQuangCao |
| SUPABASE_PUBLISHABLE_KEY | Enabled modern publishable key đúng project; không secret/service-role |
| AUTH_SITE_URL | Origin HTTPS cố định của môi trường; local vẫn127.0.0.1 |
| AUTH_GOOGLE_ENABLED | true sau kiểm provider/callback môi trường đó |
| AI credential | Chỉ loại Secret trong Vercel, đặt tên/giá trị theo phương án được duyệt; không NEXT_PUBLIC_ |
| AI URL/model | Cấu hình server cố định/allowlist, chỉ được thêm sau lựa chọn A/B; không client quyết định |

Không copy Google Client Secret vào repo/Vercel/client: nó ở Google provider Supabase. Không chạy env pull ghi đè env local. Chưa đặt biến Vercel hoặc đổi env AI đang chạy. [Env Secret/Config](https://vercel.com/docs/environment-variables).

Guard AI hiện từ chối mọi Host/URL ngoài loopback. Cần đổi có test, không tắt validation: đối chiếu origin HTTPS cấu hình, Host đã chuẩn hóa với domain cố định, không tin forwarded Host/client tùy ý; giữ kiểm Origin/Sec-Fetch-Site/MIME/body limit và rejection trước fetch. Test forged Host/origin/subdomain/port/cross-site, redirects/SSRF; upstream cố định không theo request. Giữ guest đủ5chức năng, thêm hạn mức dùng chung/cap ngân sách và chống lạm dụng phù hợp Internet; `inFlight` một process không bảo vệ nhiều instance. Những thay đổi này chưa làm trong lượt nghiên cứu.

## Supabase và Google online, giữ local hoạt động

MCP hiện project `malkwhxhvgdxkwhuwrrw` ACTIVE_HEALTHY, ap-south-1. Site URL local và bốn callback đã lưu ở lượt auth giữ nguyên. Domain Vercel gắn sẵn **captionquangcao.vercel.app** chỉ là ứng viên; chưa xác nhận app mới/AI/BTC truy cập ở đó. Không đổi Site URL trước khi origin đó hợp lệ và deploy được duyệt.

Sau duyệt origin chính: đặt AUTH_SITE_URL HTTPS ở Vercel; thêm bốn Redirect URLs bên dưới, **giữ nguyên bốn local**. Query phải đúng code, không wildcard mọi preview. Preview auth muốn dùng phải có origin được cấp riêng, không lấy Host bất kỳ làm redirect.

```text
https://captionquangcao.vercel.app/auth/callback
https://captionquangcao.vercel.app/auth/callback?next=%2Faccount
https://captionquangcao.vercel.app/auth/callback?next=%2Fcreate
https://captionquangcao.vercel.app/auth/callback?next=%2Fhistory
```

Google→Supabase vẫn `https://malkwhxhvgdxkwhuwrrw.supabase.co/auth/v1/callback`; Supabase→ứng dụng mới dùng origin online. Không dùng callback Auth.js cũ. HTTPS cookie phải Secure/HttpOnly/Lax, proxy refresh và private/no-store; account getUser server. localStorage không tự chuyển domain, không đồng bộ hoặc bảo mật. [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).

Google Dashboard đọc trực tiếp: **External, Testing**, test users trống, Publish disabled do Branding chưa hoàn tất; Data Access ba nhóm scope đều chưa khai báo. Request auth thực tế từ code chỉ openid/email/profile. Docs có ngoại lệ Testing cho basic Google sign-in: không mặc định100testusers/7ngày áp cho app này. Tuy vậy phải kiểm tài khoản Google ngoài chủ/Workspace restrictions, consent thực và deployment protection; không tự Publish/add BTC email. [Google Audience](https://support.google.com/cloud/answer/15549945).

Supabase Free hiện50.000MAU/500MBDB/5GBegress/1GBstorage, có thể pause sau7ngày ít hoạt động; auth-only không bảo đảm tránh pause. Trước BTC kiểm health và quota; nếu pause, Dashboard→CaptionQuangCao→Resume, đợi healthy rồi kiểm lại; docs hiện cho restore trong1năm. Không cron chống pause/tự mua Pro ($25/tháng trở lên). [Pricing](https://supabase.com/pricing), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing). Changelog đã kiểm lại; không cần làm lại auth local.

## Cửa chặn deploy hoàn chỉnh

1. Người dùng chọn/duyệt A hoặc B; điều kiện tài khoản/provider/chi phí/dữ liệu/audience phù hợp; chưa tạo key/tài khoản/billing.
2. Adapter upstream + HTTPS origin/Host guard + rate limit/cost cap đa instance được kiểm, guest vẫn dùng đủ5chức năng.
3. AI chất lượng Bước4 và budget inference/latency cloud; không lấy JSON hợp lệ thay chất lượng.
4. Vercel Next/root/scripts/Fluid/protection và env đúng; online callback giữ local; tài khoản ngoài và hết phiên/refresh thật được kiểm.
5. Q1/Q3 BTC chưa đóng; chỉ deploy theo phạm vi được duyệt, không tuyên bố dùng lâu dài/free vô hạn.

Phần độc lập đã chuẩn bị: source GitHub sạch, README, lockfile, chặn autodeploy, kiểm không inference và tài liệu này. Lượt triển khai tiếp khuyến nghị **GPT-6.1 Sol · High · tốc độ tiêu chuẩn**: đủ để sửa adapter/guard có test và kiểm online khi được duyệt. Không cần đổi model Codex thành model inference.
