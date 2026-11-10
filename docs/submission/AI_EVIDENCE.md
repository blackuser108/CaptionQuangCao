# Minh chứng AI · Bàn biên tập · Bảng A

**Đề 02 · Bản đối chiếu [`c8099ed`](https://github.com/blackuser108/CaptionQuangCao/commit/c8099ed0bec8425271586810b7334ad46cfac6a2)**

Đội dùng Codex để khóa yêu cầu, dựng giao diện, thiết kế phép thử và tích hợp AI thật. Bản nộp dùng Groq viết ứng viên, Cloudflare Workers AI chấm và dự phòng có giới hạn. Server kiểm cấu trúc 3 caption, 3 headline, 5 hashtag.

| Đã thử | Đã sửa và kết quả |
|---|---|
| A/B3 Single, hai brief H7/H8 | Giữ cùng model và cấu hình, thay prompt Writer. Cả 4 lượt HTTP 200 nhưng trượt dữ kiện, gồm đổi “đến” thành “trước” và thêm công dụng chống nước. Giữ cổng dữ kiện trong rubric, không chọn bản thắng. |
| Writer V3 đầy đủ, ca Sổ tay Mây | Groq trả 413, đầu ra dự phòng thiếu cấu trúc. Rút phần lặp và ví dụ trong payload. Lượt local kế tiếp Groq Writer và Cloudflare Judge cùng trả 200, trả đủ 3/3/5 trong khoảng 29,3 giây nhưng thêm chi tiết vừa túi áo và không lo rơi giấy. |
| Siết dữ kiện sau pilot | Thêm lọc claim vật lý/số liệu thiếu căn cứ và loại ứng viên bị Judge đánh dấu sai dữ kiện. Bộ kiểm kỹ thuật 142/142 đạt. Lượt local cuối có phản hồi Writer nhưng thiếu phản hồi Judge đã lưu, nên chất lượng đầu ra cuối chưa được xác nhận. |

Phép thử dùng brief giả. Đối chiếu nội bộ với báo cáo pilot A/B3 H7/H8, bản ghi `compact-live-notebook.json` và `grounded-verdict.json`. [Bảng kiểm thử](TEST_CASES.md) dẫn tới các test có thể chạy lại. [Phụ lục 5 đoạn prompt đã lược thông tin nhạy cảm](PROMPT_EXCERPTS.md) là phần đính kèm của trang này.
