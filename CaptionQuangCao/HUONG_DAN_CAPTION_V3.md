# Hướng dẫn dùng toàn bộ agent caption (từ đầu đến cuối)

Mục tiêu: chạy web với chế độ `deep` (đủ 4 agent: Writer, 2 lượt Judge đảo thứ tự, Polisher), đo xem có hay hơn bản cũ không, rồi mới quyết định giữ.

Mọi lệnh dưới đây chạy trong **PowerShell**. Thư mục dự án của bạn có dạng lồng nhau:

```
D:\Downloads\vibecode\CaptionQuangCao                  ← thư mục NGOÀI
D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao  ← thư mục DỰ ÁN (có package.json và prototype). Gọi là <DỰ ÁN>.
D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao\prototype
```

## Bước 1. Cài bản nâng cấp

1. Tải `caption-upgrade-v3.zip` về `D:\Downloads`.
2. Giải nén vào thư mục NGOÀI (zip có sẵn lớp `CaptionQuangCao\` bên trong nên sẽ đè đúng vào <DỰ ÁN>):

```powershell
cd D:\Downloads\vibecode\CaptionQuangCao
Expand-Archive -Force D:\Downloads\caption-upgrade-v3.zip -DestinationPath .
```

3. Kiểm tra đã đè đúng chỗ, phải thấy file `HUONG_DAN_CAPTION_V3.md` nằm cạnh `package.json`:

```powershell
dir D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao
```

Nếu bạn thấy thêm một lớp `CaptionQuangCao\CaptionQuangCao\CaptionQuangCao` nghĩa là giải nén sai chỗ: xóa lớp thừa đó rồi làm lại đúng lệnh trên.

Lỗi `Cannot find module ...providers.ts` bạn gặp trước đó xảy ra vì thư mục của bạn thiếu `lib\server\providers.ts`; zip này đã gồm file đó.

## Bước 2. Cài thư viện (một lần)

```powershell
cd D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao
npm install
```

## Bước 3. Cấu hình khóa và bật `deep`

File cấu hình phải nằm ở **`prototype\.env.local`** (Next.js chỉ đọc file ở đây). Mở bằng Notepad:

```powershell
cd D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao\prototype
notepad .env.local
```

Nếu file đã có, giữ nguyên các dòng khóa cũ, chỉ thêm/sửa các dòng sau. Nếu chưa có, dán nguyên khối này rồi thay khóa thật:

```ini
AI_PROVIDER=gemini
GEMINI_API_KEY=khóa_gemini_của_bạn
GEMINI_MODEL=gemini-3.1-flash-lite

CAPTION_PIPELINE=deep
```

Khuyến nghị (tùy chọn): nếu bạn có thêm khóa DeepSeek, cho Judge chạy trên model khác Writer để bớt thiên vị:

```ini
DEEPSEEK_API_KEY=khóa_deepseek_của_bạn
DEEPSEEK_MODEL=deepseek-flash
CAPTION_JUDGE_PROVIDER=deepseek
```

Lưu ý:
- Không đặt `GEMINI_MODEL=auto` khi dùng `deep`: mỗi lượt sẽ tốn thêm một request tra danh mục model.
- Không dán khóa vào chat, ảnh chụp hay commit lên Git (`.gitignore` đã chặn `.env*`). Khóa đã từng nằm trong file zip gửi đi thì nên tạo khóa mới.
- Nếu dùng DeepSeek làm nhà cung cấp chính (`AI_PROVIDER=deepseek`) thì Gemini vẫn là phương án dự phòng cho đường 1 lượt như cũ.

## Bước 4. Kiểm tra môi trường

```powershell
cd D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao\prototype
npm run doctor
```

Kết quả mong muốn cuối cùng là `Kết quả: SẴN SÀNG` và dòng `CAPTION_PIPELINE=deep: dùng TẤT CẢ agent`. Cách đọc:
- `✘` là lỗi phải sửa (thiếu file, sai khóa/model). Doctor nói thiếu file nào thì làm lại Bước 1.
- `!` là lưu ý, không chặn chạy (ví dụ chưa đặt `CAPTION_JUDGE_PROVIDER`, kho ví dụ vàng đang trống).
- Doctor không in khóa và không gọi mạng.

## Bước 5. Đo trước khi tin (khuyến nghị)

```powershell
npm run compare -- single,deep 2
```

Lệnh này chạy 2 sản phẩm × 2 chế độ (khoảng 10 lần gọi AI), rồi ghi `prototype\scripts\compare-report.md`. Mở file đó và đọc caption của `single` và `deep` cạnh nhau. Điểm trong báo cáo chỉ là điểm theo quy tắc code; quyết định cuối cùng là bài nào bạn muốn đăng hơn.

Các biến thể:

| Lệnh | Ý nghĩa |
|---|---|
| `npm run compare -- single,smart,deep` | cả 3 chế độ trên 6 sản phẩm (~42 lần gọi, coi chừng quota) |
| `npm run compare -- smart 3` | chỉ `smart`, 3 sản phẩm |

Nếu gặp `429`/`RATE_LIMITED` giữa chừng thì đã chạm giới hạn free tier: chờ vài phút hoặc giảm số sản phẩm.

## Bước 6. Chạy web

```powershell
cd D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao
npm run dev
```

Mở http://127.0.0.1:3000, nhập 4 trường rồi bấm Tạo. Chế độ `deep` mất khoảng 15–40 giây (4 lần gọi, hai lần chấm chạy song song); giao diện cho phép tối đa 90 giây.

Xem pipeline có chạy không: trong cửa sổ PowerShell đang chạy `npm run dev` sẽ in một dòng log có trường `pipeline`:

```
pipeline: {
  mode: 'deep',
  stages: [ {stage:'write', ok:true, ms:...}, {stage:'judge', ok:true, ...}, {stage:'judge-reverse', ok:true, ...}, {stage:'polish', ok:true, ...} ],
  pool: { generated: 9, eligible: 8 },
  judged: true, judgeAgreement: 0.67, polished: [ true, false, false ],
  judgeProvider: 'deepseek', fallbackToSingle: false
}
```

Cách đọc nhanh:
- `fallbackToSingle: true` nghĩa là pipeline không ra kết quả dùng được và hệ thống đã quay về 1 lượt như cũ. Nhìn `stages`: stage nào `ok:false` thì bước đó lỗi.
- `write` lỗi: thường do Gemini từ chối schema hoặc hết quota. Xem `upstreamStatus` ở cùng dòng log (400 = từ chối định dạng, 429 = hết quota).
- `judge`/`judge-reverse` lỗi: bài vẫn ra, chỉ xếp hạng bằng điểm code (kém tinh hơn).
- `judgeAgreement` gần 1 nghĩa là hai thứ tự chấm cùng chọn một bài (đáng tin hơn); gần 0 nghĩa là các ứng viên ngang nhau, kết quả phụ thuộc điểm code.
- `polished: [true, false, false]` nghĩa là chỉ caption 1 được chỉnh câu; các caption khác giữ nguyên vì bản sửa không an toàn hoặc không tốt hơn.
- Log không chứa nội dung caption hay khóa.

## Bước 7. Thêm ví dụ vàng (tùy chọn nhưng đáng làm)

Mở `prototype\lib\engine\golden.ts`, thêm vài caption THẬT bạn đã đăng/hài lòng vào mảng:

```ts
export const goldenExamples: GoldenExample[] = [
  { tone: 'youthful', caption: 'Dán caption bạn thích vào đây', note: 'mở bằng khoảnh khắc ai cũng từng gặp' },
  { tone: 'formal', caption: '…' },
  { tone: 'any', caption: '…' },
];
```

- `tone`: `youthful` | `formal` | `humorous` | `any` (dùng cho mọi tông).
- Mỗi lượt Writer chỉ nhận tối đa 3 bài đúng tông, xoay vòng theo lần Tạo lại. 3–10 bài là đủ.
- Writer chỉ học nhịp/giọng, bị dặn không chép câu chữ hay dữ kiện. Không đưa vào bài có giá, ưu đãi, "bảo hành"… vì Writer có thể bắt chước; `npm run doctor` sẽ cảnh báo.
- Sửa xong lưu file; `npm run dev` tự nạp lại.

## Bước 8. Chạy test

```powershell
cd D:\Downloads\vibecode\CaptionQuangCao\CaptionQuangCao
npm test
```

Toàn bộ phải xanh (đã có `npm install` từ Bước 2 nên cả bộ test auth cũng chạy được).

## Bước 9. Khi muốn tiết kiệm quota hoặc tắt

| Muốn | Sửa trong `prototype\.env.local` |
|---|---|
| Rẻ hơn, vẫn có chọn lọc (2 lần gọi) | `CAPTION_PIPELINE=smart` |
| Về hành vi cũ (1 lần gọi) | `CAPTION_PIPELINE=single` hoặc xóa dòng đó |
| Tắt judge khác model | xóa dòng `CAPTION_JUDGE_PROVIDER` |

Sau khi sửa `.env.local` phải dừng `npm run dev` (Ctrl+C) rồi chạy lại.

## Bước 10. Đưa lên Vercel (khi đã hài lòng)

1. Vào Project → Settings → Environment Variables, thêm cùng các biến như `.env.local`: `AI_PROVIDER`, khóa, `GEMINI_MODEL`, `CAPTION_PIPELINE`, và `CAPTION_JUDGE_PROVIDER` nếu dùng.
2. Kiểm tra giới hạn thời gian chạy của function (Max Duration) trên gói của bạn: `deep` có thể cần đến 90 giây. Nếu gói bị giới hạn thấp hơn thì dùng `smart`.
3. Quota: mỗi người dùng bấm Tạo/Tạo lại tốn tới 4 request ở `deep`. Với nhiều người dùng cùng lúc hãy cân nhắc `smart`.
4. Deploy như quy trình cũ trong `DEPLOYMENT_TARGET.md` / `ONLINE_READINESS.md`.

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân và cách xử lý |
|---|---|
| `ERR_MODULE_NOT_FOUND ... providers.ts` | Thiếu file: làm lại Bước 1, rồi `npm run doctor` |
| Doctor: `Chưa cấu hình AI hợp lệ` | Sai tên model hoặc khóa có ký tự lạ. Gemini: `GEMINI_MODEL` phải là `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3.8-flash` hoặc `auto` |
| Log luôn `fallbackToSingle: true` | Xem `stages` và `upstreamStatus`; 400 nghĩa là Gemini từ chối schema agent: gửi mình dòng log đó, đừng bật cho người dùng cho đến khi xử lý |
| Báo `RATE_LIMITED` ngay lượt đầu | Đang có lượt khác chạy (mỗi lúc chỉ cho một lượt), hoặc hết quota |
| `compare` không đọc được khóa | Đặt `.env.local` vào `prototype\` rồi chạy lại; `doctor` cho biết file nào đã nạp |
| Caption `deep` không hay hơn `single` | Hãy giữ `single` hoặc `smart`: đó là kết quả đo hợp lệ. Thêm ví dụ vàng (Bước 7) rồi đo lại |
