# Đích Vercel hiện hành — 28/10/2026

## Cập nhật30/10 — merge source, người dùng tự deploy

Đợt LD_UI ec22d80 tích hợp trực tiếp main sau kiểm/sửa env/focus và mô tả. Đích duy nhất vẫn là projectcaption-quang-cao/prj_OjU1NJMX1kQl5eYFuAvvBd4bvCZi. Không tạo deployment/redeploy/promote hoặc đổi env/callback trong đợt này; hai manifest giữ autodeployfalse. Chọn main và kiểm SHA mới khi tự deploy; xem LD_UI_REVIEW.md. Các ID deployment/kết quả online ngày28/10 dưới đây chỉ là lịch sử, không bằng chứng bản merge30/10 đã lên online.

## Hiện hành sau lần duyệt bổ sung

Website **https://caption-quang-cao.vercel.app/** đang phục vụ source **main1261f83f1e6c531138943f2c9b508b381e0f9f81**, deployment **dpl_B4CW5RjiQRnPHieGSywnaYLEdSJY**, READY/production. Người dùng duyệt thêm1Redeploy sau lần đầu; đã thực hiện tổng2lần có duyệt riêng, không tự vượt giới hạn.

**Google online đã kiểm thật; AI online đã tạo thật3/3/5**, model thực gemini-3.1-flash-lite/4331ms/HTTP200. Copy và lịch sử reload/Xem lại đạt. AUTO3/3 và đợt cũ4/4 đã dùng hết, chưa inference Tạo lại/cả3tông online. Chất lượng còn tính từ/lợi ích ngoài dữ kiện và caption3ngắn; tài khoản ngoài/expiry/quota/Q1Q3 còn mở. Xem AI_AUTO_PROGRESS.md. Main là nhánh tích hợp theo chỉ dẫn mới; commit tài liệu sau không đổi source runtime/không deploy thêm. Cấu hình/localcallbacks giữ nguyên, keycloud không đọc hoặc thay.

Các đoạn chờ/lỗi/nhánh cũ phía dưới là lịch sử.

## Kết quả lần cập nhật được duyệt

Đã dùng đúng **1/1** Redeploy: dpl_FJXoNi2ocz3sb6f9w9AynKq83E2J READY/production, source60c23a38d3ff1a592351bf1eaa3f9111a3b4419a, domain canonical trỏ đúng. Đã lưu7env và4callback; Google online login/callback/account/reload/logout thật đạt,14ca trang/mobile đạt. AI local AUTO thành công nhưng AI online lượt2/3 còn AI_NOT_CONFIGURED; không báo hoàn chỉnh.

**Nhánh hiện hành đổi sang main theo yêu cầu trực tiếp mới của người dùng.** Giữ toàn bộ lịch sử/main3b400ea và source60c23a3. Không tạo branch/PR/deploy mới từ chỉ dẫn main; autodeployfalse vẫn giữ. Bản trim khoảng trắng cấu hình Gemini đã có test, sẽ đưa main nhưng chưa áp dụng online nếu chưa được phép thêm1Redeploy. Chi tiết AI_AUTO_PROGRESS.md.

## Cập nhật được duyệt trong lượt hiện hành

Người dùng đã trả lời **“Cho phép cập nhật và 1 Redeploy đúng project này”**. Quyền này thay lệnh chờ phía dưới cho đúng một lần: cập nhật7envProduction, thêm4callback canonical, push nhánh làm việc và deploy vào project hiện có; không tạo project/alias khác, không merge main. Yêu cầu AUTO mới đổi GEMINI_MODEL dự kiến từ gemini-3.8-flash thành auto với lựa chọn cụ thể phía server, không gửi literal auto cho Google. Xem AI_AUTO_PROGRESS.md. Bảy env đã lưu;12redirect đã kiểm, SiteURLlocal không đổi. Chưa gọi inference cloud; chuẩn bị lần Redeploy duy nhất.

GEMINI_API_KEY đã có tên trong VercelProduction. Người dùng xác nhận dùng khóa cũ và yêu cầu tiếp tục; agent không đọc Secret cloud hoặc tải lại khóa local. Không coi tên biến là bằng chứng inference. Key từng lộ còn rủi ro cho tới khi chủ thay.

## Chỉ dẫn mới được ưu tiên

Người dùng đã tạo project/deployment riêng và yêu cầu **không tạo thêm**. Đích hiện hành là [caption-quang-cao](https://vercel.com/dragons-projects-e23cb252/caption-quang-cao), **không phải captionquangcao**. Không tạo project/deployment/alias hoặc trigger deploy/redeploy/push gây autodeploy khi chưa được xác nhận. Project cũ giữ nguyên; không xóa, chuyển domain hoặc promote.

Đã xác minh qua MCP:

| Thuộc tính | Giá trị |
|---|---|
| Project | caption-quang-cao |
| ID | prj_OjU1NJMX1kQl5eYFuAvvBd4bvCZi |
| Team | team_XY1HUihce74smLO9vVSthEoK |
| Website ổn định | https://caption-quang-cao.vercel.app/ |
| Deployment hiện có | dpl_EJvfap5P1uB7u25MXTFkxEvsfQQQ |
| Generated URL | caption-quang-ks7il5fii-dragons-projects-e23cb252.vercel.app |
| Trạng thái / target | READY / production, không gọi nhầm là Preview |
| Repo / metadata ref | blackuser108/CaptionQuangCao / main |
| Commit deployment | 4da2d32bf1b41ca11bea7710678752aacaba6e2e |
| Build | Cloud báo completed29s, Next.js/Node24, regioniad1 |

Alias caption-quang-cao.vercel.app đã trỏ đúng deployment trên. GitHub main hiện6b3fb46532268c169e8ee2ec65c052d01c3f65e8 (Updated .gitignore và package-lock.json), khác SHA deployment; đó là thay đổi hiện có của người dùng, agent không ghi đè/merge main. Branch làm việc chore/online-readiness còn HEAD4da2d32 với bản sửa local chưa push. prototype/vercel.json trên main vẫn deploymentEnabled=false nhưng chưa suy điều này thành quyền push hoặc redeploy.

## Đã kiểm hiện tại, chỉ đọc

- Website public mở được;7route×390/1440 và refresh đạt, không tràn ngang/không pageerror. Guest/account chuyển login đúng; Google button disabled; draft nhập không gửi vẫn giữ khi create↔history. Context Chrome riêng, không đổi dữ liệu trình duyệt cá nhân. Không gửi request generate trong smoke test.
- GET/api/auth/session trả200 guest, configured=true, loginEnabled=false, Cache-Control private/no-store. Integration đã đưa Supabase env vào production nhưng thiếu AUTH_SITE_URL/AUTH_GOOGLE_ENABLED. Không decrypt hoặc đọc service-role/JWT/DB/Google secret.
- Tên env hiện có gồm16biến Supabase/Postgres của integration. **Không có GEMINI_API_KEY, AI_PROVIDER, GEMINI_MODEL, APP_ORIGIN, AUTH_SITE_URL hoặc AUTH_GOOGLE_ENABLED** tại lần kiểm; chỉ đọc metadata tên/target/type, không giá trị. App không cần các credential đặc quyền DB/service-role/JWT; không sử dụng hoặc xóa chúng trong lượt này.
- Code guard fallback VERCEL_URL trỏ generated domain; domain ổn định khác nên thiếu APP_ORIGIN có thể bị422. Ca này **chỉ kiểm bằng upstream giả**: trước422, thêm đúngAPP_ORIGIN trả503thiếu key,0fetch. Không coi đó là status POST live đã đo.
- POST live bị automatic approval review từ chối vì có thể phát inference sau khi hết4/4; không thử vòng qua browser/proxy. Chỉ GET và upstream giả, ngân sách vẫn4/4/0lượt mới.

## Bản sửa đã chuẩn bị, chưa áp dụng online

1. app/(tool)/create/page.tsx: cảnh báo thiếu AI key cho cả Vercel preview **và production**, thay vì chỉ preview. GET/RSC live trước sửa aiUnavailable=false; production build local sau sửa true. Auth fence render checking trong SSR nên test đọc Flight prop, không coi thiếu text trong HTML là bằng chứng UI sau hydrate.
2. app/page.tsx: FAQ mô tả Google là lựa chọn khi được cấu hình, không hardcode “hiện chưa khả dụng” mãi mãi. Không redesign/framework/dependency mới.

Build production local và typecheck đạt; kiểm hồi quy banner đỏ ở bản live, xanh trên build local. Chỉ2dòng sản phẩm đổi; tests server/auth40ca đã đạt ở commit4da2d32, không chạy lặp toàn bộ vì không đổi logic đó.

## Cấu hình cụ thể cần duyệt trước kích hoạt

Mục tiêu là website hiện có tại https://caption-quang-cao.vercel.app. Deployment này là **Production**, nên chỉ đặt Preview env sẽ không có hiệu lực. Bảy biến server dưới đây phải đúng trong project mới, targetProduction, rồi **Redeploy cùng project** để snapshot mới có hiệu lực. Vercel sẽ tạo một bản ghi deployment mới kể cả gọi là Redeploy; chưa được tự làm vì người dùng yêu cầu không tạo thêm.

| Biến | Giá trị dự kiến |
|---|---|
| APP_ORIGIN | https://caption-quang-cao.vercel.app |
| AUTH_SITE_URL | https://caption-quang-cao.vercel.app |
| AUTH_GOOGLE_ENABLED | true |
| AI_PROVIDER | gemini |
| GEMINI_MODEL | gemini-3.8-flash |
| SUPABASE_URL | https://malkwhxhvgdxkwhuwrrw.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Modern publishable key enabled của CaptionQuangCao, lấy qua MCP; không ghi giá trị trong tài liệu/repo |

Không đưa Gemini key đã lộ lên cloud. GEMINI_API_KEY chỉ nhập trực tiếp bằng khóa thay thế mới được người dùng xác nhận; không đọc giá trị hoặc dùng OAuth Secret làm API key. Còn phải được giao ngân sách mới trước khi agent gọi inference thật. Không bật billing/provider/model khác/retry/fallback.

Supabase cần **thêm chính xác4callback** dưới đây, giữ SiteURLlocal và8URL đang có. UI hiện có4local +4legacyVercel của người dùng; agent chưa xóa/sửa/ghi đè. Modal thêm URL project cũ đã đóng, chưa lưu callback nhánh cũ. Không tạo wildcard mới:

```text
https://caption-quang-cao.vercel.app/auth/callback
https://caption-quang-cao.vercel.app/auth/callback?next=%2Faccount
https://caption-quang-cao.vercel.app/auth/callback?next=%2Fcreate
https://caption-quang-cao.vercel.app/auth/callback?next=%2Fhistory
```

Google→Supabase vẫn callback projectmalkwhxhvgdxkwhuwrrw đã cấu hình; không cần đọc/đổi Google Client Secret hoặc tạo OAuth app. Chưa kiểm Google login/callback/account/logout trên origin mới vì runtime đang disabled; local đã kiểm thật là bằng chứng riêng. Nếu có consent mới, người dùng tự xác nhận.

Sau được phép cập nhật: giữ branch chore/online-readiness và main của người dùng; xác minh autodeploy trước push; áp dụng env/callback như trên, cập nhật đúng project và kiểm alias sau **một lần deploy được duyệt**, không tạo project/alias khác. Kiểm cookie/cache/getUser/private account và7route tại origin ổn định, không gọi AI thật khi chưa có ngân sách. Q1/Q3/Googlengoài chủ/expiry/chất lượng AI vẫn mở.
