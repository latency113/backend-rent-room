import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wjzuxkzbqnpyumenctey.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_b0-tFLLcyORPzqynx-oeEQ_bgz_xqa_';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

let isSupabaseConnected = false;
let checkAttempted = false;

export async function checkSupabaseConnection(): Promise<boolean> {
  if (checkAttempted) return isSupabaseConnected;
  checkAttempted = true;
  try {
    const { error } = await supabase.from('room').select('room_id').limit(1);
    if (!error) {
      isSupabaseConnected = true;
      console.log('✅ Connected to Supabase tables successfully!');
    } else {
      console.warn('⚠️ Supabase tables not found or error (Code: ' + error.code + '). Using active fallback data store. (Run backend/supabase/schema.sql in Supabase to sync).');
      isSupabaseConnected = false;
    }
  } catch (err) {
    console.warn('⚠️ Could not connect to Supabase. Using active fallback data store.');
    isSupabaseConnected = false;
  }
  return isSupabaseConnected;
}
