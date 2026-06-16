import { createClient } from '@supabase/supabase-js';

const pubUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pubKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _supabase: any = null;
if (pubUrl && pubKey) {
  _supabase = createClient(pubUrl, pubKey);
} else {
  // Export a null client when public envs are not set so builds don't fail.
  _supabase = null;
}

export const supabase = _supabase;
export default supabase;
