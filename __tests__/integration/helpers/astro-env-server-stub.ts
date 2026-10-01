import { requireEnv } from '@/integration/helpers/env';

export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_KEY = requireEnv('SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
