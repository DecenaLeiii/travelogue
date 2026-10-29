import type { NextApiRequest, NextApiResponse } from 'next';
import { getDestinationBySlug } from '../../../lib/destinations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const slug = req.query.slug as string;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const destination = await getDestinationBySlug(slug);
  if (!destination || destination.published === false) {
    return res.status(404).json({ error: 'Destination not found' });
  }

  return res.json({ destination });
}
