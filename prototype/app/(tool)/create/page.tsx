import type { Metadata } from 'next';
import CreateScreen from '../../../components/CreateScreen';
export const metadata: Metadata = { title: 'Tạo nội dung' };
export default function Create() { return <CreateScreen aiUnavailable={process.env.VERCEL_ENV === 'preview' && !process.env.GEMINI_API_KEY} />; }
