import fs from 'fs';
import path from 'path';
import getSupabaseAdmin from './supabaseAdmin';
import { SUPABASE_STORAGE_BUCKET } from './supabaseStorage';

// Admin-editable settings are saved as JSON in Supabase Storage so they persist on read-only hosts like Vercel.
// Without Supabase configured (local dev) they fall back to files in db/.
const localPath = (name: string) => path.join(process.cwd(), 'db', `${name}.json`);
const remotePath = (name: string) => `settings/${name}.json`;

export async function readSetting<T>(name: string): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).download(remotePath(name));
      if (!error && data) return JSON.parse(await data.text()) as T;
    } catch {
      /* fall through to the bundled file */
    }
  }
  try {
    const file = localPath(name);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    /* ignore */
  }
  return null;
}

export async function writeSetting(name: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: bucket } = await supabase.storage.getBucket(SUPABASE_STORAGE_BUCKET);
    if (!bucket) await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, { public: true });
    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(remotePath(name), Buffer.from(body), { contentType: 'application/json', upsert: true, cacheControl: '0' });
    if (error) throw new Error(`Unable to save settings: ${error.message}`);
    return;
  }
  fs.writeFileSync(localPath(name), body);
}
