# CaptionQuangCao — chuẩn bị online, 27–28/10/2026

**Hiện hành28/10:** đích duy nhất **https://caption-quang-cao.vercel.app/**, Production, main1261f83, deploymentdpl_B4CW5RjiQRnPHieGSywnaYLEdSJY READY. Đã có7env/4callback exact, Googleonline login/callback/account/reload/logout và AIonline3/3/5 thật; AUTO chọn model server từ2stablecandidate, model thực3.1-flash-lite/4331ms. Copy/lịch sử reload đạt. Người dùng duyệt2Redeploy riêng và chuyển tích hợp sang main; autodeployfalse, không tự deploy thêm. Xem AI_AUTO_PROGRESS.md/DEPLOYMENT_TARGET.md. Keycloud do người dùng giữ, không đọc/thay/copy. AUTO3/3 và đợt cũ4/4 hết; chất lượng dữ kiện/tông, tài khoản ngoài,expiry,quota tải,Q1/Q3 chưa hoàn tất. Không tuyên bố sẵn sàngBTC lâu dài. Ghi chép Preview/provider/modelcốđịnh/lỗi bên dưới là lịch sử.

**Preview hiện hành đã READY:** [Mở website](https://captionquangcao-f65hx7fhz-dragons-projects-e23cb252.vercel.app/), deployment dpl_E9WCtuTka6nPD3pUfqEJSTbhn1vB, commit f1a42a7 trên chore/online-readiness. Người dùng đã cho phép push/deploy Preview, giữ main/production. Xem PREVIEW_PROGRESS.md. Preview chưa có AI/key mới và Google chưa cấu hình; không mang khóa đã lộ lên Vercel hoặc gọi inference thêm. Các cửa “chưa deploy” bên dưới là giới hạn của giai đoạn trước hoặc cửa bản hoàn chỉnh, không chặn Preview này.

**Quyết định hiện hành 28/10:** người dùng đổi sang **Gemini Developer API trực tiếp để kiểm local và chuẩn bị online**, hoãn A/FreeLLMAPI trên VPS. Runtime server cho phép chọn thủ công bằng env, không giao diện chọn provider hoặc fallback. Giữ nguyên cấu hình FreeLLMAPI cũ. Model khóa `gemini-3.8-flash`, reasoning low, endpoint REST chính thức `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`. Chi tiết: [GEMINI_PROGRESS](GEMINI_PROGRESS.md). Phần so sánh A/B cũ bên dưới là lịch sử nghiên cứu, không còn là quyết định hiện hành.

**Chưa deploy; tích hợp Gemini qua test giả đạt, inference thật đang bị chặn bởi lỗi upstream.** Dùng đủ4/4 lượt cho phép; lượt3 và4 (đối chiếu native) ghi HTTP503 từ Google; lượt1 app502, lượt2 mất bằng chứng do lỗi harness nhưng vẫn tính ngân sách. Không có bộ output thành công, không kết luận chất lượng đạt. Không gọi thêm, retry, sửa JSON bằng AI, bật billing hoặc đổi model/provider. OAuth local chạy thật không đồng nghĩa ứng dụng sẵn sàng BTC khi máy tắt.

## Hiện trạng đã đối chiếu

| Hạng mục | Kết quả |
|---|---|
| Google OAuth local | Đã kiểm Google → Supabase → callback → account/server verification, reload, logout, Back về guest |
| Tài khoản Google ngoài chủ/BTC | Chưa thử thật; không lấy tài khoản chủ làm bằng chứng |
| Hết hạn/refresh/remote revocation | Có tests SDK/upstream giả; chưa kiểm hết hạn thật |
| Chức năng local Bước 3 | Copy/tạo lại/lịch sử/count đã đạt phạm vi đã thử |
| Chất lượng AI Bước 4 | Chưa đạt: có bịa dữ kiện, hashtag/tiếng Việt/tông hài hước lỗi; injection chưa đủ bằng chứng ngữ nghĩa |
| AI đang chạy | Next server → Gemini trực tiếp, model cố định `gemini-3.8-flash`, low, timeout90s; giữ FreeLLMAPI/auto cho rollback thủ công. Chưa inference thành công |
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

Thiết kế A cần làm rõ: reverse proxy chỉ cho route chat cần dùng, bắt buộc xác thực server→server/TLS và rate limit, dashboard chỉ loopback/kênh quản trị được duyệt; không mở full router/dashboard ra Internet. Vercel Hobby không được giả định có IP egress cố định để whitelist. Chưa xây hoặc cấp khóa truy cập mới, không tạo tunnel. Kiểm điều kiện private gateway phục vụ một app demo khác với phát hành public proxy; nếu provider không cho phép thì không triển khai chỉ vì kỹ thuật chạy được.

**Cửa điều kiện chưa qua:** FAQ định vị personal-use/single-user và khuyến cáo không public proxy; **MIT của phần mềm cho phép dùng/sửa/phân phối, kể cả thương mại**, nên không suy FAQ thành điều khoản MIT cấm nhiều người. Nhưng MIT không cấp quyền dùng quota/tài khoản upstream phục vụ người khác. Cần đối chiếu provider thật trong auto và điều kiện tài khoản tương ứng; hiện chưa đủ để chốt demo BTC hợp lệ. Premium terms chỉ điều chỉnh dịch vụ catalog, không mua hạ tầng/inference hay quyền upstream. Không tìm khóa khác. [Docker](https://github.com/tashfeenahmed/freellmapi/blob/main/docker/README.md), [FAQ](https://freellmapi.co/faq), [MIT](https://github.com/tashfeenahmed/freellmapi/blob/main/LICENSE), [Premium terms](https://freellmapi.co/terms).

Giá VM tham chiếu chính thức DigitalOcean Basic1GiB/1vCPU/25GiB SSD/1.000GiB transfer **$6/tháng**, hoặc2GiB **$12/tháng**; không khẳng định1GiB đủ trước khi đo. Chưa gồm thuế/backup/domain/egress bổ sung; không có cam kết VM miễn phí lâu dài. Tài khoản/billing VPS cần người dùng chấp thuận, không tự tạo hoặc thanh toán. Router có free tiers upstream theo tài khoản nhưng quota/model thay đổi; VM không tạo thêm quota. [Droplet pricing](https://www.digitalocean.com/pricing/droplets).

Thêm một hop mạng và `auto` có thể đổi model/fallback, nên chưa hứa latency ổn định. Bằng chứng local có timeout45s và các lượt hợp lệ khoảng7–14s, không ngoại suy sang VPS. Sau duyệt: pin image/version, xác minh quyền upstream, URL/Host allowlist, secret server, volume/restart/backup, timeout90s bên app, limiter dùng chung, test fake HTTP/JSON/timeout và budget inference chất lượng được giao riêng. Không tự mở router/tunnel.

### B. Hosted API trực tiếp từ Next server — khuyến nghị có điều kiện

Ứng viên cụ thể: **Gemini Developer API**, model `gemini-3.5-flash-lite`; không phải tên model của Codex. Hạ tầng Google chạy khi desktop tắt, bớt VM/router/fallback khó kiểm. Cần Google AI Studio/project có quyền API và quota thực, key riêng chỉ trên server, model cố định. BTC chỉ gọi app; không cần API key của BTC. OAuth Google của website không tự cấp Gemini API quota/key.

Giá Standard hiện niêm yết Free input/output trong quota thực được cấp; Paid **$0,30/triệu input +$2,50/triệu output token**, output gồm thinking. Ví dụ phép tính1.000lượt×(1.000input+700output)≈**$2,05** inference nếu Paid; không dự báo token thực, chưa hosting/thuế. Quota RPM/TPM/RPD theo project/tier trong AI Studio, không có một số Free chung được bảo đảm cho tài khoản này; vượt quota trả429, không tự mua hoặc đổi model. [Pricing](https://ai.google.dev/gemini-api/docs/pricing), [quota](https://ai.google.dev/gemini-api/docs/rate-limits).

Điều kiện:18+, API client không hướng tới/có khả năng trẻ dưới18 truy cập, mục đích professional/business development; vùng hỗ trợ gồm Việt Nam, EEA/UK/Switzerland phải Paid. Free input/output có thể được dùng cải thiện sản phẩm và người đánh giá xem; không gửi dữ liệu cá nhân/bí mật/nhạy cảm vào Free. Chưa xác nhận audience sản phẩm đáp ứng điều kiện18+ hoặc quota tài khoản, nên phải chốt trước triển khai; demo phi thương mại trên Hobby và mục đích dùng Gemini phải được xét riêng, không suy một điều kiện thay điều kiện kia. [Terms](https://ai.google.dev/gemini-api/terms), [regions](https://ai.google.dev/gemini-api/docs/available-regions).

Cách tích hợp dự kiến: dùng fetch sẵn có, không thêm SDK chỉ để gọi một endpoint; API chính thức hoặc compatibility `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` đã có tài liệu, không tự đoán endpoint. Sau lựa chọn mới viết adapter cấu hình server/allowlist, schema3/3/5, cap/timeout/HTTP/JSON/lỗi Việt; giữ không retry/repair/fallback mẫu. Kiểm unit fake cho adapter/auth/origin và budget inference có giới hạn để đo chất lượng/latency. Chưa gọi inference nên không tuyên bố nhanh hơn hoặc đạt Bước4. [Compatibility](https://ai.google.dev/gemini-api/docs/openai), [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

Lịch sử: người dùng từng chọn A, sau đó **đã đổi sang Gemini trực tiếp ngày28/10**. A hoãn; không thuê VPS hoặc công khai router. Không dùng giá/model đề xuất cũ làm cấu hình hiện hành.

## Biến môi trường và ranh giới API online

| Biến | Nơi/giá trị sau duyệt |
|---|---|
| SUPABASE_URL | Server Vercel, đúng project CaptionQuangCao |
| SUPABASE_PUBLISHABLE_KEY | Enabled modern publishable key đúng project; không secret/service-role |
| AUTH_SITE_URL | Origin HTTPS cố định của môi trường; local vẫn127.0.0.1 |
| AUTH_GOOGLE_ENABLED | true sau kiểm provider/callback môi trường đó |
| AI_PROVIDER | `gemini` trong server Vercel sau khi được phép cấu hình/deploy |
| GEMINI_API_KEY | Secret server của project Free tier đã xác minh; phải thay khóa đã gửi trong chat trước online; không NEXT_PUBLIC_ |
| GEMINI_MODEL | `gemini-3.8-flash`; server từ chối model khác, URL Google HTTPS cố định trong code |

Không copy Google Client Secret vào repo/Vercel/client: nó ở Google provider Supabase. Không chạy env pull ghi đè env local. Chưa đặt biến Vercel. Env AI local đã đổi theo yêu cầu; chỉ file ignored `prototype/.env.local` nhận khóa Gemini, không sao chép vào checkout. [Env Secret/Config](https://vercel.com/docs/environment-variables).

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

1. Gemini đã được duyệt cho thử local; người dùng xác nhận18+, demo công việc/kinh doanh tại Việt Nam và dữ liệu giả/công khai. AI Studio project QuangCao Free tier cho model hiện5RPM/250KTPM/20RPD, có thể trễ15phút. Metadata200 không chứng minh inference/quota dùng được: inference cuối vẫn503. Cần khắc phục upstream và thử lại trong ngân sách mới được giao; thay khóa đã lộ; kiểm audience thực trước online, không mở cho người dưới18 hoặc khu vực không được phép.
2. Adapter upstream + HTTPS origin/Host guard + rate limit/cost cap đa instance được kiểm, guest vẫn dùng đủ5chức năng.
3. AI chất lượng Bước4 và budget inference/latency cloud; không lấy JSON hợp lệ thay chất lượng.
4. Vercel Next/root/scripts/Fluid/protection và env đúng; online callback giữ local; tài khoản ngoài và hết phiên/refresh thật được kiểm.
5. Q1/Q3 BTC chưa đóng; chỉ deploy theo phạm vi được duyệt, không tuyên bố dùng lâu dài/free vô hạn.

Phần độc lập đã chuẩn bị: source GitHub sạch, README, lockfile, chặn autodeploy, kiểm không inference và tài liệu này. Lượt triển khai tiếp khuyến nghị **GPT-6.1 Sol · High · tốc độ tiêu chuẩn**: đủ để sửa adapter/guard có test và kiểm online khi được duyệt. Không cần đổi model Codex thành model inference.

## Bổ sung Gemini ngày28/10 — chưa push thay đổi lượt này

Thay đổi đang chuẩn bị trên `chore/online-readiness`, HEAD trước sửa `430d379ed4d34ecab017a03a9557c822b50a9c29`. Không merge/deploy/push trong lượt Gemini. Git autodeploy vẫn false ở cả hai vercel.json. Có38/38 node tests (thêm6ca Gemini), build/typecheck đạt; Chrome16nhóm và35tổ hợp trang/kích thước dùng interception đạt, không làm lại OAuth. Kết quả đầy đủ và điều kiện vận hành tại GEMINI_PROGRESS.md; không đóng chất lượng Bước4/Q1/Q3 hoặc tuyên bố BTC dùng lâu dài.

## Kết quả Git và kiểm cuối — 28/10/2026

- Source đã push qua GitHub MCP trên nhánh **chore/online-readiness**, commit nhập mã **116da0c2a456a76a438a95e15ae388c04a3b0cb4**; parent là commit gốc07bc854. Main không đổi, không force push/đổi visibility/tạo repo/PR/merge.
- Remote tree `c20aa259a402854d24a99062be44488fa9e80bf4` khớp chính xác tree index đã kiểm. Git ls-remote và đọc lại README/package/vercel.json qua MCP xác nhận commit và cấu hình trên remote; checkout local đã đồng bộ sạch.
-59file được rà trong index; scan giá trị AI key/publishable local chỉ so khớp có/không, mẫu secret/OAuth code, đường dẫn/email cá nhân và file cấm không phát hiện vấn đề. Lora OFL attribution giữ lại; chỉ bỏ một dấu cách cuối dòng để diff check sạch. Không in khóa. Scan không phải chứng minh mọi loại secret chưa biết đều được phát hiện.
- Cài checkout sạch theo lockfile với scripts disabled; **32/32 tests, build, typecheck đạt**. Browser V2 mới16nhóm/35route×viewport và auth doubles5nhóm đạt;0inference thật, không làm lại OAuth. App/lib auth/AI hiện hành không đổi hành vi; chỉ packageManager/Node pin,3harness bỏ đường dẫn máy cá nhân, gitignore/deploy gates/docs.
- Vercel list theo SHA source mới trả0deployments tại lần kiểm. Deployment production cũ vẫn trỏ initial commit; chưa có app online mới.
- GET metadata router local bằng cấu hình server đã có trả104mục available nhưng owned_by chỉ ghi freellmapi, không có provider/account thực. Không gọi inference/probe, đọc DB hoặc tìm khóa khác. Vì vậy **vẫn cần tên provider đang bật trong auto (không khóa)** trước khi đối chiếu điều kiện A; availability không chứng minh quota/inference thành công.
- Bản cập nhật tài liệu có thể là commit kế tiếp trên cùng nhánh; xem lịch sử nhánh để lấy HEAD cuối. Không tự bật deploy từ bản chuẩn bị này.
