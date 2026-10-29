import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  const { data: feedback, error } = await supabaseAdmin
    .from('destination_feedback')
    .select('id,destination_slug,rating,comment,photo_urls,created_at')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) return res.status(500).json({ error: error.message });

  const slugs = Array.from(new Set((feedback || []).map((item: any) => item.destination_slug).filter(Boolean)));
  if (!slugs.length) return res.json({ feedback: [] });
  const { data: destinations, error: destinationsError } = await supabaseAdmin
    .from('destinations')
    .select('slug,name,published')
    .in('slug', slugs)
    .eq('published', true);
  if (destinationsError) return res.status(500).json({ error: destinationsError.message });

  const names = new Map((destinations || []).map((destination: any) => [destination.slug, destination.name]));
  return res.json({
    feedback: (feedback || [])
      .filter((item: any) => names.has(item.destination_slug))
      .map((item: any) => ({ ...item, destination_name: names.get(item.destination_slug) })),
  });
}
