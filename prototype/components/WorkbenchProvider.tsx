'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cleanInput, generationTimeoutMs, validOutput, validate } from '../lib/content';
import type { Entry, Input } from '../lib/content';
import { addHistory, deleteHistory, readHistory, storageMessage } from '../lib/history';
import { useAuth, IdentityNotice } from './AuthProvider';
import { historyScope } from '../lib/auth/core';

const blank: Input = { productName: '', description: '', audience: '', tone: '' };
const generationErrors: Record<string, string> = {
  INVALID_INPUT: 'Thông tin chưa hợp lệ. Kiểm tra đủ bốn trường, tông giọng và độ dài.',
  RATE_LIMITED: 'Dịch vụ đang giới hạn yêu cầu hoặc đang tạo một bộ khác. Hãy chờ rồi chủ động thử lại.',
  INVALID_AI_OUTPUT: 'AI trả nội dung sai cấu trúc hoặc vượt giới hạn xử lý. Bạn có thể chủ động thử lại.',
  UPSTREAM_ERROR: 'Gemini đang tạm quá tải hoặc chưa sẵn sàng. Hãy thử lại sau; bản nháp cũ vẫn được giữ.',
  AI_NOT_CONFIGURED: 'Kết nối AI chưa được cấu hình đúng. Kiểm tra cấu hình phía máy chủ.',
  AI_UNAVAILABLE: 'Chưa kết nối được dịch vụ AI. Kiểm tra kết nối phía máy chủ rồi thử lại.',
  AI_TIMEOUT: 'AI chưa phản hồi kịp. Bạn có thể chủ động thử lại.',
};
function focusRegion(id: string) {
  requestAnimationFrame(() => {
    const region = document.getElementById(id);
    region?.focus();
  });
}

function useWorkbenchState(scopeKey: string, auth: ReturnType<typeof useAuth>) {
  const [input, setInput] = useState<Input>(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof Input, string>>>({});
  const [current, setCurrent] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const resultFocus = useRef(false);

  useEffect(() => {
    // Auth refresh temporarily hides private DOM; focus after it has rendered again.
    if (auth.phase === 'ready' && current && resultFocus.current) {
      resultFocus.current = false;
      focusRegion('results-title');
    }
  }, [current, auth.phase]);

  useEffect(() => {
    if (auth.phase !== 'ready') return;
    try { setEntries(readHistory(localStorage, scopeKey)); setHistoryError(''); }
    catch (error) { setHistoryError(storageMessage(error)); }
    setReady(true);
    const update = (event: StorageEvent) => { if (event.key === scopeKey) { try { setEntries(readHistory(localStorage, scopeKey)); } catch (error) { setHistoryError(storageMessage(error)); } } };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [scopeKey, auth.phase]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { auth.markDirty(!!current || busy || Object.values(input).some(Boolean)); return () => auth.markDirty(false); }, [input, current, busy, auth.markDirty]);

  function onBlur(key: keyof Input) {
    const message = validate(input)[key];
    setErrors(previous => { const next = { ...previous }; if (message) next[key] = message; else delete next[key]; return next; });
  }

  async function generate() {
    if (inFlight.current || auth.phase !== 'ready') return;
    const lease = auth.fence.capture();
    setGenerateError('');
    const nextErrors = validate(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusRegion('form-errors'); return; }
    const snapshot = cleanInput(input), controller = new AbortController();
    pending.current = controller;
    inFlight.current = true; setBusy(true); setGenerateError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(generationTimeoutMs + 5000)]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Object.hasOwn(generationErrors, data?.error?.code) ? generationErrors[data.error.code] : 'Chưa tạo được nội dung. Hãy thử lại sau.');
      if (!validOutput(data)) throw new Error(generationErrors.INVALID_AI_OUTPUT);
      if (controller.signal.aborted) return;
      await auth.refresh();
      if (controller.signal.aborted || !auth.fence.current(lease)) return;
      const entry: Entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), input: snapshot, output: data };
      resultFocus.current = true;
      setCurrent(entry); setSaveError('');
      try {
        setEntries(addHistory(localStorage, entry, scopeKey)); setHistoryError('');
      } catch (error) {
        const message = storageMessage(error);
        setSaveError(message); setHistoryError(message);
      }
    } catch (error) {
      if (controller.signal.aborted || !auth.fence.current(lease)) return;
      const known = error instanceof Error && Object.values(generationErrors).includes(error.message);
      setGenerateError(`${known ? error.message : error instanceof DOMException && error.name === 'TimeoutError' ? generationErrors.AI_TIMEOUT : 'Chưa tạo được nội dung. Kiểm tra kết nối rồi thử lại.'} Form và bản nháp cũ được giữ nguyên.`);
      focusRegion('generate-error');
    } finally {
      if (pending.current === controller) {
        pending.current = null; inFlight.current = false; setBusy(false);
      }
    }
  }

  function remove(id: string) {
    if (auth.phase !== 'ready') return false;
    try {
      auth.fence.capture();
      setEntries(deleteHistory(localStorage, id, scopeKey)); setHistoryError(''); return true;
    } catch (error) { setHistoryError(storageMessage(error)); return false; }
  }

  return { input, setInput, errors, setErrors, current, entries, ready, historyError, saveError, generateError, busy, onBlur, generate, remove };
}

const WorkbenchContext = createContext<ReturnType<typeof useWorkbenchState> | null>(null);
function ScopedWorkbench({ children, scopeKey, auth }: { children: React.ReactNode; scopeKey: string; auth: ReturnType<typeof useAuth> }) {
  const state = useWorkbenchState(scopeKey, auth);
  return (
    <WorkbenchContext.Provider value={state}>
      {auth.phase === 'error' ? (
        <IdentityNotice />
      ) : (
        <div data-auth-private>{children}</div>
      )}
    </WorkbenchContext.Provider>
  );
}
export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <ScopedWorkbench key={auth.fence.revision} scopeKey={historyScope(auth.user?.id || null)} auth={auth}>{children}</ScopedWorkbench>;
}
export function useWorkbench() {
  const state = useContext(WorkbenchContext);
  if (!state) throw new Error('WorkbenchProvider is required for tool routes');
  return state;
}
