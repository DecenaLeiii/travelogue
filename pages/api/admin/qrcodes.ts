import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth';
import { logAudit } from '../../../lib/audit';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('qr_codes').select('id,code,destination_id').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ qrcodes: data || [] });
  }

  if (req.method === 'POST') {
    const { destination_id, generate_all } = req.body || {};

    if (generate_all) {
      const { data: destinationRows, error: destinationError } = await supabaseAdmin
        .from('destinations')
        .select('id,slug,name');

      if (destinationError) return res.status(500).json({ error: destinationError.message });

      let generated = 0;

      for (const destination of destinationRows || []) {
        const { data: existingDestinationQr } = await supabaseAdmin
          .from('qr_codes')
          .select('id')
          .eq('destination_id', destination.id)
          .limit(1);

        if (existingDestinationQr && existingDestinationQr.length > 0) continue;

        const baseCode = slugify(destination.slug || destination.name || 'destination');
        let code = baseCode;

        const { data: existingCodeRows } = await supabaseAdmin
          .from('qr_codes')
          .select('code')
          .eq('code', code)
          .limit(1);

        if (existingCodeRows && existingCodeRows.length > 0) {
          code = `${baseCode}-${randomSuffix()}`;
        }

        const { data, error } = await supabaseAdmin
          .from('qr_codes')
          .insert([{ code, destination_id: destination.id }])
          .select('*')
          .limit(1);

        if (!error && data && data[0]) {
          generated += 1;
          await logAudit({
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'create',
            entityType: 'qr_code',
            entityId: data[0].id,
            details: { destination_id: destination.id, code },
          });
        }
      }

      return res.status(200).json({ ok: true, generated });
    }

    if (!destination_id) return res.status(400).json({ error: 'destination_id is required' });

    const { data: destinationRows, error: destinationError } = await supabaseAdmin
      .from('destinations')
      .select('id,slug,name')
      .eq('id', destination_id)
      .limit(1);

    if (destinationError) return res.status(500).json({ error: destinationError.message });
    if (!destinationRows || !destinationRows.length) return res.status(404).json({ error: 'Destination not found' });

    const destination = destinationRows[0];
    const baseCode = slugify(destination.slug || destination.name || 'destination');
    let code = baseCode;

    const { data: existingDestinationQr } = await supabaseAdmin
      .from('qr_codes')
      .select('*')
      .eq('destination_id', destination_id)
      .limit(1);

    if (existingDestinationQr && existingDestinationQr.length > 0) {
      return res.json({ qr: existingDestinationQr[0] });
    }

    const { data: existingCodeRows } = await supabaseAdmin
      .from('qr_codes')
      .select('code')
      .eq('code', code)
      .limit(1);

    if (existingCodeRows && existingCodeRows.length > 0) {
      code = `${baseCode}-${randomSuffix()}`;
    }

    const { data, error } = await supabaseAdmin
      .from('qr_codes')
      .insert([{ code, destination_id }])
      .select('*')
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    const createdQr = data?.[0];
    if (createdQr) {
      await logAudit({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'create',
        entityType: 'qr_code',
        entityId: createdQr.id,
        details: { destination_id, code },
      });
    }

    return res.status(201).json({ qr: createdQr });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
