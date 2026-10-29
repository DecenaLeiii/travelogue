import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../../lib/auth';
import { logAudit } from '../../../../lib/audit';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureQrForDestination(
  supabaseAdmin: any,
  destinationId: string,
  preferredCode: string,
) {
  const { data: existingByDestination } = await supabaseAdmin
    .from('qr_codes')
    .select('*')
    .eq('destination_id', destinationId)
    .limit(1);

  if (existingByDestination && existingByDestination.length > 0) {
    return existingByDestination[0];
  }

  let code = slugify(preferredCode || 'destination');
  const { data: existingCodeRows } = await supabaseAdmin
    .from('qr_codes')
    .select('code')
    .eq('code', code)
    .limit(1);

  if (existingCodeRows && existingCodeRows.length > 0) {
    const suffix = Math.random().toString(36).slice(2, 8);
    code = `${code}-${suffix}`;
  }

  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .insert([{ code, destination_id: destinationId }])
    .select('*')
    .limit(1);

  if (error) {
    console.error('QR generation failed for destination', destinationId, error);
    return null;
  }

  return data?.[0] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  if (req.method === 'PUT') {
    const body = req.body || {};
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const fields = [
      'name', 'slug', 'region', 'location', 'short_description', 'content',
      'best_time_to_visit', 'highlights', 'travel_tips', 'images', 'local_foods', 'destination_categories', 'related_slugs',
      'featured', 'published',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    const { data: beforeRows } = await supabaseAdmin.from('destinations').select('*').eq('id', id).limit(1);
    const before = beforeRows?.[0] as Record<string, unknown> | undefined;

    const { data, error } = await supabaseAdmin
      .from('destinations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    const updatedDestination = data?.[0];
    if (updatedDestination?.id) {
      await ensureQrForDestination(supabaseAdmin, updatedDestination.id, updatedDestination.slug || body.slug || 'destination');
    }

    const updatedFields = Object.keys(updates).filter((key) => key !== 'updated_at' && (!before || JSON.stringify(before[key]) !== JSON.stringify(updates[key])));
    const label = String(updatedDestination?.name || before?.name || id);
    const wasPublished = before?.published;
    const action = updatedFields.length === 1 && updatedFields[0] === 'published' ? (updates.published ? 'publish' : 'unpublish') : 'update';
    await logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action,
      entityType: 'destination',
      entityId: id,
      details: {
        description: action === 'update'
          ? `Updated destination "${label}".${updatedFields.length ? ` Changed: ${updatedFields.join(', ')}.` : ' No fields changed.'}`
          : `${action === 'publish' ? 'Published' : 'Unpublished'} destination "${label}".`,
        fields: updatedFields,
        wasPublished,
      },
    });

    return res.json({ destination: updatedDestination });
  }

  if (req.method === 'DELETE') {
    const archive = req.query.archive === 'true';
    const { data: nameRows } = await supabaseAdmin.from('destinations').select('name').eq('id', id).limit(1);
    const label = String(nameRows?.[0]?.name || id);

    if (archive) {
      const { data, error } = await supabaseAdmin
        .from('destinations')
        .update({ published: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .limit(1);

      if (error) return res.status(500).json({ error: error.message });

      await logAudit({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'archive',
        entityType: 'destination',
        entityId: id,
        details: { description: `Archived destination "${label}".` },
      });

      return res.json({ destination: data?.[0] });
    }

    const { error } = await supabaseAdmin.from('destinations').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'delete',
      entityType: 'destination',
      entityId: id,
      details: { description: `Deleted destination "${label}".` },
    });

    return res.json({ ok: true });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('destinations').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    return res.json({ destination: data[0] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
