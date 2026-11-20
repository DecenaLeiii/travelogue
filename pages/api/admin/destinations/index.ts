import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../../lib/auth';
import { logAudit } from '../../../../lib/audit';
import { geocodeDestination, translateDestinationFields } from '../../../../lib/destinationEnrichment';
import { isDestinationCoordinates } from '../../../../lib/destinationCoordinates';

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

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server misconfiguration' });

  if (req.method === 'GET') {
    const [{ data, error }, { error: trashError }] = await Promise.all([
      supabaseAdmin.from('destinations').select('*').order('name'),
      supabaseAdmin.from('destinations').select('deleted_at').limit(1),
    ]);
    if (error) return res.status(500).json({ error: error.message });
    if (trashError && trashError.code !== '42703' && trashError.code !== 'PGRST204') {
      return res.status(500).json({ error: trashError.message });
    }
    return res.json({ destinations: data || [], trashAvailable: !trashError });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (body.coordinates !== undefined && !isDestinationCoordinates(body.coordinates)) {
      return res.status(400).json({ error: 'Coordinates must contain a valid latitude and longitude.' });
    }

    const slug = body.slug?.trim() || slugify(name);
    const coordinates = body.coordinates ?? await geocodeDestination(body.location, name);
    const translations = await translateDestinationFields({
      name,
      short_description: body.short_description,
      content: body.content,
      highlights: body.highlights,
      travel_tips: body.travel_tips,
      region: body.region,
      location: body.location,
      best_time_to_visit: body.best_time_to_visit,
      destination_categories: body.destination_categories,
    });
    const row = {
      name,
      slug,
      region: body.region || null,
      location: body.location || null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      translations,
      short_description: body.short_description || null,
      content: body.content || null,
      best_time_to_visit: body.best_time_to_visit || null,
      highlights: body.highlights || [],
      travel_tips: body.travel_tips || [],
      images: body.images || [],
      destination_categories: Array.isArray(body.destination_categories) ? body.destination_categories : [],
      related_slugs: body.related_slugs || [],
      featured: Boolean(body.featured),
      published: body.published !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from('destinations').insert([row]).select('*').limit(1);
    if (error) return res.status(500).json({ error: error.message });

    const createdDestination = data?.[0];
    if (createdDestination?.id) {
      await ensureQrForDestination(supabaseAdmin, createdDestination.id, createdDestination.slug || slug);
    }

    await logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'create',
      entityType: 'destination',
      entityId: createdDestination?.id,
      details: {
        description: `Created destination "${name}" (${slug}).`,
        slug,
        name,
      },
    });

    return res.status(201).json({ destination: createdDestination });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
