import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';
import { logAudit } from '../../../lib/audit';
import { DEFAULT_PROMO_SPOTS, PromoSpot } from '../../../lib/promoSpots';

const PROMO_PATH = path.join(process.cwd(), 'db', 'promo_spots.json');

function readSpots(): PromoSpot[] {
  try {
    if (!fs.existsSync(PROMO_PATH)) return DEFAULT_PROMO_SPOTS;
    const parsed = JSON.parse(fs.readFileSync(PROMO_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : DEFAULT_PROMO_SPOTS;
  } catch {
    return DEFAULT_PROMO_SPOTS;
  }
}

function writeSpots(spots: PromoSpot[]) {
  fs.writeFileSync(PROMO_PATH, JSON.stringify(spots, null, 2));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.json({ spots: readSpots() });
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const spots = Array.isArray(req.body?.spots)
    ? req.body.spots
        .map((spot: Partial<PromoSpot>) => ({ title: String(spot.title || '').trim(), image: String(spot.image || '').trim() }))
        .filter((spot: PromoSpot) => spot.title && spot.image)
    : null;
  if (!spots) return res.status(400).json({ error: 'spots must be an array' });

  const previous = readSpots();
  writeSpots(spots);
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
