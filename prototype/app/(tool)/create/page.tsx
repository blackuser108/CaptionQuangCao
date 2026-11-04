import type { Metadata } from 'next';
import CreateScreen from '../../../components/CreateScreen';
import { deepseekConfig } from '../../../lib/server/deepseek';
import { geminiConfig } from '../../../lib/server/gemini';
export const metadata: Metadata = { title: 'Tạo nội dung' };
export default function Create() {
  const keyPresent = process.env.AI_PROVIDER === 'deepseek' ? !!deepseekConfig(process.env) : process.env.AI_PROVIDER === 'gemini' ? !!geminiConfig(process.env) : false;
  return <CreateScreen aiUnavailable={['preview', 'production'].includes(process.env.VERCEL_ENV || '') && !keyPresent} />;
}
