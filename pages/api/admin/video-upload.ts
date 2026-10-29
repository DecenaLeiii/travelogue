import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';
import { uploadToStorage } from '../../../lib/supabaseStorage';

export const config = { api: { bodyParser: false } };

const MAX_BYTES = 100 * 1024 * 1024;
const TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm' };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const extension = TYPES[String(req.headers['content-type'] || '').split(';')[0].trim()];
  if (!extension) return res.status(400).json({ error: 'Upload an MP4 or WebM video.' });
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return res.status(413).json({ error: 'Videos must be 100 MB or smaller.' });

  const filename = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BYTES) return res.status(413).json({ error: 'Videos must be 100 MB or smaller.' });
      chunks.push(buffer);
    }
    const contentType = String(req.headers['content-type']).split(';')[0].trim();
    const url = await uploadToStorage(`videos/${filename}`, Buffer.concat(chunks), contentType);
    return res.json({ url });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save video.' });
  }
}
