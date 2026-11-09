// Đo độ giàu dữ kiện của phần mô tả. Không phụ thuộc engine để form (client) và engine (server) dùng chung một định nghĩa "dữ kiện thật".

/** Tách mô tả thành các mệnh đề ngắn. Dòng chỉ có nhãn bỏ trống ("Kích thước:") không phải dữ kiện. */
export function splitFacts(text: string): string[] {
  return text.split(/[.;\n•]+/g).flatMap(part => part.split(/,(?=\s)/g)).map(part => part.trim())
    .filter(part => part.length >= 3 && part.length <= 180 && !/[:：]$/.test(part));
}

const puffery = /^(sản phẩm|món|mặt hàng|hàng)\b|\b(rất|cực|siêu|vô cùng|quá)\b|độc đáo|độc lạ|chất lượng|tuyệt vời|hoàn hảo|tiện lợi|phù hợp|\b(mới|đẹp|xịn|hot|lạ|tốt|hay)$/u;

/** Dữ kiện THẬT dùng được để viết: bỏ chính tên sản phẩm và các lời khen suông ("rất độc đáo", "sản phẩm mới", "phù hợp cho mọi nhà") vì chúng không cho người đọc thấy hay hình dung được gì. */
export function substantiveFacts(facts: string[], productName: string): string[] {
  const fold = (text: string) => text.normalize('NFC').toLocaleLowerCase('vi-VN').trim();
  const name = fold(productName);
  return facts.filter(fact => {
    const f = fold(fact);
    return f && f !== name && !(puffery.test(f) && !/\d/.test(f));
  });
}

export type DetailPrompt = { id: string; label: string; insert: string; example: string };
export type DetailCoach = { level: 'empty' | 'thin' | 'ok' | 'rich'; facts: number; message: string; prompts: DetailPrompt[] };

// Mỗi gợi ý ứng với một loại chi tiết giúp caption có hình ảnh để viết. `seen` nhận ra loại đó đã có trong mô tả chưa.
const kinds: (DetailPrompt & { seen: RegExp })[] = [
  { id: 'size', label: 'Kích thước, dung tích, số lượng', insert: 'Kích thước: ', example: 'Ví dụ: khổ A5, 600 ml, hộp 12 chiếc', seen: /\d+\s*(ml|l|g|kg|cm|mm|m|inch|trang|chiếc|cái|cây|hộp|gói|viên|phút|giờ|buổi|ngày|tháng|%)|\ba[3-6]\b|khổ|dung tích|kích thước/i },
  { id: 'look', label: 'Màu, chất liệu, mùi vị', insert: 'Màu sắc / chất liệu: ', example: 'Ví dụ: be, đen, xanh rêu; cotton; vị bơ sữa', seen: /màu|chất liệu|chất |vải|cotton|gỗ|da |nhựa|thủy tinh|gốm|kim loại|mùi|vị |hương|lụa|len|xanh|đỏ|vàng|trắng|đen|hồng|nâu|tím|xám/i },
  { id: 'use', label: 'Dùng khi nào, ở đâu', insert: 'Dùng khi: ', example: 'Ví dụ: đi học, họp sáng, buổi chiều ở văn phòng', seen: /dùng (khi|để|cho|trong)|khi |lúc |buổi|hằng ngày|mỗi (sáng|tối|ngày)|ở (nhà|lớp|văn phòng|quán|trường)/i },
  { id: 'difference', label: 'Một điểm khác biệt cụ thể', insert: 'Điểm khác biệt: ', example: 'Ví dụ: nắp tre, không dây, có ngăn kéo, vừa bàn tay', seen: /không (dây|cần|phải|rối|đường)|có (ngăn|nắp|nút|túi|khóa|quai|đệm)|nắp|ngăn|đệm|quai|khóa|gập|tháo|bluetooth|sạc/i },
  { id: 'offer', label: 'Giá hoặc ưu đãi (nếu có)', insert: 'Giá / ưu đãi: ', example: 'Ví dụ: đồng giá 148K thứ 5 hàng tuần; mua 2 tặng 1', seen: /\d[\d.,]*\s?(?:k|đ|nghìn|ngàn)(?![\p{L}])|đồng giá|giá|ưu đãi|khuyến mãi|tặng|miễn phí|giảm/iu },
  { id: 'where', label: 'Địa chỉ, hotline, giờ mở cửa (nếu có)', insert: 'Địa chỉ / hotline / giờ: ', example: 'Ví dụ: 12 Trần Phú; 0900 000 000; 9:00–21:00', seen: /địa chỉ|đường |phố |quận|phường|\d{1,2}[h:]\d{0,2}|thứ [2-7]|chủ nhật|\bt[2-7]\b|\bcn\b|lịch|giờ (mở|làm)/i },
];

export function detailCoach(productName: string, description: string): DetailCoach {
  const text = description.trim();
  if (!text) return { level: 'empty', facts: 0, message: 'Chưa có chi tiết nào. Càng nhiều chi tiết cụ thể, caption càng có hình ảnh để viết.', prompts: kinds.filter(kind => kind.id !== 'offer').slice(0, 4).map(({ seen: _seen, ...prompt }) => prompt) };
  const facts = substantiveFacts(splitFacts(text), productName).length;
  const missing = kinds.filter(kind => !kind.seen.test(text)).map(({ seen: _seen, ...prompt }) => prompt);
  if (facts < 2) return { level: 'thin', facts, message: 'Chi tiết còn mỏng: caption sẽ phải dựa vào cái tên và khoảnh khắc người đọc, dễ bị chung chung. Thêm 2–3 chi tiết cụ thể bên dưới.', prompts: missing.slice(0, 4) };
  if (facts < 4) return { level: 'ok', facts, message: 'Đủ để viết. Thêm một chi tiết nữa (màu, kích cỡ, dịp dùng) sẽ giúp ba caption khác nhau rõ hơn.', prompts: missing.slice(0, 2) };
  return { level: 'rich', facts, message: 'Chi tiết khá đầy đủ cho ba caption khác nhau.', prompts: [] };
}

export type Info = { prices: string[]; offers: string[]; schedule: string[]; addresses: string[]; contacts: string[]; terms: string[]; urgency: string[] };

const infoRules: [keyof Info, RegExp][] = [
  ['prices', /\d[\d.,]*\s?(?:k|đ|vnđ|nghìn|ngàn|triệu)(?![\p{L}])|đồng giá|giá (?:chỉ )?từ/iu],
  ['offers', /mua \d+ tặng \d+|ưu đãi|khuyến mãi|\bctkm\b|giảm \d+|miễn phí|(?<![\p{L}])tặng(?![\p{L}])|combo|voucher|đặc quyền/iu],
  ['schedule', /thứ (?:hai|ba|tư|năm|sáu|bảy|[2-7])|chủ nhật|\bt[2-7]\b|\bcn\b|hàng tuần|hằng tuần|mỗi (?:ngày|tuần|tháng)|giờ mở cửa|\d{1,2}[:h]\d{2}\s?[-–]\s?\d{1,2}[:h]\d{2}|từ \d{1,2}\/\d{1,2}/iu],
  ['addresses', /^\d+[a-z]?(?:\/\d+)*\s+\p{Lu}[^,]*,[^,]+|(?<![\p{L}])(?:hà nội|hồ chí minh|tp\.? ?hcm|đà nẵng|hải phòng|cần thơ|huế)(?![\p{L}])|địa chỉ|(?<![\p{L}])(?:cơ sở|chi nhánh)(?![\p{L}])|\bcs\d\b|\b\d+[a-z]?(?:\/\d+)?\s+(?:đường|phố|ngõ|ngách|hẻm)|(?<![\p{L}])(?:phường|quận|huyện|thành phố|tỉnh|tp\.)(?![\p{L}])/iu],
  ['contacts', /hotline|zalo|fanpage|(?<![\p{L}])(?:sđt|điện thoại|liên hệ)(?![\p{L}])|\b0\d{3}[\s.]?\d{3}[\s.]?\d{3}\b|\b0\d{2}[\s.]?\d{3}[\s.]?\d{4}\b|\b0\d{9,10}\b/iu],
  ['terms', /^(?:lưu ý|chú ý|điều kiện)|không áp dụng|áp dụng (?:vào|từ|cho|tại|đồng thời)/iu],
  ['urgency', /hết (?:mẻ|hàng|suất|slot|chỗ)|số lượng (?:có hạn|chưa nhiều|giới hạn)|chỉ còn|đến hết|trước ngày|(?<![\p{L}])slot(?![\p{L}])|giữ (?:hộp|lịch|chỗ|slot)/iu],
];

/** Thông tin thật của shop (giá, ưu đãi, lịch, địa chỉ, liên hệ, điều kiện, độ khan hiếm) theo từng dòng của mô tả, để caption chép đúng nguyên văn thay vì bịa hoặc bỏ sót. */
export function extractInfo(description: string): Info {
  const info: Info = { prices: [], offers: [], schedule: [], addresses: [], contacts: [], terms: [], urgency: [] };
  const lines = description.normalize('NFC').split(/\n+/).map(line => line.replace(/^[•\-–—*━─\s]+/, '').trim()).filter(line => line.length >= 3 && line.length <= 220 && !/^[-–—─━_=\s]+$/.test(line));
  for (const line of lines) for (const [key, pattern] of infoRules) if (pattern.test(line) && info[key].length < 6 && !info[key].includes(line)) info[key].push(line);
  return info;
}
export const hasInfo = (info: Info) => Object.values(info).some(list => list.length > 0);
