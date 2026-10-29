import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/auth';

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

  const directory = path.join(process.cwd(), 'public', 'videos');
  fs.mkdirSync(directory, { recursive: true });
  const filename = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const target = path.join(directory, filename);

  let size = 0;
  const out = fs.createWriteStream(target);
  let failed = false;
  const fail = (status: number, error: string) => {
    if (failed) return;
    failed = true;
    out.destroy();
    fs.rmSync(target, { force: true });
    if (!res.headersSent) res.status(status).json({ error });
  };

  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      fail(413, 'Videos must be 100 MB or smaller.');
      req.destroy();
    }
  });
  req.on('error', () => fail(400, 'Upload failed.'));
  out.on('error', () => fail(500, 'Unable to save video.'));
  out.on('finish', () => {
    if (!failed) res.json({ url: `/videos/${filename}` });
  });
  req.pipe(out);
}
