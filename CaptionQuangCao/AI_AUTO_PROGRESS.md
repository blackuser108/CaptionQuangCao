# Gemini AUTO — 28/10/2026

## Kết quả cuối lượt — đã có AI thật online

Người dùng đã duyệt thêm đúng1Redeploy từ main1261f83 để kiểm bản trim cấu hình. Deployment **dpl_B4CW5RjiQRnPHieGSywnaYLEdSJY** READY/production; alias **https://caption-quang-cao.vercel.app/** trỏ đúng. Tổng2Redeploy, mỗi lần đều được duyệt riêng; không tạo project, không gọi create-alias, không deploy project cũ. Main nhận code trực tiếp; nhánh cũ giữ làm lịch sử, không tiếp tục sửa trên đó. Git autodeploy vẫn false; commit tài liệu cuối không Redeploy.

- Ngân sách AUTO đã dùng3/3 thao tác kiểm, không gọi thêm:1localformal thành công,2cloudhumorous lỗi cấu hình,3cloudyouthful thành công sau sửa trim. Ngân sách cũ4/4 là đợt riêng. Không retry hoặc thêm inference trong cùng thao tác.
- Log server cloud lượt3: **status200/upstream200**, **4331ms**, requestedModel=actualModel=**gemini-3.1-flash-lite**, usage prompt1113/completion254/total1494 theo Google. Không log input/output/key. Đã có bằng chứng model thực và output thật, không chỉ danh mục hoặc build.
- Trình duyệt render đúng3caption/3headline/5hashtag; copycaption1 đối chiếu clipboard đúng. Lịch sử guest có recordAI, reload rồi Xem lại đủ11nội dung copy. Không dùng fixture, không gọi Tạo lại khi hết ngân sách; nút Tạo lại enabled nhưng inference tạo lại chưa kiểm online.
- Chất lượng mẫu trẻ trung: tiếng Việt/hashtag có nghĩa, đúng sản phẩm, không bịa giá/ưu đãi/chứng thực/chính sách. Caption1=61,caption2=170,caption3=166ký tự; mở đầu61/40/48 và headline18/29/25. Caption3 dưới mục tiêu180; headline “gọn gàng” và các tính từ “nhỏ xinh/nổi bật/đơn giản” là phần thêm ngoài dữ kiện. Tông trẻ trung còn nhẹ. **Chưa nghiệm thu chất lượng dữ kiện hoàn toàn hoặc cả3tông**; không sửa JSON/AI bổ sung để che kết quả.
- Sửa trim chỉ chuẩn hóa whitespace ngoài biên của Gemini key; control character giữa khóa vẫn bị chặn. Có test đỏ→xanh,44/44test/typecheck/productionbuild đạt, source/client scan không phát hiện bí mật. Cloud từ lỗi cấu hình sang200 sau thay đổi này; không đọc Secret nên không mô tả ký tự cụ thể trong khóa cloud.
- Google login/callback/account/reload/logout thật đã đạt trên origincanonical ở deployment trước; logic auth không đổi. 14ca desktop/mobile+refresh đạt trên bảnUIcùng nguồn,0generate trong harness. Chưa kiểm tài khoản ngoài chủ/expiry/revocation thật/quota tải lớn. Q1/Q3 vẫn mở.

Khóa cũ đang được người dùng chủ động giữ trên Vercel. Agent không đọc/tải lại giá trị, không bật billing; cần chủ thay khóa từng lộ để giảm rủi ro. Vận hành khi máy tắt đã dùng hostedAPI, nhưng không hứa quota/free/lâu dài. Bằng chứng private trong workspace: auto-live-ledger.json, online-ai-rendered.txt, online-history-rendered.txt, online-ai-success.png và runtime metadata.

Các mục lỗi/chờ ở dưới là lịch sử trước lần Redeploy bổ sung.

## Kết quả online và chỉ dẫn mới nhất

Người dùng yêu cầu cập nhật trực tiếp **main**, không tách branch/PR khi ứng dụng chưa chạy. Chỉ dẫn này thay giới hạn nhánh ở ghi chép lịch sử bên dưới. Source60c23a3 đã deploy đúng một lần vào production hiện có, deployment dpl_FJXoNi2ocz3sb6f9w9AynKq83E2J READY; alias caption-quang-cao.vercel.app đã trỏ đúng. Git autodeploy vẫn false ở cả hai vercel.json; cập nhật main không tạo deploy thứ hai.

- Google online thật: chọn tài khoản đã được cấp quyền, callback vào /account, reload vẫn có nút đăng xuất; logout về /login?loggedOut=1. Không cần consent mới. Chưa kiểm người ngoài chủ/expiry thật.
- 14ca route×viewport390/1440+refresh đạt, Google enabled, không tràn ngang/pageerror, draft create↔history giữ đúng. Harness chặn generate,0lượt AI.
- Lượt kiểm AI2/3 qua form online tông humorous trả AI_NOT_CONFIGURED; chưa có kết quả, không trả mẫu. Năm Config origin/auth/provider/model đối chiếu đúng; GETsession loginEnabled=true và FAQ mới chứng minh bản mới đang phục vụ. Runtime MCP không có log generate; không suy ra quota/Google outage hoặc khóa mới/cũ là nguyên nhân. Secret cloud không đọc được/không đọc.
- Còn1lượt kiểm mới; chưa gửi. Đã tái hiện bằng mock: khóa server có CR/LF/khoảng trắng ngoài biên bị từ chối trước fetch. Bản sửa tiếp theo trim ngoài biên của riêng Gemini, vẫn từ chối control character nằm giữa. Đây là giả thuyết định dạng cần kiểm online, chưa phải root cause được xác nhận. TDD đỏ→xanh,44test đạt. Sửa này chưa có trong deployment60c23a3; cần được duyệt thêm1Redeploy nếu muốn áp dụng. Không tự deploy lần hai.

Khóa cũ đang có trên Vercel theo lựa chọn người dùng; agent không đổi/đọc/copy giá trị. Chất lượng dữ kiện của mẫu local chưa đạt hoàn toàn. Không gọi là AI online hoạt động.

Người dùng yêu cầu AI hoạt động với lựa chọn tự động thay model cố định; đồng thời duyệt đúng một Redeploy vào project `caption-quang-cao`, không merge main/project/alias mới/billing. Đã đối chiếu main3b400ea và giữ toàn bộ thay đổi của người dùng trong nhánh làm việc. Nhánh remote cũ đã bị xóa; dùng lại tên nhánh làm việc local chore/online-readiness, không sửa main.

## Cơ chế tối thiểu

`AI_PROVIDER=gemini`, `GEMINI_MODEL=auto` chỉ phía server. Một GET danh mục Google, chọn theo thứ tự hai stable model hỗ trợ structured output: gemini-3.1-flash-lite, gemini-3.5-flash-lite, chỉ khi có generateContent. Không đưa gemini-3.8-flash từng lỗi vào AUTO. Một inference duy nhất, reasoning low, cùng endpoint OpenAI-compatible, prompt/validator3-3-5. Không retry/fallback provider/sửa JSON/mẫu. Giới hạn thời gian90s bao gồm danh mục và inference; cap danh mục256KiB và nội dung32KiB. Danh mục không cung cấp quota hay bảo đảm inference.

## Bằng chứng trước deploy

- GET danh mục bằng key server hiện có trả200, cả hai candidate xuất hiện; không in giá trị khóa. Người dùng xác nhận Vercel đang dùng khóa cũ và yêu cầu tiếp tục; agent không tải khóa local lên Vercel hay đọc lại Secret cloud. Khóa từng lộ vẫn cần được chủ thay khi phù hợp.
- Ngân sách cũ4/4 giữ nguyên. Đợt AUTO mới giới hạn3 inference, ghi trước khi POST; đã dùng1/3 local, model thực gemini-3.1-flash-lite,200,2907ms, đúng3/3/5. Prompt1112/completion273/total1550 token theo metadata Google; không suy total bằng phép cộng vì có thinking tokens.
- Đọc chất lượng: headline/hashtag có nghĩa và liên quan, không bịa giá/ưu đãi. Tuy nhiên “hệ thống hóa kiến thức” suy diễn lợi ích chưa có; chưa nghiệm thu chất lượng dữ kiện hoàn toàn. Còn2lượt dành kiểm website, không tự gọi thêm sau429/thanh toán.
- TDD: ba ca AUTO đỏ trước sửa rồi xanh; toàn bộ43test đạt sau đưa thay đổi main mới vào nhánh. Typecheck đạt. Production build đạt; lần đầu Windows EPERM ở .next, chạy lại với quyền filesystem phù hợp thành công, không xóa/dừng ứng dụng khác.
- Seven envProduction đã lưu đúng project; Supabase12redirect gồm8cũ+4callback canonical mới, SiteURLlocal giữ nguyên. Google online/AI online sẽ kiểm sau một Redeploy được duyệt, chưa nhận local inference là chứng minh cloud.

## Nguồn chính thức đã kiểm

- [Models](https://ai.google.dev/gemini-api/docs/models): stable IDs, không có model auto.
- [Flash-Lite3.1](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) và [Flash-Lite3.5](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite): stable, structured output.
- [Models list](https://ai.google.dev/api/models): danh mục và supportedGenerationMethods.
- [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai): endpoint/bearer/JSONschema/reasoning low.
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing): có Free tier; quota thực theo tài khoản, không bật billing hoặc hứa miễn phí lâu dài.
- [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls): callback app phải khớp allowlist.

Chưa kiểm tài khoản ngoài chủ, expiry/revocation thật, vận hành lâu dài/quota tải BTC. Q1/Q3 vẫn mở.
