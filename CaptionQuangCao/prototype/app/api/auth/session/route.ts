import 'server-only';
import { createAuthHandlers } from '../../../../lib/auth/handlers';
export const dynamic = 'force-dynamic';
export const GET = createAuthHandlers().session;
