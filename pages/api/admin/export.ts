import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '../../../lib/supabaseAdmin';

function toCSV(rows: any[]) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const lines = rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','));
  return [header].concat(lines).join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('admin_token=1')) return res.status(401).end();

  try {
    const { data: scans } = await supabaseAdmin.from('scans').select('*').order('scanned_at', { ascending: false }).limit(1000);
    const { data: engagements } = await supabaseAdmin.from('engagements').select('*').order('created_at', { ascending: false }).limit(5000);

    const csvScans = toCSV(scans || []);
    const csvEng = toCSV(engagements || []);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="travelogue_export.csv"');
    res.send('\n-- SCANS --\n' + csvScans + '\n\n-- ENGAGEMENTS --\n' + csvEng);
  } catch (e) {
    console.error('Export error', e);
    res.status(500).json({ error: 'export failed' });
  }
}
