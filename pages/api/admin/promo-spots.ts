import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';
import { logAudit } from '../../../lib/audit';
import { DEFAULT_PROMO_SPOTS, PromoSpot } from '../../../lib/promoSpots';
import { readSetting, writeSetting } from '../../../lib/settingsStore';

async function readSpots(): Promise<PromoSpot[]> {
  const parsed = await readSetting<PromoSpot[]>('promo_spots');
  return Array.isArray(parsed) ? parsed : DEFAULT_PROMO_SPOTS;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ spots: await readSpots() });
  }
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const spots = Array.isArray(req.body?.spots)
    ? req.body.spots
        .map((spot: Partial<PromoSpot>) => ({ title: String(spot.title || '').trim(), image: String(spot.image || '').trim() }))
        .filter((spot: PromoSpot) => spot.title && spot.image)
    : null;
  if (!spots) return res.status(400).json({ error: 'spots must be an array' });

  const previous = await readSpots();
  try {
    await writeSetting('promo_spots', spots);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save the photo strip.' });
  }
  const titles = (list: PromoSpot[]) => list.map((s) => s.title);
  const removed = titles(previous).filter((t) => !titles(spots).includes(t));
  const added = titles(spots).filter((t) => !titles(previous).includes(t));
  const notes = [
    ...removed.map((t) => `Removed photo "${t}" from the photo strip`),
    ...added.map((t) => `Added photo "${t}" to the photo strip`),
  ];
  if (!notes.length) notes.push('Edited the photo strip');
  for (const description of notes) {
    await logAudit({ adminId: admin.id, adminEmail: admin.email, action: removed.length && description.startsWith('Removed') ? 'delete' : 'update', entityType: 'photo strip', details: { description } }).catch(() => undefined);
  }
  return res.json({ spots });
}
