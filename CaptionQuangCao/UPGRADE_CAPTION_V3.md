# Nâng cấp engine caption v3: pipeline nhiều agent

Giữ nguyên: form 4 trường, `/api/generate`, trả về 3 caption / 3 headline / 5 hashtag, lịch sử, auth, provider. Bản này gồm cả engine v2 (prompt/hook/CTA/chấm điểm) nên giải nén đè lên `CaptionQuangCao/` là đủ.

## Bật thế nào
Mặc định **không đổi hành vi** (`single`, 1 lần gọi AI). Bật bằng biến phía server:

| `CAPTION_PIPELINE` | Số lần gọi AI | Làm gì |
|---|---|---|
| `single` (mặc định) | 1 | như v2 |
| `smart` | 2 | Writer viết 9 ứng viên → code lọc → Judge chấm → chọn bộ 3 |
| `deep` | 4 | thêm lượt chấm thứ 2 đảo thứ tự (chạy song song với lượt 1) + Polisher chỉnh câu |

Hướng dẫn từng bước từ đầu đến cuối: xem `HUONG_DAN_CAPTION_V3.md`. Kiểm môi trường bằng `npm run doctor`. Trước khi bật trên Vercel: chạy `npm run compare` trong `prototype/` (dùng khóa trong `.env.local`), đọc `scripts/compare-report.md`, so `single` / `smart` / `deep` cạnh nhau.

## Luồng
```
brief (code, như v2)
  └─ WRITER (LLM #1)  plan ngắn → 3 ứng viên × 3 chiến lược, mỗi ứng viên có hook/CTA/góc/p; pool 6 headline + 8 hashtag
       └─ CỔNG SỰ THẬT (code)  loại thẳng claim bịa, placeholder, >2200 ký tự; chấm mềm hook/CTA/cảnh/sáo ngữ/emoji/độ dài
            └─ JUDGE (LLM #2)  rubric 5 chiều (stop, concrete, voice, natural, faithful), thứ tự ứng viên do code xáo
                 [deep] JUDGE đảo thứ tự (LLM #3), lấy trung bình
                 └─ CHỌN (code)  điểm = 45% code + 55% judge; judge nghi bịa → trừ nặng; chọn bộ 3 đủ khác nhau
                      └─ [deep] POLISH (LLM #4)  chỉ áp ghi chú sửa nhỏ; code chỉ nhận nếu qua cổng, không tệ hơn, vẫn là cùng bài
                           └─ lắp 3/3/5, chạy lại validOutput + scoreOutput như đường cũ
```
Bước nào lỗi (429, timeout, JSON hỏng) thì dùng kết quả tốt nhất đã có; nếu Writer không ra pool dùng được thì rơi về đúng đường 1 lượt của v2. Bước muộn bị bỏ khi đã quá 55% (judge) / 70% (polish) của 90 giây.

## Vì sao thiết kế thế này (research)
- **Các công cụ như Jasper/Copy.ai** không "viết hay hơn" nhờ model riêng: họ dùng khung (AIDA, PAS), brand voice từ ví dụ thật, và quy trình rồi mới tới người chỉnh. v2 đã có khung/giọng; v3 thêm phần còn thiếu là *chọn lọc*.
- **Sinh nhiều rồi chọn**: pipeline quảng cáo ở quy mô lớn dùng sinh nhiều biến thể, chỉnh bản tốt nhất rồi gộp, lọc, xếp hạng lại; Amazon (MarketingFM) thêm retrieval bám dữ liệu sản phẩm và critic LLM. Ở đây "bám dữ liệu" là `verifiedFacts` + cổng sự thật bằng code.
- **Đa dạng**: LLM đã căn chỉnh hay trả về cách viết "điển hình" (mode collapse). Verbalized Sampling (Zhang và cs., ICML 2026) hỏi một phân phối ứng viên kèm xác suất, tăng đa dạng 1,6–2,1 lần trong viết sáng tạo mà không training. Writer dùng đúng kỹ thuật này (trường `p`, ép ít nhất một ứng viên p < 0,25).
- **Judge có thiên kiến**: thiên về vị trí, độ dài, và văn của chính nó (Zheng và cs., MT-Bench). Nên: rubric tách chiều, dặn bỏ qua độ dài/thứ tự, code xáo thứ tự, `deep` chấm hai thứ tự, judge không thấy `p`/hook của Writer; và **không để judge quyết định chuyện bịa claim**: đó là việc của regex trong code.
- **Generator + critic** là phần đem lại lợi ích lớn nhất theo các bài thực chiến, nên `smart` dừng ở hai agent; Polisher chỉ ở `deep`.

## Chưa kiểm chứng (cần bạn thử)
- Mình không gọi được Gemini/DeepSeek từ môi trường này nên chất lượng câu chữ thật chưa đo. Test (77 ca, đều xanh; `auth-handlers` cần `node_modules` nên chạy ở máy bạn) dùng upstream giả.
- Trên Gemini, mỗi agent dùng `json_schema` strict riêng (`lib/engine/schemas.ts`), cùng cơ chế đường 1 lượt đã chạy; DeepSeek/FreeLLMAPI dùng `json_object`. Schema riêng của từng agent chưa được chạy thử với Gemini thật: nếu bị từ chối thì pipeline tự rơi về đường 1 lượt (log có `pipeline.fallbackToSingle: true`). Hãy xem log lượt đầu.
- Free tier Gemini: `smart` gấp đôi, `deep` gấp 3–4 lần số request mỗi lượt Tạo/Tạo lại.
- Trọng số 45/55 và ngưỡng giống nhau 0,5 là giá trị khởi đầu hợp lý, chưa hiệu chỉnh trên dữ liệu thật.

## Đã bổ sung ở v3.1
- Hai lượt chấm của `deep` chạy song song (không cộng thêm độ trễ).
- `CAPTION_JUDGE_PROVIDER`: Judge chạy trên nhà cung cấp khác Writer (bớt thiên vị văn của chính model).
- `lib/engine/golden.ts`: kho ví dụ vàng, tối đa 3 bài đúng tông được đưa vào Writer làm mẫu nhịp/giọng (cách "brand voice" của Jasper).
- `npm run doctor` kiểm môi trường; `npm run compare` đo so sánh.

## Chưa làm
1. Tự lưu caption người dùng chọn/sao chép từ giao diện vào kho ví dụ vàng (hiện thêm tay vào `golden.ts`).
2. Hiệu chỉnh trọng số 45/55 và ngưỡng giống nhau bằng dữ liệu thật.
