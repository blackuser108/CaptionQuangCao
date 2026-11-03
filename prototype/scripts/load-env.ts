import { existsSync } from 'node:fs';

/** Nạp .env.local ở thư mục hiện tại (prototype/) rồi đến thư mục cha. Biến đã có sẵn trong môi trường không bị ghi đè. Trả về các file đã nạp. */
export function loadEnv(): string[] {
  const loaded: string[] = [];
  for (const file of ['.env.local', '../.env.local']) {
    if (!existsSync(file)) continue;
    try { process.loadEnvFile(file); loaded.push(file); } catch { /* file hỏng: doctor sẽ báo thiếu khóa */ }
  }
  return loaded;
}
