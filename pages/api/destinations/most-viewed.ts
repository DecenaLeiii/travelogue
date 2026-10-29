import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublishedDestinations } from '../../../lib/destinations';
import { getDestinationViewCounts } from '../../../lib/destinationViews';

const SELECTION_PATH = path.join(process.cwd(), 'db', 'homepage_most_viewed.json');

function readSelectedSlugs(): string[] | null {
  if (!fs.existsSync(SELECTION_PATH)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(SELECTION_PATH, 'utf8'));
  if (!Array.isArray(parsed) || parsed.some((slug) => typeof slug !== 'string')) {
    throw new Error('Homepage destination selection is invalid.');
  }
  return [...new Set(parsed.map((slug) => slug.trim().toLowerCase()).filter(Boolean))];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const destinations = await getPublishedDestinations();
  const viewCounts = await getDestinationViewCounts();

  const rankedDestinations = destinations
    .map((destination) => ({
      ...destination,
      view_count: viewCounts.get(destination.slug.toLowerCase()) || 0,
    }))
    .sort((a, b) => b.view_count - a.view_count || a.name.localeCompare(b.name));

  try {
    const selectedSlugs = readSelectedSlugs();
    if (!selectedSlugs) return res.json({ destinations: rankedDestinations.slice(0, 6) });

    const destinationsBySlug = new Map(rankedDestinations.map((destination) => [destination.slug.toLowerCase(), destination]));
    const selectedDestinations = selectedSlugs
      .map((slug) => destinationsBySlug.get(slug))
      .filter((destination) => destination !== undefined);
    if (selectedDestinations.length < 3) {
      const selectedSet = new Set(selectedDestinations.map((destination) => destination.slug.toLowerCase()));
      selectedDestinations.push(...rankedDestinations
        .filter((destination) => !selectedSet.has(destination.slug.toLowerCase()))
        .slice(0, 3 - selectedDestinations.length));
    }
    return res.json({ destinations: selectedDestinations.slice(0, 6) });
  } catch (error) {
    console.error('Failed to load homepage destination selection:', error);
    return res.status(500).json({ error: 'Failed to load homepage destination selection.' });
  }
}
