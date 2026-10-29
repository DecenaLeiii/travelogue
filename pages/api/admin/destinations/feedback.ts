import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data: destinations, error: destinationsError } = await supabaseAdmin
    .from('destinations')
    .select('id,slug,name');

  if (destinationsError) return res.status(500).json({ error: destinationsError.message });

  const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
    .from('destination_feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (feedbackError) return res.status(500).json({ error: feedbackError.message });

  const map: Record<string, { averageRating: number; ratingCount: number }> = {};

  for (const destination of destinations || []) {
    const rows = (feedbackRows || []).filter((row: any) => row.destination_slug === destination.slug);
    const ratings = rows.map((row: any) => Number(row.rating) || 0).filter((value: number) => value > 0);
    const ratingCount = ratings.length;
    const averageRating = ratingCount ? ratings.reduce((sum: number, value: number) => sum + value, 0) / ratingCount : 0;

    map[destination.id] = {
      averageRating,
      ratingCount,
    };
  }

  return res.json({ feedback: map });
}
