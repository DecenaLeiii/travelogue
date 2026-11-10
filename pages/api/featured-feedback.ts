import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  const { data: feedback, error } = await supabaseAdmin
    .from('destination_feedback')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(15);
  if (error) return res.status(500).json({ error: error.message });

  const slugs = Array.from(new Set((feedback || []).map((item: any) => item.destination_slug).filter((slug: string) => slug && slug !== 'travelogue')));
  const { data: destinations, error: destinationsError } = slugs.length
    ? await supabaseAdmin.from('destinations').select('slug,name,published').in('slug', slugs).eq('published', true)
    : { data: [], error: null };
  if (destinationsError) return res.status(500).json({ error: destinationsError.message });

  const names = new Map<string, string>((destinations || []).map((destination: any) => [destination.slug, destination.name]));
  names.set('travelogue', 'Philippines Travelogue');
  
  const filtered = (feedback || [])
    .filter((item: any) => names.has(item.destination_slug))
    .map((item: any) => ({
      id: item.id,
      destination_slug: item.destination_slug,
      rating: item.rating,
      comment: item.comment,
      photo_urls: item.photo_urls,
      created_at: item.created_at,
      nickname: item.nickname || null,
      destination_name: names.get(item.destination_slug),
    }));
  
  // Auto-adjust to show even rows (multiples of 5: 5, 10, or 15)
  let displayCount = filtered.length;
  if (displayCount > 0) {
    if (displayCount <= 5) displayCount = Math.min(5, displayCount);
    else if (displayCount <= 10) displayCount = Math.min(10, displayCount);
    else displayCount = Math.min(15, displayCount);
  }
  
  return res.json({
    feedback: filtered.slice(0, displayCount),
  });
}
