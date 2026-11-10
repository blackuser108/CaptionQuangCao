# Năm đoạn prompt chọn lọc · Bàn biên tập

Phụ lục của [minh chứng AI](AI_EVIDENCE.md). Mỗi đoạn giữ phần yêu cầu đã dùng để ra quyết định. Ngày theo giờ Việt Nam. Tên chat và ngày để đội tìm lại bản gốc. Bản trích đã lược thông tin riêng, đường dẫn máy và dữ liệu xác thực.

### 1. Khóa phạm vi · Khóa yêu cầu Đề 2 Vibe Coding · 26/10/2026

> Thực hiện Bước 0 — Khóa yêu cầu của dự án Vibe Coding 2026, Đề 2: Trình tạo caption quảng cáo bằng AI. Lượt này chỉ khảo sát, xác minh và cập nhật tài liệu; kết thúc tại cửa hoàn thành bước 0.

**Dấu vết** · Chốt năm chức năng và phạm vi Feed tự nhiên. Nghiên cứu tiếp theo tách giới hạn kỹ thuật Meta khỏi mốc biên tập do đội chọn. [README](../../README.md).

### 2. Duyệt hướng UI · Frontend · 26/10/2026

> Tôi duyệt hướng thiết kế “Bàn biên tập” […] để dựng giao diện mẫu chạy local. Đây là duyệt hướng để xem và thử, chưa phải duyệt giao diện cuối cùng.

**Dấu vết** · Làm mẫu local trước, rồi hoàn thiện bố cục và hình ảnh ở các lượt sau. UI của bản nộp giữ form, kết quả và lịch sử thành các bước kiểm tra rõ. [Trang tạo nội dung](https://caption-quang-cao.vercel.app/create).

### 3. Đối chứng prompt Writer · Phân tích caption quảng cáo · 07/11/2026

> Ok chạy pilot A/B3 Single trên H7/H8, mỗi bản một lần, tối đa 4 request thật tính cả lỗi. Giãn ít nhất 45 giây, dừng ở 429 đầu tiên, không retry. Chấm theo rubric […]

**Dấu vết** · Chạy đủ bốn lượt trên cùng model. Không có cặp nào vượt cổng dữ kiện để chọn phiên bản thắng. [Minh chứng AI](AI_EVIDENCE.md).

### 4. Chuyển backend và giữ provider · Soạn prompt · 09/11/2026

> chuyển backend và dùng Groq Cloudflare thay đi

**Dấu vết** · Tích hợp V3 Smart từ source tham chiếu, dùng Groq cho Writer và Cloudflare cho Judge cùng vai trò dự phòng. Kiểm lại cấu trúc và điều kiện chuyển provider. [Bản source phát hành](https://github.com/blackuser108/CaptionQuangCao/commit/c8099ed0bec8425271586810b7334ad46cfac6a2) · [Ca A06](TEST_CASES.md).

### 5. Ưu tiên bản nộp đúng hạn · Soạn prompt · 10/11/2026

> cứ public trước để nộp r sửa sau

**Dấu vết** · Bản công khai đã lên. Hồ sơ giữ rõ lỗi dữ kiện đã thấy ở pilot và phần kiểm thao tác còn thiếu. [Minh chứng AI](AI_EVIDENCE.md) · [Bảng kiểm thử](TEST_CASES.md).

### Phạm vi rà lịch sử

Đã đọc đến trang cuối của 7 chat thuộc Project Codex `VIBECODING_FPL`. Danh sách chat đã lưu trữ theo Project không có mục. Nguồn lịch sử ChatGPT không trả chat nào cho Project trùng tên trong lượt này.

| Chat | Lượt đọc | Dấu mốc được giữ trong hồ sơ |
|---|---:|---|
| Tạo file rule, đề và plan | 10 | Chốt đề và tổ chức các mốc có kiểm chứng. |
| Khóa yêu cầu Đề 2 Vibe Coding | 14 | Yêu cầu BTC, ngưỡng biên tập, ranh giới lưu khóa. |
| Frontend | 9 | Duyệt hướng Bàn biên tập, duyệt mẫu trước khi nối AI. |
| Backend | 69 | Thử AI local, giữ hợp đồng đầu ra, tích hợp đăng nhập và định tuyến provider. |
| Giảm độ phức tạp repo | 4 | Xác định đúng cây source và ranh giới thay đổi trước khi đề xuất sửa. |
| Phân tích caption quảng cáo | 18 | Đối chứng A/B, giới hạn lượt gọi, giữ cổng kiểm dữ kiện. |
| Soạn prompt | 175 | Điều phối chuyển V3, ghi nhận điều kiện phát hành, chuẩn bị demo và hồ sơ. |
