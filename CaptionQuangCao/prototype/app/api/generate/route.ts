import 'server-only';
import { createGenerateHandler } from '../../../lib/server/generate';

export const runtime = 'nodejs';
export const POST = createGenerateHandler();
