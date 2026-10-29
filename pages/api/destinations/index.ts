import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublishedDestinations } from '../../../lib/destinations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const destinations = await getPublishedDestinations();
  return res.json({ destinations });
}
