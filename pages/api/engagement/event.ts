import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';

const LOCAL_ENGAGEMENTS_PATH = path.join(process.cwd(), 'db', 'local_engagements.json');

function readLocalEngagements(): any[] {
  try {
    if (!fs.existsSync(LOCAL_ENGAGEMENTS_PATH)) return [];
    const raw = fs.readFileSync(LOCAL_ENGAGEMENTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalEngagements(rows: any[]) {
  fs.writeFileSync(LOCAL_ENGAGEMENTS_PATH, JSON.stringify(rows, null, 2));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event_type, payload, scan_id } = req.body || {};
  if (!event_type) return res.status(400).json({ error: 'Missing event_type' });

  const resolvedScanId = scan_id || payload?.scan_id || null;
  const localRow = {
    event_type,
    payload: payload || {},
    scan_id: resolvedScanId,
    created_at: new Date().toISOString(),
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      const rows = readLocalEngagements();
      rows.push(localRow);
      writeLocalEngagements(rows);
      return res.json({ ok: true, fallback: true });
    }

    const row: Record<string, unknown> = {
      event_type,
      payload: payload || {},
    };
    if (resolvedScanId) row.scan_id = resolvedScanId;

    const { data, error } = await supabaseAdmin
      .from('engagements')
      .insert([row])
      .select('id');

    if (error) {
      console.warn('Engagement insert error, using local fallback', error.message);
      const rows = readLocalEngagements();
      rows.push(localRow);
      writeLocalEngagements(rows);
      return res.json({ ok: true, fallback: true });
    }

    return res.json({ ok: true, id: data?.[0]?.id });
  } catch (e) {
    console.warn('Engagement handler error, using local fallback', e);
    const rows = readLocalEngagements();
    rows.push(localRow);
    writeLocalEngagements(rows);
    return res.json({ ok: true, fallback: true });
  }
}
