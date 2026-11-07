import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getFeaturedCategoriesForHomepage, type DestinationCategoryData } from '../../lib/destinationCategoryUtils';

type ResponseData = {
  categories?: DestinationCategoryData[];
  error?: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const destinationsPath = path.join(process.cwd(), 'db', 'destinations_full.json');
    const siteBrandingPath = path.join(process.cwd(), 'db', 'site_branding.json');

    if (!fs.existsSync(destinationsPath)) {
      return res.status(404).json({ error: 'Destinations file not found' });
    }

    if (!fs.existsSync(siteBrandingPath)) {
      return res.status(404).json({ error: 'Site branding file not found' });
    }

    const destinationsData = JSON.parse(fs.readFileSync(destinationsPath, 'utf-8'));
    const siteBrandingData = JSON.parse(fs.readFileSync(siteBrandingPath, 'utf-8'));

    const destinations = Array.isArray(destinationsData) ? destinationsData : 
                         Array.isArray(destinationsData.destinations) ? destinationsData.destinations : [];
    const featured_categories = Array.isArray(siteBrandingData.featured_categories)
      ? siteBrandingData.featured_categories
      : [];

    if (!featured_categories.length) {
      return res.status(200).json({ categories: [] });
    }

    const categories = getFeaturedCategoriesForHomepage(destinations, featured_categories);
    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Error in featured-categories API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
