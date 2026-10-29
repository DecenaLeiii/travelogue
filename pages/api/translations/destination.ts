import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { DESCRIPTION_MAP } from '../../../lib/destinations';

const SUPPORTED: string[] = ['en', 'zh', 'hi', 'es', 'ar', 'tl'];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug, lang } = req.query;
  const s = Array.isArray(slug) ? slug[0] : slug;
  const l = (Array.isArray(lang) ? lang[0] : lang) || 'en';

  if (!s) return res.status(400).json({ error: 'Missing slug' });
  if (!SUPPORTED.includes(l)) return res.status(400).json({ error: 'Unsupported lang' });

  try {
    const key = DESCRIPTION_MAP[s] || s;

    // Prefer structured translations file if present
    const structuredFile = path.join(process.cwd(), 'db', `destination_translations.${l}.json`);
    if (fs.existsSync(structuredFile)) {
      const map = JSON.parse(fs.readFileSync(structuredFile, 'utf8')) as Record<string, any>;
      const entry = map[key];
      if (!entry) return res.status(404).json({ error: 'Translation not found' });
      return res.json({ translation: entry });
    }

    // Fallback to older single-string descriptions file
    const filename = path.join(process.cwd(), 'db', `destination_descriptions.${l}.json`);
    if (!fs.existsSync(filename)) {
      return res.status(404).json({ error: 'No translations for language' });
    }
    const map = JSON.parse(fs.readFileSync(filename, 'utf8')) as Record<string, string>;
    const content = map[key];
    if (!content) return res.status(404).json({ error: 'Translation not found' });
    return res.json({ translation: { content } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
