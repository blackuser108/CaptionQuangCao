# Gemini Developer API trực tiếp — 28/10/2026

## Phạm vi và kết luận

Người dùng đổi runtime ứng dụng sang Gemini, hoãn FreeLLMAPI/VPS; không đổi model Codex. Tích hợp server và các luồng giả đã kiểm. **Chưa nghiệm thu AI thật:** ngân sách4/4 đã dùng, không có output thành công để đánh giá tiếng Việt/dữ kiện. Lượt3 và4 ghi HTTP503 upstream. Không deploy, merge, push, bật billing, tunnel/cổng hoặc tự đổi provider/model. Q1/Q3 và chất lượng Bước4 vẫn mở.

Đọc AGENTS áp dụng, quyết định và tiến trình hiện hành, source/config/Git, Next environment-variables local. Các chat cùng workspace đang idle; checkout online-source ở nhánh chore/online-readiness, HEAD430d379. Chỉ đồng bộ các file sản phẩm/test đã đối chiếu với baseline sang prototype runtime; giữ nguyên env/auth/history và các bằng chứng cũ.

## Thay đổi

- Không dependency/framework/SDK mới. Dùng fetch/REST tại endpoint Google HTTPS cố định `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`; model duy nhất `gemini-3.8-flash`, reasoning_effort low. Đây là Gemini Developer API, không OpenAI inference hoặc router khác. Endpoint tương thích được chọn để dùng lại toàn bộ parser/validator; native đã được đối chiếu một lần và cũng503 nên không có bằng chứng cần thêm adapter thứ hai vào sản phẩm.
- Chỉ server nhận AI_PROVIDER/GEMINI_MODEL/GEMINI_API_KEY. Chọn gemini không có khóa/model đúng trả AI_NOT_CONFIGURED ngay dù cấu hình local còn tốt; không fallback. Không AI_PROVIDER giữ hành vi local cũ; AI_PROVIDER lạ từ chối. Quay lại thủ công bằng AI_PROVIDER=freellmapi, giữ URL31415/modelauto/khóa cũ rồi restart; không sao chép khóa.
- Gemini nhận JSON schema object đúng captions3/headlines3/hashtags5. Prompt v3 giữ nguyên. Server vẫn tự kiểm field/count/chuỗi/trùng/NFC/LF/giới hạn, không tin schema hoặc tự đánh giá của LLM. Request chỉ4trường,120/1000/300codepoint; guard Host/Origin loopback, MIME, request16KiB, timeout90s bao cảbody, response32KiB/UTF8, redirect error, no-store, lỗi Việt. Không retry/repair/HTML hoặc nội dung mẫu thay AI.
- Metadata chỉ status/upstreamStatus/durationMs/requestedModel/actualModel/usage theo allowlist. Bổ sung upstreamStatus sau khi lỗi đầu không đủ chẩn đoán; không body/error message/prompt/output/credential trong app log. UI chỉ bỏ nhãn AI local và trung tính hóa2thông báo lỗi; V2/Auth/localStorage5chức năng giữ nguyên.

## Model, quota và điều kiện

Tài liệu chính thức hiện model **gemini-3.8-flash ổn định**, hỗ trợ structured output và suy luận low/medium/high; minimal không hỗ trợ. Chọn low cho tác vụ bản nháp ngắn. Giá Standard có Free tier theo quota, không hứa miễn phí lâu dài; không bật billing. [Model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [REST compatibility](https://ai.google.dev/gemini-api/docs/openai), [JSON](https://ai.google.dev/gemini-api/docs/structured-output).

AI Studio đọc trực tiếp project **QuangCao**, Free tier, model Gemini3.8Flash:5RPM,250K inputTPM,20RPD; dữ liệu có thể trễ15phút, không bảo đảm capacity. Quota theo project, không theo từng khóa. Có quota hiển thị không chứng minh inference thành công hoặc phù hợp tải BTC. GET metadata model200, có generateContent; GET compatibility models với Bearer200; GET cùng URL với x-goog-api-key404. Những GET này không inference và không tính trong4lượt, không chứng minh quyền inference/billing. [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting), [API key](https://ai.google.dev/gemini-api/docs/api-key).

Người dùng đã xác nhận người thử≥18, demo công việc/kinh doanh tại Việt Nam, chỉ dữ liệu giả/công khai không nhạy cảm và chấp nhận Google có thể dùng input/output, có người kiểm duyệt đọc trên Free. Gemini cấm app hướng tới hoặc có khả năng được người dưới18 truy cập; cần xác minh audience và khu vực của BTC trước online, không coi xác nhận local là đủ để public. EEA/UK/Switzerland có điều kiện paid riêng; không bật paid để vượt điều kiện. [Terms](https://ai.google.dev/gemini-api/terms), [regions](https://ai.google.dev/gemini-api/docs/available-regions).

Khóa ban đầu được người dùng gửi vào chat; đã hướng dẫn thu hồi/thay và nhập trực tiếp, nhưng người dùng yêu cầu dùng tạm chính khóa đó và thay sau. Chỉ lưu trong prototype/.env.local ignored, không chép sang online-source, client/log/docs. **Phải thay trước online**; không tự thu hồi hoặc tạo credential. Google OAuth Client Secret vẫn chỉ ở Supabase, không dùng làm API key.

## Kiểm thử và ngân sách thật

TDD:2ca mới đỏ đúng do chưa hỗ trợ Gemini/không chặn cấu hình; sau thay đổi38/38 đạt. Bổ sung assert upstreamStatus đỏ trước, xanh sau. Kiểm input/provider injection, cấu hình sai/khóa thiếu/CRLF, HTTP400/401/402/403/404/429/500/503/302, network, JSON/count/duplicate/extra/refusal/truncation, byte cap và timeout, không retry/fallback/leak. Bộ cũ tiếp tục kiểm router và auth/history.

Build/typecheck checkout và runtime local đạt; lần build đầu bị EPERM xóa cache, cùng mã build được khi chạy với quyền phù hợp, không sửa config để né. Chrome context riêng16nhóm/35trang×viewport đạt: form/copy11mục/tạo lại/lịch sử/reload/xem/xóa/các lỗi/storage/clipboard/Unicode/mobile. Mọi generation regression bị interception, không inference. Auth đã kiểm thật ở lượt trước; không làm lại login.

Input thật đều dữ liệu giả: Sổ tay Mây A5;80trang giấy kẻ ngang,bìa xanh,dùng ghi chú công việc,35.000đ/cuốn; người đi làm≥18. Mỗi lượt đếm trước khi fetch. Không gọi AI để sửa JSON hoặc trả dữ liệu mẫu.

| Lượt | Luồng/tông | Kết quả | Thời gian | Model thực/usage | Cấu trúc/chất lượng |
|---|---|---|---|---|---|
|1|Form Chrome/humorous|app502 UPSTREAM_ERROR; HTTP upstream chưa được log lúc đó|14.024ms browser;12.672ms server|Không có|Không có output để đánh giá|
|2|Handler chẩn đoán/formal|Đã gửi; harness dùng sai Response.ok nên mất kết quả, vẫn tính ngân sách|Không đủ bằng chứng|Không có|Không được suy đoán thành công hoặc thất bại upstream|
|3|Handler chẩn đoán/formal|upstream503 → app502 UPSTREAM_ERROR|7.136ms toàn lượt;7.115ms handler|Không có|Không có output|
|4|Đối chiếu native/youthful, cùng model/prompt|native503 → app502 UPSTREAM_ERROR|26.454ms toàn lượt;26.424ms handler|Không có|Không có output|

**Đã dùng4/4, dừng.** Model gửi là gemini-3.8-flash; không có model thực/usage được upstream trả trong các kết quả đã ghi, không lấy requestedModel thay actualModel. Chưa kiểm được ba tông thành công hoặc tạo lại thật. JSON fake3/3/5 không phải chất lượng AI. Lỗi harness được sửa, self-test giả trước lượt3/4; không chạy lại âm thầm hoặc xóa ledger. Bằng chứng riêng tại evidence/gemini-direct-2026-10-28 (ignored), không xuất bản ảnh/log cá nhân.

## Trước deploy Vercel

1. Khắc phục/kiểm lại inference503 với ngân sách mới do người dùng giao, kiểm đủ ba tông/tạo lại, dữ kiện/tiếng Việt/độ dài và actualModel/usage/latency. Hiện chưa xác định nguyên nhân gốc503 là capacity hay điều kiện tài khoản; metadata200/quota hiển thị không loại trừ hạn chế inference. Không tự bật billing/thay model.
2. Thay khóa đã gửi vào chat; kiểm quota thực và tải BTC, kiểm điều kiện18+/khu vực/dữ liệu. Không dùng project Free cho audience không phù hợp.
3. Thêm origin HTTPS/Host allowlist có tests; không tắt guard. Rate limit/cost/token cap dùng chung cho nhiều instance; local inFlight chỉ bảo vệ một process.
4. Vercel:Next.js/RootDirectory prototype,Node24,pnpm locked,scripts/env server đúng, xác minh duration phù hợp90s+overhead và deployment protection. Hai gate Git deploymentEnabled=false vẫn giữ; chưa tạo deployment hoặc đổi config cloud.
5. Supabase thêm callback HTTPS cụ thể sau origin hợp lệ, giữ local; Google secret vẫn ở provider. Kiểm Google ngoài chủ/BTC và expiry/refresh/revocation thật. Guest giữ đủ5chức năng; localStorage không tự chuyển domain.

Nhánh đang chuẩn bị, chưa commit/push thay đổi Gemini; HEAD remote trước lượt430d379. Không merge/deploy. Lượt tiếp: **GPT-6.1 Sol · High · tốc độ tiêu chuẩn** để xử lý bằng chứng upstream và các guard online khi được giao. Runtime Gemini vẫn gemini-3.8-flash · low, chưa có độ trễ thành công để cam kết.

## Kiểm cuối

-38/38 tests, production build và pnpm typecheck exit0 sau thay đổi cuối. Build/typecheck riêng ở cả checkout và runtime đạt;4file implementation/test được đối chiếu hash khớp byte giữa hai bản. Auth source không đổi.
- Scan60file source (gồm file mới chưa tracked) và32client chunks: không phát hiện giá trị Gemini/FreeLLMAPI/publishable local đã biết, mẫu secret/OAuth code/đường dẫn-email cá nhân hoặc artifact cấm. Env ignored, staged trống, diff --check sạch, cả2gate autodeploy=false. Đây là kiểm theo mẫu/giá trị biết trước, không bảo đảm phát hiện mọi loại secret.
- Preview đã chạy lại chỉ127.0.0.1:3000; GET/create200, nhãn AI local đã bỏ, không tạo inference từ kiểm này. Không đổi cloud/provider/account/billing để né503.
- Lệnh dừng preview/build có một lần duyệt tự động hết thời gian, không kết luận nguy hiểm; thử lại tách bước thành công, không còn thao tác bị chặn. Không yêu cầu người dùng cấp thêm quyền.
