# Gemini trực tiếp và Groq dự phòng — 04/11/2026

## Trạng thái và quyết định

- Nền remote main đã đọc lại: `b3e03e68462f41794030e38ae8715a28923778cb`. Checkout local `a603877` có cùng tree; lịch sử khác SHA. Không reset, rebase, merge hoặc force push để đồng bộ.
- Người dùng yêu cầu giữ **ID gửi `gemini-3.5-flash`**, sau khi được thông báo Google đã deprecated ID này và tự route sang **`gemini-3.6-flash`**. Đây không phải lựa chọn một model 3.5 độc lập còn phục vụ. Code không tự thay ID sang 3.6, Lite hoặc auto.
- Groq đề xuất/chốt theo ủy quyền chọn model: **`openai/gpt-oss-120b`**, reasoning low, JSON Schema strict, không gửi reasoning trong response.
- Người dùng đã duyệt commit/push main, kích hoạt cấu hình và triển khai Production đúng project hiện có. Trạng thái thực tế, SHA và deployment được ghi trong hồ sơ release của workspace; không lấy tài liệu này làm bằng chứng deployment đã READY.
- **Dừng gọi AI thật còn hiệu lực: 0 request inference thật trong lượt này.** Không sử dụng lại các ngân sách kiểm thử cũ. Không bật billing/nạp credit/nâng gói.
- Đã chốt ngân sách: giữ đủ Deep và trả lỗi nếu cần request thứ năm. Không bỏ judge đảo thứ tự, không tăng trần, không retry/repair. Fallback không bảo đảm thành công.

## Hợp đồng và ranh giới thay đổi

Giữ POST `/api/generate`, bốn trường `productName`, `description`, `audience`, `tone`, chuẩn hóa/validator và response chỉ ba mảng 3 caption/3 headline/5 hashtag. Giữ bố cục UI/CSS, Supabase/Auth, localStorage, lịch sử, prompt và thuật toán chọn nội dung. Chỉ thêm nhãn lỗi tiếng Việt `AI_REQUEST_LIMIT` vào bảng lỗi client hiện có. Thêm cấu hình ở lớp provider; Create page chỉ dùng boolean cấu hình hợp lệ phía server.

- Primary HTTPS cố định: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`.
- Fallback HTTPS cố định: `https://api.groq.com/openai/v1/chat/completions`.
- Không có OpenRouter trong đường import/call đang hoạt động. `openrouter.ts` được giữ làm mã lịch sử, không có caller; test xác nhận cấu hình cũ bị từ chối trước fetch.
- Legacy DeepSeek/FreeLLMAPI vẫn là cấu hình thủ công; không nằm trong chuỗi fallback. Legacy Gemini 3.8 chỉ còn lựa chọn thủ công khi fallback tắt; alias auto/Lite bị từ chối, không GET catalog trong lần tạo.
- Key chỉ từ env server, không URL query/prompt/client/log. Không client override URL/model/key/provider/mode. Kiểm cả hai key trước khi nhận output, không đưa raw upstream body/stack vào response/log.
- Giữ Host/Origin/MIME, input 16 KiB, upstream response 32 KiB, UTF-8 fatal, timeout tổng 90 giây và hủy khi client hủy. Không thêm SDK/thư viện; dùng fetch nên không có retry ẩn từ SDK.
- Writer giới hạn 4.096 completion token; judge/reverse/polish 2.048. Reasoning low vẫn có thể tiêu thụ token; quota không chỉ đo số request.

## Chính sách chuyển provider

Một lần bấm Tạo có tối đa **4 inference attempt** cho Deep, tính cả HTTP lỗi và Groq. Giữ cap nhỏ hơn cho legacy smart (2), single (1). Bộ đếm tăng ngay trước fetch; kiểm trần trước tăng, không ghi nhận request thứ năm chưa gửi.

Chỉ chuyển từ Gemini sang Groq một lần cho HTTP **429, 500, 502, 503**, khi chưa bị hủy và còn ngân sách. Gửi lại đúng stage đang lỗi sang Groq; sau đó mọi stage còn lại dùng Groq, không chạy lại writer/pipeline, không quay về Gemini, không retry cùng provider, không gọi repair. HTTP 408/504, lỗi fetch, deadline và abort không tự chuyển vì có thể chưa biết upstream đã xử lý hay chưa. Auth/quyền, 400/422, refusal/content_filter, JSON/parser/schema lỗi đều dừng.

Deep mặc định lên lịch hai judge song song. Khi cấu hình fallback, host bật `sequentialJudges` tại engine để chờ cả parser/validator của lượt trước rồi mới bắt đầu lượt tiếp theo bằng provider hiện tại. Lỗi HTTP, JSON hoặc schema đều ngăn lượt chấm tiếp theo. Đánh đổi: tăng độ trễ so với hai judge song song, vẫn chung deadline 90 giây. Không đổi stage/rubric Deep.

Ví dụ đủ ngân sách: writer Gemini 429 → writer Groq → judge Groq → judge-reverse Groq, không có yêu cầu polish: 4 attempt, có thể trả đủ 3/3/5. Nếu judge yêu cầu polish sau một attempt lỗi, request thứ năm bị chặn và trả `AI_REQUEST_LIMIT`/502, giữ form/bản nháp; không trả kết quả chưa hoàn tất. Lỗi Groq dừng ngay.

Metadata: request status/duration/calls/mode; từng attempt có stage/provider/requestedModel/actualModel nếu có/upstreamStatus/durationMs/usage số nếu có; Retry-After nguyên có giới hạn. Usage ở cấp request là tổng các response đã đọc được, không khẳng định token của request lỗi bằng 0. Các heuristic diagnostics cũ được giữ cho adapter legacy; không log chúng trên đường Gemini/Groq mới. Không log prompt/input/output/raw errors.

## Cấu hình cần nhập sau khi duyệt

Project duy nhất: **caption-quang-cao**, team **dragons-projects-e23cb252**. Không thay Supabase, origin, Root Directory, UI hoặc tự bật Git deploy.

| Biến | Giá trị cần dùng | Trạng thái đã đọc qua metadata |
|---|---|---|
| AI_PROVIDER | gemini | Biến Config cần kích hoạt khi release |
| GEMINI_MODEL | gemini-3.5-flash | Biến Config cần kích hoạt khi release |
| GEMINI_API_KEY | Secret hiện có | Có, Secret/sensitive, Production; không đọc giá trị |
| GEMINI_FALLBACK | groq | Biến Config cần kích hoạt khi release |
| GROQ_MODEL | openai/gpt-oss-120b | Biến Config cần kích hoạt khi release |
| GROQ_API_KEY | Secret | Có, Secret/sensitive, Production ở lần kiểm cuối; không đọc giá trị |
| CAPTION_PIPELINE | deep | Đã có, không đổi |

Khóa Groq đã hiện diện; nếu thay thế, nhập trực tiếp trong Vercel → project trên → Settings → Environment Variables → `GROQ_API_KEY` → Secret → Production. Không gửi vào chat, không sao chép OAuth secret thành API key, không tải Secret về local. Các `.env.example` chỉ placeholder. Key chưa có không âm thầm chạy Gemini không dự phòng: cấu hình fallback thiếu key bị từ chối trước inference.

## Model, quota, dữ liệu và giới hạn kiểm chứng

Google vẫn có 3.6 Flash cho production, hỗ trợ structured output. Trang pricing công bố Free tier, nhưng quota/model permissions của **key Production hiện có chưa được kiểm catalog có xác thực**; Secret không đọc lại được và chưa gọi inference. Không coi key hiện diện là model chắc chắn chạy hoặc tài khoản chắc chắn Free. Nếu tài khoản đã bật billing từ trước, code không thể bảo đảm giá 0; phải kiểm tài khoản trước khi cho phép gọi thật.

Groq GPT-OSS 120B thuộc Production models, hỗ trợ đa ngôn ngữ và strict schema. Phù hợp để thử tiếng Việt là suy luận từ khả năng đa ngôn ngữ; **chưa chứng minh chất lượng quảng cáo tiếng Việt**. Free limits công bố: 30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD, áp dụng cấp tổ chức, có thể khác theo tài khoản. Không lấy Developer limits 1K RPM/250K TPM làm hạn mức Free. Prompt + pool/judges cùng reasoning dễ chạm TPM trước RPD. Quyền model, free plan và quota thực phải xem Groq Console qua Console với tài khoản sở hữu key; chưa thực hiện đăng nhập/tạo tài khoản/đổi gói.

Gemini Free có thể dùng dữ liệu cải thiện sản phẩm; Groq có trường hợp giữ dữ liệu tối đa 30 ngày cho reliability/abuse, ZDR tùy tài khoản. Chưa đổi privacy settings. Lượt thử tiếp theo nếu được duyệt chỉ dùng dữ liệu giả/công khai theo điều kiện đã chốt, không nhạy cảm.

Nguồn chính thức đọc 04/11/2026 (không inference):

- [Google 3.5 deprecated và tự route 3.6](https://aistudio.google.com/docs/models/gemini-3.5-flash), [deprecations](https://aistudio.google.com/docs/deprecations), [3.6 capabilities](https://aistudio.google.com/docs/models/gemini-3.6-flash), [REST compatibility](https://aistudio.google.com/docs/openai), [pricing](https://aistudio.google.com/docs/pricing).
- [Groq model catalog và endpoint](https://console.groq.com/docs/models), [GPT-OSS 120B](https://console.groq.com/docs/model/openai/gpt-oss-120b), [strict schema support](https://console.groq.com/docs/structured-outputs), [Free limits](https://console.groq.com/docs/rate-limits), [reasoning/include_reasoning](https://console.groq.com/docs/reasoning), [data handling](https://console.groq.com/docs/your-data).

## Release và rollback

Policy Deep và quyền triển khai đã chốt. Release theo thứ tự review/test → commit/push main → kích hoạt Config → deploy một lần đúng project → chờ READY và smoke GET-only. Kiểm quyền/quota tài khoản và output thật vẫn là cổng riêng trước lượt inference mới. Không migration dữ liệu, không đổi contract client. Nếu release mới lỗi, dừng gọi thật và phục hồi code/config đã ghi nhận theo một hành động được duyệt; không coi các release OpenRouter lỗi 429/400 trước đây là AI hoạt động tốt. Chỉ lưu tên/type/target env trong hồ sơ, không giá trị Secret. READY không chứng minh chất lượng hoặc quota.

## Kết quả kiểm local

- Baseline trước sửa: 65/65 test đạt. Hiện tại: **70/70 đạt**, gồm 11 nhóm test mới cho Gemini/Groq, giữ hồi quy contract/Auth/history. Các test router/alias cũ đã thay bằng kiểm từ chối cấu hình bị ngừng dùng, không giữ test giả định OpenRouter còn hoạt động.
- TDD: 6 nhóm đầu thất bại đúng vì Gemini 3.5/fallback chưa hỗ trợ, sau sửa đạt. Test schema judge phát hiện request thứ ba không cần thiết; sau đổi scheduling chờ parser, dừng đúng ở request thứ hai. Mutation bỏ 429 khỏi điều kiện fallback làm test thất bại, đã khôi phục source và chạy lại toàn bộ.
- Typecheck và production build bằng toàn bộ khóa giả: đạt. Không cài dependency; native npm 11 audit báo 0 vulnerability.
- Chrome riêng local, 390/1440px: 14 lượt mở trang, 6 asset, 7 nhóm kiểm đạt. Kiểm form/tông, loading, bộ 3/3/5 giả, 11 lần copy thật vào clipboard, tạo lại lỗi, lỗi ngân sách và xem lại lịch sử sau reload. **3 generate request trong trình duyệt đều bị intercept**, không inference. Guest/login chỉ cấu hình fixture; không gọi OAuth/tài khoản thật.
- Quét 78 file văn bản chuẩn bị và 13 client chunks: không phát hiện pattern credential hoặc key/endpoint server lộ trong client. `.env.example` là file env duy nhất tracked. Đây là kiểm có phạm vi, không phải chứng minh không thể có secret bằng mọi biểu diễn.
- Review diff: không đổi CSS/assets/dependencies/Auth/history/content validator; chỉ thêm nhãn lỗi client, boolean cấu hình Create và scheduling judge có điều kiện ở engine. Không thay prompt/ranking/rubric, không bỏ stage Deep. Adapter `openrouter.ts` còn lưu lịch sử nhưng không có caller trong app.
- Browser không thay thế kiểm transport thật: **output Gemini/Groq thật, tiếng Việt/dữ kiện, độ trễ thật, quota/quyền tài khoản, Google bên ngoài/BTC và hết phiên thật đều chưa kiểm trong lượt này**. Q1/Q3 vẫn mở.
- Bằng chứng riêng workspace ở `../evidence/gemini-groq-20261104/`; không đưa ảnh/log trình duyệt vào Git.
