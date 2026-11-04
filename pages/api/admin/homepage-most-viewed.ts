import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';
import { getPublishedDestinations } from '../../../lib/destinations';
import { readSetting, writeSetting } from '../../../lib/settingsStore';

async function readSelection(): Promise<string[] | null> {
  const parsed = await readSetting<unknown>('homepage_most_viewed');
  if (parsed === null) return null;
  if (!Array.isArray(parsed) || parsed.some((slug) => typeof slug !== 'string')) {
    throw new Error('Homepage destination selection is invalid.');
  }
  return [...new Set((parsed as string[]).map((slug) => slug.trim().toLowerCase()).filter(Boolean))];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const [selectedSlugs, destinations] = await Promise.all([
        readSelection(),
        getPublishedDestinations(),
      ]);
      const publishedSlugs = new Set(destinations.map((destination) => destination.slug.toLowerCase()));
      const eligibleSlugs = selectedSlugs?.filter((slug) => publishedSlugs.has(slug)).slice(0, 6) || null;
      return res.json({
        selectedSlugs: eligibleSlugs && eligibleSlugs.length >= 3 ? eligibleSlugs : null,
        destinations: destinations.map(({ slug, name }) => ({ slug, name })),
      });
    } catch (error) {
      console.error('Failed to load homepage destination selection:', error);
      return res.status(500).json({ error: 'Failed to load homepage destination selection.' });
    }
  }

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const requestedSlugs: unknown = req.body?.slugs;
  if (!isStringArray(requestedSlugs) || requestedSlugs.length < 3 || requestedSlugs.length > 6) {
    return res.status(400).json({ error: 'Select between 3 and 6 destinations.' });
  }

  const slugs = requestedSlugs.map((slug) => slug.trim().toLowerCase());
  if (new Set(slugs).size !== slugs.length || slugs.some((slug) => !slug)) {
    return res.status(400).json({ error: 'Select between 3 and 6 unique destinations.' });
  }

  const destinations = await getPublishedDestinations();
  const publishedSlugs = new Set(destinations.map((destination) => destination.slug.toLowerCase()));
  if (slugs.some((slug) => !publishedSlugs.has(slug))) {
    return res.status(400).json({ error: 'Only published destinations can be selected.' });
  }

  try {
    await writeSetting('homepage_most_viewed', slugs);
    return res.json({ selectedSlugs: slugs });
  } catch (error) {
    console.error('Failed to save homepage destination selection:', error);
    return res.status(500).json({ error: 'Failed to save homepage destination selection.' });
  }
}
