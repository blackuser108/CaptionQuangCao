# CaptionQuangCao
Agent tự động Viết Caption Quảng cáo

**Quyết định hiện hành 04/11/2026 — OpenRouter tự chọn model miễn phí.** Dùng `AI_PROVIDER=openrouter`, `OPENROUTER_MODEL=openrouter/free`, `CAPTION_PIPELINE=deep`; nhập `OPENROUTER_API_KEY` trực tiếp vào `prototype/.env.local` được ignore hoặc Secret Production của project Vercel `caption-quang-cao`. Không gửi khóa qua chat hoặc đưa vào client/Git. Endpoint `https://openrouter.ai/api/v1/chat/completions` và router miễn phí được khóa phía server; không gửi model trả phí hoặc model cố định. Mỗi bước chọn một model miễn phí phù hợp JSON; model thực có thể khác giữa các bước/lượt. Không gọi lại hoặc chọn model khác khi một bước lỗi. Gemini/DeepSeek/FreeLLMAPI vẫn giữ cấu hình riêng để chuyển thủ công, không fallback. Quyết định này thay lựa chọn Gemma cố định sau khi Dashboard xác nhận Google AI Studio trả429 cho Gemma free.

OpenRouter gửi `json_object`, `reasoning.enabled=false`, `provider.allow_fallbacks=false`, `require_parameters=true` và `max_price` đầu vào/đầu ra/mỗi request bằng0; không gửi danh sách model dự phòng, plugin trả phí hay gọi sửa JSON thêm. Writer4096token, các bước còn lại2048token, Deep tối đa4lượt/90giây, response32KiB mỗi lượt và validator3/3/5 giữ nguyên. Không gọi inference thật khi chưa có ngân sách riêng được duyệt; tests giả không chứng minh chất lượng tiếng Việt, quota còn lại hoặc độ trễ thực tế. HTTP402/quota/lỗi provider trả lỗi rõ và giữ bản nháp; không nạp tiền hoặc tự chuyển trả phí. Router tự chọn không làm tăng quota tài khoản. Tham chiếu [Free Models Router](https://openrouter.ai/docs/guides/routing/routers/free-router).

Theo [hạn mức OpenRouter](https://openrouter.ai/docs/api_reference/limits) kiểm04/11, tài khoản chưa mua credit có20request/phút,50request/ngày cho model miễn phí; Deep dùng đủ4lượt tương đương12lần tạo trọn bộ/ngày, quota dùng chung phía server. Hạn mức thực tế cần đọc theo tài khoản, không hứa endpoint luôn khả dụng. Tham chiếu [model](https://openrouter.ai/google/gemma-4-31b-it:free), [routing/max price](https://openrouter.ai/docs/guides/routing/provider-selection), [reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens). Các mốc “chỉ local/chưa deploy” phía dưới là lịch sử; source backend trước adapter OpenRouter đã lên main `e6ec666`/Production `dpl_FKhEFDN8LL7V2JfTUXcqe2B7zzhG`.

**Backend port 03/11/2026 — local, chưa push/deploy.** Main `94a0be1` là nền UI/auth; chỉ chọn backend từ `caption_gen ada07e8`. `CAPTION_PIPELINE` mặc định `deep`: writer, hai judge đảo thứ tự và polish khi có ghi chú, **tối đa 4 inference**. `smart` tối đa 2, `single` đúng 1. HTTP lỗi, quota, timeout hoặc JSON stage sai trả lỗi rõ; không retry, fallback provider, gọi lại single hoặc lượt repair bổ sung. Candidate ranking/nhận bản polish là lựa chọn trong kết quả đã có, không phải gọi dự phòng. Điểm chất lượng bằng code chỉ là tín hiệu/metadata, không chứng minh đúng dữ kiện và không tự khóa kết quả chỉ vì score.

Hợp đồng giữ nguyên: client gửi bốn trường; response chỉ `captions/headlines/hashtags` 3/3/5, NFC/LF; input limits, 90s toàn yêu cầu, response envelope32KiB mỗi stage. Abort request hoặc lỗi hủy các stage còn chạy. Gemini AUTO đọc catalog một lần mỗi yêu cầu; GET này không phải inference. Log chỉ model/status/duration/usage cộng dồn/mode/số lượt và mã diagnostic, không prompt/output/upstream body. Giữ các mốc 45–90 /150–260 /180–280, opening115/headline40; không đưa độ dài/UI cũ sang. Prompt không nhận inferred benefits, audience pain/motivation hoặc ví dụ khách hàng từ branch.

DeepSeek là adapter **chọn tường minh**, không thay env runtime/cloud đang có: đặt `AI_PROVIDER=deepseek`, `DEEPSEEK_MODEL=deepseek-flash`, tự nhập `DEEPSEEK_API_KEY` vào `prototype/.env.local` được Git ignore. Không gửi khóa qua chat. Endpoint cố định `https://api.deepseek.com/chat/completions`, `json_object`, thinking disabled. DeepSeek `max_tokens`: writer4096, judge/reverse/polish2048 mỗi lượt (trần tổng10240 nếu đủ bốn lượt); `single`2048. Không tạo tài khoản, thêm billing, dùng key Production hoặc gọi thật trong lượt port. Model/JSON/thinking được đối chiếu [tài liệu model](https://api-docs.deepseek.com/quick_start/pricing/), [JSON](https://api-docs.deepseek.com/guides/json_mode/), [thinking](https://api-docs.deepseek.com/guides/thinking_mode/) ngày03/11; quota/balance tài khoản và chất lượng AI thật chưa kiểm.

Bản đồ backend: `app/api/generate/route.ts` → `lib/server/generate.ts` (guard/transport/budget) → `engine/context.ts` + `prompt.ts` (brief dữ kiện) hoặc `pipeline.ts` → `agents.ts`/`schemas.ts` (stage/parser) → `select.ts`/`quality.ts` (xếp hạng/diagnostic). `deepseek.ts` chỉ giữ config server cố định; Gemini/FreeLLM transport vẫn ở handler main. Không dùng barrel engine hoặc thêm dependency. Auth/email/Google/cookie/history/components/CSS/fonts/assets/lockfiles giữ main. Server page Create chỉ nối thêm boolean sẵn sàng DeepSeek, không đổi markup hay nội dung.

Khi tiếp tục: đọc ghi chép kiểm chứng tại `evidence/caption-backend-survey-20261103` của workspace chủ. Baseline main cùng cây mã đã có ảnh desktop/mobile; ảnh sau, reports và graph AST tách riêng. Không có codemap cũ trong repo để ghi đè; bản đồ ngắn ở đoạn trên là chỉ dẫn hiện hành. Có thể quay lại main bằng revert duy nhất commit port; không migration hoặc thay dữ liệu. Đổi `CAPTION_PIPELINE=single` chỉ giảm số lượt, không đổi provider. Cần cho phép riêng trước push/deploy/AI thật. Những mốc “một inference”, source và online phía dưới là lịch sử hoặc chỉ áp dụng chế độ `single`.

Kiểm port:60/60 test, typecheck/build,17nhóm browser/45layout và5nhóm auth giả đạt. Sáu cặp ảnh Home/Create/Login ở390/1440 trùng byte baseline main. Review độc lập sửa parser judge/polish thiếu dữ liệu và bỏ veto bằng heuristic; test riêng chứng minh số lượt, quota/error/timeout/abort/32KiB và không retry/fallback. Quét108file/16clientchunks không phát hiện credential hay server key/endpoint trong client. Prompt single đo bằng UTF8 bytes: mẫu3251 so baseline4958, max-fields4395 so6264; đây **không phải số token thực hoặc phần trăm tiết kiệm**. Deep writer/judge/polish có thêm chi phí input theo thiết kế nhiều lượt đã duyệt; thực tế latency/usage/quota/chất lượng tiếng Việt của DeepSeek chưa kiểm vì0inference thật.

**Port email login — 01/11/2026 (chỉ local, chưa push/deploy):** chọn riêng logic từ `feat/huy-email-password-auth` (`668f508`, merge-base `9feb91a`) vào UI main `920f8da`. Thêm `POST /auth/password` chỉ đăng nhập tài khoản đã có; không có đăng ký/reset mật khẩu. Form dùng layout/font/CSS main, giữ Google và khách; đăng xuất dùng route/cookie hiện tại. Endpoint nhận JSON `email/password/next`, kiểm Origin, body tối đa 4 KiB/5s, email ≤254 và password 1–128 ký tự; không trim mật khẩu. Supabase SSR xác minh `getUser` trước success, cookie HttpOnly/Lax/Secure trên HTTPS, lỗi tiếng Việt không lộ provider body. Session chỉ thêm cờ `emailEnabled`, giữ nghĩa Google của `loginEnabled`. Không đổi schema, dependency hoặc lịch sử localStorage.

Để dùng email login cần Supabase Email provider đã bật và tài khoản đã tồn tại/đủ điều kiện đăng nhập; không cần Google OAuth secret mới. `AUTH_EMAIL_ENABLED=false` tắt form và endpoint email độc lập, mặc định bật khi auth server được cấu hình. Cấu hình trong `prototype/.env.local` hoặc server tương ứng, không chép secrets vào Git/client. Nếu cần khôi phục sau triển khai tương lai, tắt cờ email và restart/redeploy có phép; Google/guest vẫn giữ. Không có migration hay dữ liệu mới cần hoàn tác. Kiểm local dùng `prototype/tests/password-preview-fixture.mjs` với opt-in `AUTH_TEST_FIXTURE=local-only`, đúng origin `http://127.0.0.1:3303`; fixture chặn network ngoài và không được import vào ứng dụng. Những kết quả Google/AI thật phía dưới là lịch sử, không chứng minh email login Production.

Kiểm chứng port: **52/52 test, typecheck và production build đạt**. Sáu nhóm browser mới kiểm email form/validation/loading, lỗi credential/provider, SSR login A/B, reload/cookie/logout, lỗi phiên giả, Google initiation/PKCE và hủy login khi rời trang. Năm nhóm auth regression và 17 nhóm chức năng chính/45 layout cases đạt; toàn bộ AI/session ngoài fixture được giả lập. Ảnh trước/sau trang chủ và tạo nội dung trùng byte ở 390/1440; màn hình login chỉ thêm điều khiển email trong bố cục main, không tràn ngang. Không kiểm email/password hoặc Google OAuth Production thật, email xác nhận, tài khoản BTC hay hết phiên thật; không tạo tài khoản/cloud mutation. Quota/rate-limit thực tế vẫn do Supabase quyết định, chưa stress test. Không lưu mật khẩu/token trong localStorage hoặc log.

**Tích hợp LD_UI — 30/10:** đã rà toàn nhánh ec22d80, giữ UI/ảnh/thông tin đội, sửa nạp env root và focus sau xác minh phiên; mô tả tốc độ/bảo mật/Meta được chỉnh về bằng chứng thực tế. 46test, typecheck/build,17nhóm browser và5nhóm auth giả đạt;0inference thật. Xem [LD_UI_REVIEW](LD_UI_REVIEW.md). Nhánh main là nguồn deploy thủ công trên caption-quang-cao; lượt review không deploy hoặc đổi cloud config. Các kết quả AI/Google thật ngày28/10 dưới đây là lịch sử.

**Đang chạy online:** [Mở Bàn biên tập](https://caption-quang-cao.vercel.app/). Google đăng nhập/đăng xuất đã kiểm thật với chủ dự án; AI AUTO đã tạo thật3/3/5 trong khoảng4,3s bằng gemini-3.1-flash-lite. Copy và lịch sử sau reload đạt. Source runtime main1261f83; tích hợp tiếp trực tiếp main. Chưa nghiệm thu chất lượng toàn bộ/tài khoản ngoài/quota tải BTC. Xem AI_AUTO_PROGRESS.md; các mục lỗi/chờ phía dưới là lịch sử lượt tích hợp.

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
