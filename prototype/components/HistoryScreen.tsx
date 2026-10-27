'use client';

import Link from 'next/link';
import History from './History';
import { useWorkbench } from './WorkbenchProvider';
import { useAuth } from './AuthProvider';

export default function HistoryScreen() {
  const auth = useAuth();
  const { entries, ready, historyError, busy, remove } = useWorkbench();
  return <div className="wrap history-page"><div className="page-intro"><div><p className="eyebrow">Lịch sử</p><h1>Quay lại một ý tưởng.</h1><p>Các bản nháp trong vùng hiện tại của trình duyệt này. Không tự nhập lịch sử khách hoặc đồng bộ thiết bị.</p></div><span className="workspace-badge">{auth.user ? 'Tài khoản' : 'Chế độ khách'} · Chỉ trình duyệt này</span></div>
    <div className="tool-links"><Link href="/create">← Tạo nội dung</Link><Link href="/history" aria-current="page">Lịch sử trên máy này</Link></div>
    <p className="busy-status small" role="status">{busy ? 'AI đang tạo nội dung. Yêu cầu vẫn tiếp tục khi bạn xem lịch sử; quay lại Tạo nội dung để xem bản nháp.' : ''}</p>
    <History entries={entries} ready={ready} error={historyError} onDelete={remove} />
  </div>;
}
