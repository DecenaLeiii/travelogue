import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { verifyAdmin } from '../../../lib/auth';

type ResponseData = {
  success?: boolean;
  featured_categories?: any[];
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'PUT') {
      const { featured_categories } = req.body;

      if (!Array.isArray(featured_categories)) {
        return res.status(400).json({ error: 'featured_categories must be an array' });
      }

      // Validate each category
      for (const cat of featured_categories) {
        if (!cat.category_name || !cat.display_name) {
          return res.status(400).json({ error: 'Each category must have category_name and display_name' });
        }
      }

      // Max 5 categories
      if (featured_categories.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 featured categories allowed' });
      }

      // Read current site branding
      const siteBrandingPath = path.join(process.cwd(), 'db', 'site_branding.json');
      let siteBrandingData = {};

      if (fs.existsSync(siteBrandingPath)) {
        siteBrandingData = JSON.parse(fs.readFileSync(siteBrandingPath, 'utf-8'));
      }

      // Update featured categories
      siteBrandingData = {
        ...siteBrandingData,
        featured_categories,
      };

      // Write back to file
      fs.writeFileSync(siteBrandingPath, JSON.stringify(siteBrandingData, null, 2));

      return res.status(200).json({ success: true, featured_categories });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in site-branding API:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
