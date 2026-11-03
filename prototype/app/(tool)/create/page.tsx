import type { Metadata } from 'next';
import CreateScreen from '../../../components/CreateScreen';
export const metadata: Metadata = { title: 'Tạo nội dung' };
export default function Create() {
  const cloud = ['preview', 'production'].includes(process.env.VERCEL_ENV || '');
  const hasAi = Boolean(process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY);
  return <CreateScreen aiUnavailable={cloud && !hasAi} />;
}
