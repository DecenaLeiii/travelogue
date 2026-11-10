import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { verifyAdmin } from '../../../lib/auth';

type ResponseData = {
  success?: boolean;
  featured_items?: any;
  error?: string;
};

type FeaturedItemsConfig = {
  [destination_slug: string]: {
    [category_name: string]: string[];
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'PUT') {
      const { featured_items } = req.body;

      if (typeof featured_items !== 'object' || featured_items === null || Array.isArray(featured_items)) {
        return res.status(400).json({ error: 'featured_items must be an object' });
      }

      // Validate structure: {destination_slug: {category_name: [item_names]}}
      for (const [destSlug, categories] of Object.entries(featured_items)) {
        if (typeof categories !== 'object' || categories === null || Array.isArray(categories)) {
          return res.status(400).json({ error: `featured_items["${destSlug}"] must be an object` });
        }
        for (const [categoryName, items] of Object.entries(categories)) {
          if (!Array.isArray(items)) {
            return res.status(400).json({ error: `featured_items["${destSlug}"]["${categoryName}"] must be an array` });
          }
          for (const item of items) {
            if (typeof item !== 'string') {
              return res.status(400).json({ error: `featured_items["${destSlug}"]["${categoryName}"] must contain only strings` });
            }
          }
        }
      }

      // Read current site branding
      const siteBrandingPath = path.join(process.cwd(), 'db', 'site_branding.json');
      let siteBrandingData = {};

      if (fs.existsSync(siteBrandingPath)) {
        siteBrandingData = JSON.parse(fs.readFileSync(siteBrandingPath, 'utf-8'));
      }

      // Update featured items (remove old featured_categories if present)
      siteBrandingData = {
        ...siteBrandingData,
        featured_items: featured_items as FeaturedItemsConfig,
      };
      
      // Remove legacy featured_categories
      delete (siteBrandingData as any).featured_categories;

      // Write back to file
      fs.writeFileSync(siteBrandingPath, JSON.stringify(siteBrandingData, null, 2));

      return res.status(200).json({ success: true, featured_items });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in site-branding API:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
