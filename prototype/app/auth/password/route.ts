import 'server-only';
import { createAuthHandlers } from '../../../lib/auth/handlers';
export const POST = createAuthHandlers().password;
