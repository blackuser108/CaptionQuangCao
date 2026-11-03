import { validOutput, validate } from './content.ts';
import type { Entry, Input } from './content.ts';

export const HISTORY_KEY = 'ban-bien-tap:history:v1';
type Store = Pick<Storage, 'getItem' | 'setItem'>;

function validEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Entry, input = entry.input as Input;
  return typeof entry.id === 'string' && !!entry.id && typeof entry.createdAt === 'string' &&
    Number.isFinite(Date.parse(entry.createdAt)) &&
    !!input && Object.keys(input).length === 4 &&
    ['productName', 'description', 'audience', 'tone'].every(key => typeof input[key as keyof Input] === 'string') &&
    Object.keys(validate(input)).length === 0 && validOutput(entry.output);
}

export function readHistory(store: Store, key = HISTORY_KEY): Entry[] {
  const raw = store.getItem(key);
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.entries) || !data.entries.every(validEntry) ||
    new Set(data.entries.map((entry: Entry) => entry.id)).size !== data.entries.length) {
    throw new Error('CORRUPT_HISTORY');
  }
  return data.entries;
}

export function addHistory(store: Store, entry: Entry, key = HISTORY_KEY) {
  if (!validEntry(entry)) throw new Error('INVALID_ENTRY');
  const entries = [entry, ...readHistory(store, key).filter(item => item.id !== entry.id)];
  store.setItem(key, JSON.stringify({ version: 1, entries }));
  return entries;
}

export function deleteHistory(store: Store, id: string, key = HISTORY_KEY) {
  const entries = readHistory(store, key).filter(entry => entry.id !== id);
  store.setItem(key, JSON.stringify({ version: 1, entries }));
  return entries;
}

export function storageMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'Chưa lưu được lịch sử vì bộ nhớ trình duyệt đã đầy. Hãy copy bản nháp hoặc xóa từng mục cũ.';
  if (error instanceof DOMException && error.name === 'SecurityError') return 'Trình duyệt không cho lưu lịch sử. Hãy copy nội dung trước khi đóng trang.';
  return 'Không đọc hoặc ghi được lịch sử đã lưu. Dữ liệu cũ được giữ nguyên; bản nháp mới vẫn dùng được trên trang này.';
}
