import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  if (req.method === 'GET') {
    const { data: feedback, error } = await supabaseAdmin
      .from('destination_feedback')
      .select('id,destination_slug,rating,comment,photo_urls,featured,created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const slugs = Array.from(new Set((feedback || []).map((item: any) => item.destination_slug).filter(Boolean)));
    const { data: destinations, error: destinationsError } = slugs.length
      ? await supabaseAdmin.from('destinations').select('slug,name').in('slug', slugs)
      : { data: [], error: null };
    if (destinationsError) return res.status(500).json({ error: destinationsError.message });
    const names = new Map((destinations || []).map((destination: any) => [destination.slug, destination.name]));
    return res.json({ feedback: (feedback || []).map((item: any) => ({ ...item, destination_name: names.get(item.destination_slug) || item.destination_slug })) });
  }

  if (req.method === 'PUT') {
    const ids = req.body?.featuredIds;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      return res.status(400).json({ error: 'featuredIds must be an array of feedback ids.' });
    }
    if (ids.length > 6) return res.status(400).json({ error: 'You can feature up to 6 reviews.' });
    const { error: clearError } = await supabaseAdmin.from('destination_feedback').update({ featured: false }).eq('featured', true);
    if (clearError) return res.status(500).json({ error: clearError.message });

    if (ids.length) {
      const { error } = await supabaseAdmin.from('destination_feedback').update({ featured: true }).in('id', ids);
      if (error) return res.status(500).json({ error: error.message });
    }
    return res.json({ ok: true, featuredCount: ids.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
