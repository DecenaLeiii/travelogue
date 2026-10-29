import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';

const LOCAL_SCANS_PATH = path.join(process.cwd(), 'db', 'local_scans.json');

function getVisitorId(req: NextApiRequest): string {
  const existing = req.headers['x-visitor-id'];
  if (typeof existing === 'string' && existing) return existing;
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readLocalScans(): any[] {
  try {
    if (!fs.existsSync(LOCAL_SCANS_PATH)) return [];
    const raw = fs.readFileSync(LOCAL_SCANS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalScans(rows: any[]) {
  fs.writeFileSync(LOCAL_SCANS_PATH, JSON.stringify(rows, null, 2));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, visitor_id } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const userAgent = (req.headers['user-agent'] as string) || null;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
  const referrer = (req.headers['referer'] as string) || null;
  const vid = visitor_id || getVisitorId(req);

  const fallbackScan = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    qr_id: null,
    user_agent: userAgent,
    ip_address: ip,
    referrer,
    visitor_id: vid,
    scanned_at: new Date().toISOString(),
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      const rows = readLocalScans();
      rows.push(fallbackScan);
      writeLocalScans(rows);
      return res.json({
        ok: true,
        scan_id: fallbackScan.id,
        visitor_id: vid,
        redirect: `/?qr=${encodeURIComponent(code)}&scan=${fallbackScan.id}`,
        destination: '/',
        fallback: true,
      });
    }

    const { data: qrRows, error: qrError } = await supabaseAdmin
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .limit(1);

    if (qrError) throw qrError;
    if (!qrRows?.length) return res.status(404).json({ error: 'Invalid or expired QR code' });

    const qr = qrRows[0];
    const { data: scanRows, error: scanError } = await supabaseAdmin
      .from('scans')
      .insert({
        qr_id: qr.id,
        user_agent: userAgent,
        ip_address: ip,
        referrer,
        visitor_id: vid,
      })
      .select('id')
      .limit(1);

    if (scanError) throw scanError;

    const scanId = scanRows?.[0]?.id;
    const destination = qr.destination_id ? `/destination/${qr.destination_id}` : '/';

    return res.json({
      ok: true,
      scan_id: scanId,
      visitor_id: vid,
      redirect: `/?qr=${encodeURIComponent(code)}&scan=${scanId}`,
      destination,
    });
  } catch (e) {
    console.warn('Scan fallback triggered', e);
    const rows = readLocalScans();
    rows.push(fallbackScan);
    writeLocalScans(rows);
    return res.json({
      ok: true,
      scan_id: fallbackScan.id,
      visitor_id: vid,
      redirect: `/?qr=${encodeURIComponent(code)}&scan=${fallbackScan.id}`,
      destination: '/',
      fallback: true,
    });
  }
}
