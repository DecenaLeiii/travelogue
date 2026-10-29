import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { event_type, payload, scan_id } = req.body || {};
  if (!event_type) return res.status(400).json({ error: 'Missing event_type' });

  const resolvedScanId = scan_id || payload?.scan_id || null;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return res.status(500).json({ error: 'server misconfiguration' });

    const row: Record<string, unknown> = { event_type, payload: payload || {} };
    if (resolvedScanId) row.scan_id = resolvedScanId;

    const { data, error } = await supabaseAdmin.from('engagements').insert([row]).select('id');
    if (error) {
      console.error('Engagement insert error', error);
      return res.status(500).json({ error: 'db error' });
    }
    return res.json({ ok: true, id: data?.[0]?.id });
  } catch (e) {
    console.error('Engagement handler error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
