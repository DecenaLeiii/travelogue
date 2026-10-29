import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';
import { uploadToStorage } from '../../../lib/supabaseStorage';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const dataUrl = String(req.body?.dataUrl || '');
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ error: 'Upload a PNG, JPG, or WebP image.' });

  const extension = match[2] === 'jpeg' || match[2] === 'jpg' ? 'jpg' : match[2];
  const imageBuffer = Buffer.from(match[3], 'base64');
  if (imageBuffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'Images must be 8 MB or smaller.' });
  const requestedCategory = req.body?.category;
  const category = requestedCategory === 'destinations' || requestedCategory === 'logos' ? requestedCategory : 'promo-spots';
  const filename = `${category === 'destinations' ? 'destination' : 'promo'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  try {
    const url = await uploadToStorage(`${category}/${filename}`, imageBuffer, match[1]);
    return res.json({ url });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save image.' });
  }
}
