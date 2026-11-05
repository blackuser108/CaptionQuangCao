# Bàn biên tập — Next.js V2

Xem [README gốc repo](../README.md) cho lệnh cài/chạy/test và [ONLINE_READINESS](../ONLINE_READINESS.md) cho cấu hình online đang chờ.

App nằm ở thư mục này. `pnpm dev` và `pnpm start` chỉ bind 127.0.0.1. Auth dùng Supabase SSR. Xem README gốc cho cấu hình Groq chính và Cloudflare Workers AI dự phòng.

Lịch sử khách và tài khoản tách riêng trong localStorage cùng trình duyệt/origin, không đồng bộ hay mã hóa. Không commit env local, cookies, khóa, log hoặc ảnh tài khoản. Tài liệu nghiệm thu chi tiết/ảnh cá nhân được giữ ngoài bản source công khai.
