import { createClient } from '@supabase/supabase-js';

export function createServerSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createServerSupabaseClient must not be called from the browser');
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey);
}
