import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  const destinationId = req.query.id as string;
  if (!destinationId) return res.status(400).json({ error: 'Missing destination id' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data: destinationRows, error: destinationError } = await supabaseAdmin
    .from('destinations')
    .select('slug')
    .eq('id', destinationId)
    .limit(1);

  if (destinationError) return res.status(500).json({ error: destinationError.message });
  if (!destinationRows || !destinationRows.length) return res.status(404).json({ error: 'Destination not found' });

  const slug = destinationRows[0].slug;
  const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
    .from('destination_feedback')
    .select('*')
    .eq('destination_slug', slug)
    .order('created_at', { ascending: false });

  if (feedbackError) return res.status(500).json({ error: feedbackError.message });

  const ratings = (feedbackRows || []).map((row: any) => Number(row.rating) || 0).filter((value: number) => value > 0);
  const averageRating = ratings.length ? ratings.reduce((sum: number, value: number) => sum + value, 0) / ratings.length : null;

  return res.json({
    averageRating,
    ratingCount: ratings.length,
    comments: (feedbackRows || []).map((row: any) => ({
      rating: Number(row.rating) || 0,
      comment: row.comment || null,
      photo_urls: row.photo_urls || [],
      featured: Boolean(row.featured),
      created_at: row.created_at,
    })),
  });
}
