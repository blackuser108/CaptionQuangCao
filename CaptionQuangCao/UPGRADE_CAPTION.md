# Nâng cấp engine tạo caption (engine v2)

Chỉ đụng phần caption. Giữ nguyên: form 4 trường, API `/api/generate`, định dạng trả về 3 caption / 3 headline / 5 hashtag, lịch sử localStorage, auth, provider.

## Cách áp dụng
Giải nén đè lên thư mục `CaptionQuangCao/` (đường dẫn file giữ nguyên), rồi chạy:
`node --experimental-strip-types --test tests/*.test.ts` trong `prototype/` (71 test).

## Thay đổi chính
- **Prompt viết lại** (`lib/engine/prompt.ts`): từ danh sách "cấm" sang hướng dẫn nghề viết: dòng đầu là hook, người đọc trước sản phẩm, dịch đặc điểm thành điều làm được, nhịp đọc trên điện thoại, CTA đúng một hành động, tự rà trước khi trả JSON. Giữ cứng các rule không bịa giá/ưu đãi/chứng nhận/lời khách, chống prompt-injection.
- **Hook + CTA theo chiến lược** (`library.ts`, `context.ts`): 11 kiểu hook, 6 kiểu CTA, mỗi caption được giao hook/khung/CTA riêng, lọc theo tông giọng. Mỗi lần "Tạo lại", server truyền seed mới nên bộ hook/CTA đổi.
- **Ba khung viết**: caption 1 hook-lợi ích (70–150), caption 2 PAS (220–400), caption 3 cảnh–bẻ lái–sản phẩm–CTA (340–600). Dòng mở đầu ≤115.
- **Tông giọng có "giọng" thật**: mỗi tông có voice + devices (setup→twist cho hài hước, giọng tin nhắn bạn thân cho trẻ trung, câu cân đối không emoji cho trang trọng), giới hạn emoji.
- **featureAngles**: mỗi dữ kiện (khổ, số lượng, dung tích, chất liệu, vị…) kèm gợi ý "dịch thành điều người đọc làm được".
- **Few-shot mới** (16 ví dụ, sản phẩm khác hẳn đầu vào, có ghi dữ kiện gốc và lý do hay), ưu tiên đúng tông giọng.
- **Chấm điểm** (`quality.ts`): thêm hook yếu, thiếu CTA, tính từ rỗng, emoji quá mức, thiếu cảnh, nói sản phẩm trước người đọc; sửa lỗi bắt claim bịa bị bỏ sót khi viết hoa ("Chứng nhận…").
- **UI**: khung độ dài mới 70–150 / 220–400 / 340–600; cảnh báo riêng khi vượt giới hạn 2.200 ký tự của Instagram.

## Lưu ý
- `ENGINE_VERSION` = 2. Lịch sử cũ vẫn đọc bình thường.
- Chưa chạy được với Gemini thật trong môi trường này, nên chất lượng câu chữ thật cần bạn thử: mỗi tông × 2–3 sản phẩm.
- Muốn nâng thêm: `reasoning_effort` 'low' → 'medium' (providers.ts), hoặc cho Gemini chạy 1 lượt sửa khi `scoreOutput` không đạt (tốn thêm quota).
- File `.env.local` trong zip gốc có GEMINI_API_KEY: đừng gửi/commit file này, nên thay key.
