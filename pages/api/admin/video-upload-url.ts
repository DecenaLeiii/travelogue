import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { SUPABASE_STORAGE_BUCKET } from '../../../lib/supabaseStorage';

const TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm' };

// Returns a signed URL so the browser can upload large videos straight to Supabase Storage,
// bypassing the serverless request body size limit.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const extension = TYPES[String(req.body?.contentType || '')];
  if (!extension) return res.status(400).json({ error: 'Upload an MP4 or WebM video.' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });

  const { data: bucket } = await supabase.storage.getBucket(SUPABASE_STORAGE_BUCKET);
  if (!bucket) {
    const { error } = await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, { public: true });
    if (error && !error.message.toLowerCase().includes('already exists')) return res.status(500).json({ error: error.message });
  }

  const path = `videos/hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return res.status(500).json({ error: error?.message || 'Unable to prepare upload.' });

  const publicUrl = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return res.json({ signedUrl: data.signedUrl, publicUrl });
}
