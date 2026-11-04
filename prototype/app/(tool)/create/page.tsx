import type { Metadata } from 'next';
import CreateScreen from '../../../components/CreateScreen';
import { deepseekConfig } from '../../../lib/server/deepseek';
import { openrouterConfig } from '../../../lib/server/openrouter';
export const metadata: Metadata = { title: 'Tạo nội dung' };
export default function Create() {
  const keyPresent = process.env.AI_PROVIDER === 'openrouter' ? !!openrouterConfig(process.env) : process.env.AI_PROVIDER === 'deepseek' ? !!deepseekConfig(process.env) : !!process.env.GEMINI_API_KEY;
  return <CreateScreen aiUnavailable={['preview', 'production'].includes(process.env.VERCEL_ENV || '') && !keyPresent} />;
}
