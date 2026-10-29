import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import getSupabaseAdmin from '../../../../lib/supabaseAdmin';

export const config = { api: { bodyParser: { sizeLimit: '22mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  const slug = req.query.slug as string;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('destination_feedback')
      .select('rating')
      .eq('destination_slug', slug);

    if (error) {
      console.error('Feedback GET error', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const ratings = (data || []).map((row: any) => Number(row.rating) || 0).filter((r: number) => r > 0);
    const ratingCount = ratings.length;
    const averageRating = ratingCount ? ratings.reduce((sum: number, v: number) => sum + v, 0) / ratingCount : null;

    return res.json({ averageRating, ratingCount });
  }

  if (req.method === 'POST') {
    const { rating: rawRating, comment: rawComment, photoData } = req.body || {};
    const rating = Number(rawRating);
    const comment = typeof rawComment === 'string' ? rawComment.trim().slice(0, 2000) : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const photoInputs = Array.isArray(photoData) ? photoData : photoData ? [photoData] : [];
    if (photoInputs.length > 3) return res.status(400).json({ error: 'You can attach up to 3 photos.' });
    const photoFiles: { extension: string; image: Buffer }[] = [];
    for (const photo of photoInputs) {
      const match = String(photo).match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return res.status(400).json({ error: 'Upload PNG, JPG, or WebP photos.' });
      const image = Buffer.from(match[2], 'base64');
      if (!image.length || image.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Each feedback photo must be 5 MB or smaller.' });
      const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
      photoFiles.push({ extension, image });
    }

    const photoUrls: string[] = [];
    if (photoFiles.length) {
      const directory = path.join(process.cwd(), 'public', 'feedback');
      fs.mkdirSync(directory, { recursive: true });
      for (const file of photoFiles) {
        const filename = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${file.extension}`;
        fs.writeFileSync(path.join(directory, filename), file.image);
        photoUrls.push(`/feedback/${filename}`);
      }
    }

    const row = {
      destination_slug: slug,
      rating,
      comment: comment || null,
      photo_urls: photoUrls,
      featured: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('destination_feedback').insert([row]);
    if (error) {
      console.error('Feedback POST error', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
