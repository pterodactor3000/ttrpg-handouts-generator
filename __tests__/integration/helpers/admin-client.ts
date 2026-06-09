import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/integration/helpers/env';

export function createAdminClient() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, serviceRoleKey);
}
