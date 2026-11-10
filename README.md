# Đề 02 · Bàn biên tập (CaptionQuangCao)

**VIBE-CODING 2026 · Bảng A — Công nghệ**

- **Demo** · [Mở Bàn biên tập](https://caption-quang-cao.vercel.app/) · [Tạo nội dung](https://caption-quang-cao.vercel.app/create)
- **Phiên bản đối chiếu bản nộp** · [`c8099ed` trên GitHub](https://github.com/blackuser108/CaptionQuangCao/commit/c8099ed0bec8425271586810b7334ad46cfac6a2)
- **Hồ sơ** · [Bảng kiểm thử Bảng A](docs/submission/TEST_CASES.md) · [Minh chứng AI](docs/submission/AI_EVIDENCE.md) · [Checklist nộp](docs/submission/CHECKLIST.md)

Bàn biên tập giúp chủ shop và marketer viết bản nháp tiếng Việt cho bài đăng bán hàng trên Facebook và Instagram.

## Năm tính năng theo đề

1. **Nhập brief** gồm tên sản phẩm, mô tả ngắn, đối tượng và một trong ba tông giọng hài hước, trang trọng, trẻ trung.
2. **Tạo bằng AI thật** và kiểm cấu trúc đầu ra gồm đúng 3 caption, 3 headline và 5 hashtag.
3. **Sao chép từng mục** hoặc chọn **Tạo lại** để yêu cầu bộ mới theo thông tin đang có trong form.
4. **Xem và xóa từng lần tạo** trong lịch sử `localStorage` trên trình duyệt đang dùng.
5. **Đếm ký tự từng caption** theo Unicode code point sau khi chuẩn hóa NFC và xuống dòng. App nhắc khi vượt khoảng mục tiêu của từng caption và hiện “Caption hơi dài” khi vượt 280 ký tự. Mốc 280 là quy tắc biên tập của đội theo hướng dẫn Đề 02. Nội dung vượt mốc vẫn sao chép được.

## Chạy source

Ứng dụng nằm trong `prototype/`, dùng Next.js 16, React 19 và TypeScript. Next.js chạy giao diện và API phía máy chủ. Supabase Auth phục vụ đăng nhập tùy chọn. Có thể tạo nội dung ở chế độ khách khi AI đã được cấu hình. Demo chạy trên Vercel.

Cài **Node.js 24** và **npm 11**. Chạy từ thư mục chứa `package.json` và `package-lock.json` của repo:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Chỉ chạy lệnh sao chép khi chưa có `.env.local`. Mở `http://127.0.0.1:3000/create`. Điền cấu hình AI dưới đây và khởi động lại server để thử tạo nội dung. Muốn chạy bản build, dừng dev rồi dùng `npm run build` và `npm run start`. Chạy `npm test` và `npm run typecheck` để kiểm tra source. Bộ kiểm thử dùng dữ liệu giả lập cho các lời gọi nhà cung cấp.

## Cấu hình và AI của bản nộp

Dùng [`.env.example`](.env.example) ở gốc repo. Các script `dev` và `start` ở gốc đọc cấu hình server tại đây. Giữ các thiết lập dưới đây và thay giá trị mẫu của ba biến credentials bằng thông tin của người chạy.

| Biến | Giá trị hoặc vai trò |
|---|---|
| `AI_PROVIDER`, `CAPTION_PIPELINE`, `CAPTION_JUDGE_PROVIDER` | `groq`, `smart`, `cloudflare` |
| `GROQ_MODEL`, `GROQ_API_KEY` | `openai/gpt-oss-120b` và khóa Groq |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Account ID và token có quyền Workers AI. Model mặc định là `@cf/qwen/qwen3-30b-a3b-fp8` |

Trong Smart, **Groq viết ứng viên**, **Cloudflare Workers AI chấm** để chọn kết quả. Cloudflare cũng có thể thay Groq ở bước viết khi gặp lỗi upstream đủ điều kiện và còn lượt. Luồng chính dùng hai yêu cầu AI, tối đa ba nếu chuyển dự phòng. Việc đưa khóa và token vào cấu hình server là cần thiết để chạy luồng thật. Giữ giá trị thật trong `.env.local` đã được Git bỏ qua.

## Giới hạn đã biết

- AI tạo bản nháp. Hãy đối chiếu công dụng, giá, ưu đãi và cam kết với brief. Pilot local đã bắt gặp lỗi tự thêm dữ kiện dù bộ kết quả đúng cấu trúc.
- Độ trễ và khả năng tạo phụ thuộc hạn mức provider. Lịch sử chỉ có trên trình duyệt và địa chỉ web đang dùng. Xóa dữ liệu trình duyệt có thể làm mất lịch sử.
- Mốc biên tập do đội công bố. Giới hạn kỹ thuật của trình soạn bài tự nhiên trên Facebook/Instagram chưa được xác minh.

Nguồn · [Đề 02 chính thức](https://vibecoding.info.vn/de-bai#de-2) · [Tiêu chí Bảng A](https://vibecoding.info.vn/tieu-chi-cham-thi) · [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs) · [Workers AI REST API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
