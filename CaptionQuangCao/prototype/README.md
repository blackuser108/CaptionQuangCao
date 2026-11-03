# Bàn biên tập — Next.js V2

Xem [README gốc repo](../README.md) cho lệnh cài/chạy/test và [ONLINE_READINESS](../ONLINE_READINESS.md) cho cấu hình online đang chờ.

App nằm ở thư mục này. `pnpm dev`/`pnpm start` chỉ bind127.0.0.1. Auth dùng Supabase Google SSR; AI tạm dùng Gemini Developer API (`gemini-3.8-flash`, low) từ server qua HTTPS, chưa deploy app online. Cấu hình AI_PROVIDER/GEMINI_MODEL/GEMINI_API_KEY trong `.env.local` ngay tại đây; xem README gốc để quay lại FreeLLMAPI thủ công. Không tự bật autodeploy trong vercel.json.

Lịch sử khách và tài khoản tách riêng trong localStorage cùng trình duyệt/origin, không đồng bộ hay mã hóa. Không commit env local, cookies, khóa, log hoặc ảnh tài khoản. Tài liệu nghiệm thu chi tiết/ảnh cá nhân được giữ ngoài bản source công khai.
