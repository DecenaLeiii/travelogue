import getSupabaseAdmin from './supabaseAdmin';

export const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'travelogue-media';

export async function uploadToStorage(path: string, body: Buffer, contentType: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { data: bucket } = await supabase.storage.getBucket(SUPABASE_STORAGE_BUCKET);
  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, { public: true });
    if (createError && !createError.message.toLowerCase().includes('already exists')) {
      throw new Error(`Unable to create the Supabase Storage bucket: ${createError.message}`);
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (uploadError) throw new Error(`Unable to upload file to Supabase Storage: ${uploadError.message}`);

  return supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
