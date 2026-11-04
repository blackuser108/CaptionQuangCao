# Bàn biên tập — Next.js V2

Xem [README gốc repo](../README.md) cho lệnh cài/chạy/test và [ONLINE_READINESS](../ONLINE_READINESS.md) cho cấu hình online đang chờ.

App nằm ở thư mục này. `pnpm dev`/`pnpm start` chỉ bind127.0.0.1. Auth dùng Supabase SSR. Source hỗ trợ Gemini trực tiếp (`gemini-3.5-flash`, Google tự route sang 3.6) và Groq trực tiếp (`openai/gpt-oss-120b`) dự phòng có giới hạn. Xem README gốc và `AI_PROVIDER_MIGRATION.md` về cấu hình, giới hạn và phần output thật chưa kiểm. Không tự bật autodeploy trong vercel.json.

Lịch sử khách và tài khoản tách riêng trong localStorage cùng trình duyệt/origin, không đồng bộ hay mã hóa. Không commit env local, cookies, khóa, log hoặc ảnh tài khoản. Tài liệu nghiệm thu chi tiết/ảnh cá nhân được giữ ngoài bản source công khai.
