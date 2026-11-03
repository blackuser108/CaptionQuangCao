'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Entry } from '../lib/content';
import { tones } from '../lib/content';
import ContentSet from './ContentSet';

export default function History({ entries, ready, error, onDelete }: {
  entries: Entry[]; ready: boolean; error: string; onDelete: (id: string) => boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  function remove(id: string) {
    const next = entries.find(entry => entry.id !== id);
    if (!onDelete(id)) { setFeedback('Chưa xóa được lịch sử. Mục này vẫn được giữ.'); return; }
    setConfirm(null); if (open === id) setOpen(null);
    setFeedback('Đã xóa một mục lịch sử.');
    requestAnimationFrame(() => document.getElementById(next ? `view-${next.id}` : 'history-title')?.focus());
  }
  return <section className="history-section" aria-labelledby="history-title">
    <div className="section-heading"><div><h2 id="history-title" tabIndex={-1}>Lịch sử trên máy này</h2><p className="muted small">Chỉ lưu trong trình duyệt này. Xóa dữ liệu trình duyệt có thể làm mất lịch sử.</p></div><Link className="text-link" href="/create#form-title">Về form →</Link></div>
    {error && <p className="notice warning" role="status">{error}</p>}
    <p className="small" role="status">{feedback}</p>
    {!ready ? <p>Đang đọc lịch sử trên máy này…</p> : entries.length === 0 ?
      <div className="history-empty panel"><strong>{error ? 'Lịch sử chưa khả dụng' : 'Chưa có lịch sử'}</strong><p className="muted">{error ? 'Bạn vẫn có thể tạo và copy nội dung trên trang.' : 'Các lần tạo lưu thành công sẽ xuất hiện ở đây.'}</p></div> :
      <ol className="history-list">{entries.map(entry => <li key={entry.id} className="history-entry panel">
        <div className="history-row"><div className="history-identity"><h3>{entry.input.productName}</h3><p className="muted small">{tones[entry.input.tone as keyof typeof tones]} · {new Date(entry.createdAt).toLocaleString('vi-VN')} · Bản nháp AI</p></div>
          <div className="actions"><button id={`view-${entry.id}`} aria-expanded={open === entry.id} aria-controls={`detail-${entry.id}`} onClick={() => setOpen(open === entry.id ? null : entry.id)}>{open === entry.id ? 'Thu gọn' : 'Xem lại'}</button>
            <button id={`delete-${entry.id}`} className="danger-button" onClick={() => { setConfirm(entry.id); requestAnimationFrame(() => document.getElementById(`cancel-${entry.id}`)?.focus()); }}>Xóa</button></div></div>
        {confirm === entry.id && <div className="delete-confirm notice"><p>Xóa lần tạo “{entry.input.productName}” lúc {new Date(entry.createdAt).toLocaleString('vi-VN')}? Thao tác này chỉ xóa mục lịch sử.</p><div className="actions"><button id={`cancel-${entry.id}`} onClick={() => { setConfirm(null); requestAnimationFrame(() => document.getElementById(`delete-${entry.id}`)?.focus()); }}>Hủy</button><button className="danger-button" onClick={() => remove(entry.id)}>Xóa mục này</button></div></div>}
        <div id={`detail-${entry.id}`} hidden={open !== entry.id} className="history-detail">
          {open === entry.id && <><p className="sample-label">Bản nháp AI đã lưu · Đọc lại trước khi dùng</p><dl className="snapshot">
            <dt>Tên sản phẩm</dt><dd>{entry.input.productName}</dd><dt>Mô tả ngắn</dt><dd>{entry.input.description}</dd><dt>Đối tượng khách hàng</dt><dd>{entry.input.audience}</dd><dt>Tông giọng</dt><dd>{tones[entry.input.tone as keyof typeof tones]}</dd>
          </dl><ContentSet output={entry.output} nested /></>}
        </div>
      </li>)}</ol>}
  </section>;
}
