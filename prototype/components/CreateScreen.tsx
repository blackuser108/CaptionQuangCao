'use client';

import Link from 'next/link';
import ProductForm from './ProductForm';
import ContentSet from './ContentSet';
import { useWorkbench } from './WorkbenchProvider';
import { cleanInput, generationTimeoutMs, tones } from '../lib/content';
import { sampleInput } from '../lib/samples';
import { useAuth } from './AuthProvider';

export default function CreateScreen({ aiUnavailable = false }: { aiUnavailable?: boolean }) {
  const auth = useAuth();
  const { input, setInput, errors, setErrors, current, saveError, generateError, busy, onBlur, generate } = useWorkbench();
  const changed = current && JSON.stringify(cleanInput(input)) !== JSON.stringify(current.input);
  return (
    <div className="wrap tool-page">
      <nav className="skip-links" aria-label="Bỏ qua tới nội dung">
        <a href="#form-title">Đến form</a>
        <a href="#results-title">Đến kết quả</a>
      </nav>
      <div className="page-intro">
        <div>
          <p className="eyebrow">Không gian viết</p>
          <h1>Bàn biên tập của bạn.</h1>
          <p>Bốn thông tin để bắt đầu. Một bộ bản nháp để cân nhắc.</p>
        </div>
        <span className="workspace-badge">{auth.user ? 'Tài khoản' : 'Chế độ khách'} · Lưu trên trình duyệt</span>
      </div>
      <aside className="prototype-notice">
        <div>
          <strong>{aiUnavailable ? 'AI chưa sẵn sàng trên bản xem thử' : 'Tạo bản nháp bằng AI'}</strong>
          <p className="small">
            {aiUnavailable
              ? 'Bản xem thử chưa có khóa AI mới. Bạn vẫn xem được giao diện và lịch sử đã có trên trình duyệt; không có nội dung mẫu thay AI.'
              : 'Chỉ nhập dữ kiện có thể xác nhận. Đọc lại nội dung AI trước khi dùng.'}
          </p>
        </div>
        <button
          disabled={busy}
          type="button"
          onClick={() => {
            setInput({ ...sampleInput });
            setErrors({});
            document.getElementById('form-title')?.focus();
          }}
        >
          Dùng thông tin mẫu
        </button>
      </aside>
      <div className="tool-links">
        <Link href="/create" aria-current="page">
          Tạo nội dung
        </Link>
        <Link href="/history">Lịch sử trên máy này →</Link>
      </div>
      <p className="small muted draft-lifetime">
        Bản đang nhập được giữ giữa Tạo nội dung và Lịch sử. Đổi tài khoản, đăng xuất hoặc hết phiên sẽ bỏ bản đang nhập; hãy copy trước. Lịch sử chỉ lưu trên trình duyệt, không bảo mật hay đồng bộ thiết bị.
      </p>
      <div className="editor-grid">
        <ProductForm input={input} onChange={setInput} busy={busy} errors={errors} onBlur={onBlur} onSubmit={generate} />
        <section className="result-panel" aria-labelledby="results-title">
          <fieldset
            className="caption-tone-bar result-top-bar"
            id="tone"
            tabIndex={-1}
            aria-invalid={!!errors.tone}
            aria-describedby={errors.tone ? 'tone-error' : undefined}
          >
            <legend className="sr-only">Tông giọng và tạo nội dung</legend>
            <div className="caption-tone-left">
              <span className="caption-tone-label">
                Tông giọng <span aria-hidden="true">*</span>:
              </span>
              <div className="caption-tone-pills" role="radiogroup" aria-label="Chọn tông giọng">
                {(Object.entries(tones) as [keyof typeof tones, string][]).map(([val, label]) => (
                  <label
                    key={val}
                    className={`tone-pill-btn ${input.tone === val ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={val}
                      checked={input.tone === val}
                      disabled={busy}
                      aria-invalid={!!errors.tone}
                      onChange={() => setInput({ ...input, tone: val })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {errors.tone && (
                <p className="field-error" id="tone-error">
                  {errors.tone}
                </p>
              )}
            </div>
            <button
              type="button"
              className="button primary tone-generate-button"
              onClick={generate}
              disabled={busy}
            >
              {busy ? (
                <>
                  <img
                    src="/loading.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="btn-spinner"
                    aria-hidden="true"
                  />
                  <span>Đang tạo…</span>
                </>
              ) : current ? (
                <>
                  Tạo lại <span aria-hidden="true">↗</span>
                </>
              ) : (
                <>
                  Tạo nội dung <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
          </fieldset>

          <div className="section-heading result-heading">
            <div>
              <h2 id="results-title" tabIndex={-1}>
                Bản nháp nội dung
              </h2>
              <p className="muted small">Chọn một cách viết, copy và đọc lại trước khi dùng.</p>
            </div>
            <div className="actions">
              <a href="#form-title" className="text-link">
                Về form ↑
              </a>
            </div>
          </div>
          <div role="status" className="small busy-status">
            {busy
              ? `AI đang tạo${current ? ' bộ mới. Bạn vẫn có thể copy bản hiện tại.' : ' nội dung…'} Thời gian chờ tối đa khoảng ${generationTimeoutMs / 1000} giây. Yêu cầu tiếp tục khi xem Lịch sử; rời khu vực công cụ sẽ hủy yêu cầu.`
              : ''}
          </div>
          {generateError && (
            <p id="generate-error" className="notice error" tabIndex={-1} role="alert">
              {generateError}
            </p>
          )}
          {changed && (
            <p className="notice small">
              Form đã thay đổi. Bản đang hiển thị thuộc lần tạo trước. Tạo lại dùng thông tin đang có trong form.
            </p>
          )}
          <div aria-busy={busy}>
            {current ? (
              <>
                {busy && (
                  <div className="ai-regenerating-banner panel" role="status">
                    <img
                      src="/loading.svg"
                      alt=""
                      width={48}
                      height={48}
                      className="ai-loading-mini"
                      aria-hidden="true"
                    />
                    <div>
                      <strong>AI đang biên soạn bộ bản nháp mới…</strong>
                      <p className="small muted">
                        Bạn vẫn có thể copy và đọc bản hiện tại bên dưới trong khi chờ kết quả mới.
                      </p>
                    </div>
                  </div>
                )}
                <div className="sample-caption">
                  <span className="sample-label">BẢN NHÁP AI · {current.input.productName}</span>
                  <p className="small muted">Kiểm tra dữ kiện, tiếng Việt và hashtag trước khi dùng.</p>
                  <p className={`small ${saveError ? 'notice warning' : 'saved-status'}`} role="status">
                    {saveError || 'Đã lưu vào lịch sử trên máy này.'}
                  </p>
                </div>
                <ContentSet key={current.id} output={current.output} />
              </>
            ) : busy ? (
              <div className="empty-result panel ai-loading-card">
                <img
                  src="/loading.svg"
                  alt="AI đang viết bản nháp"
                  width={96}
                  height={96}
                  className="ai-loading-graphic"
                />
                <h3>AI đang viết bản nháp…</h3>
                <p className="muted">
                  Đang phân tích dữ kiện và chuẩn bị 3 caption, 3 headline và 5 hashtag. Bạn có thể tiếp tục khi có kết quả.
                </p>
                <div className="ai-loading-steps">
                  <span className="ai-loading-pill">✦ Chuẩn bị góc tiếp cận</span>
                  <span className="ai-loading-pill">✦ Áp dụng tông giọng</span>
                  <span className="ai-loading-pill">✦ Tinh chỉnh tiếng Việt</span>
                </div>
              </div>
            ) : (
              <div className="empty-result panel">
                <span className="empty-mark" aria-hidden="true">
                  “
                </span>
                <h3>{busy ? 'AI đang viết bản nháp…' : 'Từ thông tin sản phẩm,\nđến một bài viết.'}</h3>
                <p className="muted">
                  {busy ? 'Bạn có thể tiếp tục khi có kết quả hoặc thông báo lỗi.' : 'Chưa có bản nháp. Điền thông tin sản phẩm rồi chọn Tạo nội dung.'}
                </p>
                <div className="empty-structure">
                  <p>
                    <strong>3</strong> caption <span>Ba góc tiếp cận</span>
                  </p>
                  <p>
                    <strong>3</strong> headline <span>Tiêu đề gợi ý</span>
                  </p>
                  <p>
                    <strong>5</strong> hashtag <span>Copy từng nội dung</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
