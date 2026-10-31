'use client';

import { useState } from 'react';
import { captionLabels, captionWarning, count, openingCount, targets } from '../lib/content';
import type { Output } from '../lib/content';

function CopyButton({
  text,
  label,
  simulateFailure,
  isHashtag,
}: {
  text: string;
  label: string;
  simulateFailure: boolean;
  isHashtag?: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  async function copy() {
    try {
      if (simulateFailure) throw new Error('SIMULATED_COPY_FAILURE');
      await navigator.clipboard.writeText(text);
      setFeedback(`Đã copy ${label}.`);
    } catch {
      setFeedback(
        `${simulateFailure ? 'Mô phỏng: ' : ''}Không thể copy tự động. Hãy chọn nội dung rồi sao chép bằng menu của thiết bị.`
      );
    }
  }

  if (isHashtag) {
    return (
      <div className="hashtag-item-wrap">
        <button
          type="button"
          className="copy-button hashtag-pill"
          onClick={copy}
          aria-label={`Copy ${label}`}
          title={`Bấm để copy ${text}`}
        >
          <span className="hashtag-text">{text}</span>
          <svg
            aria-hidden="true"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <span className="copy-feedback sr-only" role="status">
          {feedback}
        </span>
      </div>
    );
  }

  return (
    <div className="copy-control">
      <button type="button" className="copy-button" onClick={copy} aria-label={`Copy ${label}`}>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
        </svg>
        Copy <span className="mobile-copy-label">{label}</span>
      </button>
      <p className="copy-feedback small" role="status">
        {feedback}
      </p>
    </div>
  );
}

export default function ContentSet({
  output,
  simulateCopyFailure = false,
  nested = false,
}: {
  output: Output;
  simulateCopyFailure?: boolean;
  nested?: boolean;
}) {
  const Group = nested ? 'h4' : 'h3',
    Item = nested ? 'h5' : 'h4';
  return (
    <div className="content-set">
      <section className="caption-group">
        <Group className="group-title">
          Caption <span className="muted small">3 góc viết</span>
        </Group>
        {output.captions.map((text, i) => (
          <article className="caption-card" key={text}>
            <div className="caption-heading">
              <Item>{captionLabels[i]}</Item>
              <span className="content-index" aria-label={`Caption ${i + 1}`}>
                {i + 1}/3
              </span>
            </div>
            <p className="draft-text">{text}</p>
            <div className="content-footer">
              <div className="counts small">
                <p>
                  {count(text)} ký tự{' '}
                  <span className="muted">· Mục tiêu {targets[i].join('–')}</span>
                </p>
                <p className="muted">
                  Dòng mở đầu: {openingCount(text)} ký tự <span>· Mục tiêu ≤115</span>
                </p>
                {captionWarning(text, i) && <p className="warning">{captionWarning(text, i)}</p>}
                {openingCount(text) > 115 && (
                  <p className="warning">Dòng mở đầu dài hơn mục tiêu 115 ký tự.</p>
                )}
              </div>
              <CopyButton
                text={text}
                label={`caption ${i + 1}`}
                simulateFailure={simulateCopyFailure}
              />
            </div>
          </article>
        ))}
      </section>
      <section className="headline-group">
        <Group className="group-title">
          Headline <span className="muted small">3 tiêu đề gợi ý</span>
        </Group>
        <p className="muted small group-hint">
          Tiêu đề gợi ý để copy; không phải trường riêng của bài Feed tự nhiên.
        </p>
        <ol className="headline-list">
          {output.headlines.map((text, i) => (
            <li key={text}>
              <div>
                <p className="draft-text">{text}</p>
                <p className="small muted">{count(text)} ký tự · Mục tiêu ≤40</p>
                {count(text) > 40 && (
                  <p className="small warning">Headline dài hơn mục tiêu 40 ký tự.</p>
                )}
              </div>
              <CopyButton
                text={text}
                label={`headline ${i + 1}`}
                simulateFailure={simulateCopyFailure}
              />
            </li>
          ))}
        </ol>
      </section>
      <section className="hashtag-group">
        <Group className="group-title">
          Hashtag <span className="muted small">5 gợi ý</span>
        </Group>
        <ul className="hashtag-list">
          {output.hashtags.map((text, i) => (
            <li key={text}>
              <CopyButton
                text={text}
                label={`hashtag ${i + 1}`}
                simulateFailure={simulateCopyFailure}
                isHashtag
              />
            </li>
          ))}
        </ul>
      </section>
      <aside className="editorial-note small">
        <strong>Mốc độ dài để tham khảo</strong>
        <p>
          Các mốc là khuyến nghị biên tập của sản phẩm cho Feed Facebook/Instagram, không phải giới
          hạn Meta và không dự đoán vị trí “Xem thêm”.
        </p>
        <p>
          Đếm code point sau chuẩn hóa NFC và xuống dòng LF. Một emoji ghép có thể tính nhiều ký tự.
        </p>
      </aside>
    </div>
  );
}
