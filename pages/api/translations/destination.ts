import type { NextApiRequest, NextApiResponse } from 'next';
import { DESCRIPTION_MAP } from '../../../lib/destinations';
import { TRANSLATION_LANGS, findTranslation, loadTranslationMap } from '../../../lib/destinationTranslations';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug, lang } = req.query;
  const s = Array.isArray(slug) ? slug[0] : slug;
  const l = (Array.isArray(lang) ? lang[0] : lang) || 'en';

  if (l !== 'en' && !TRANSLATION_LANGS.includes(l)) return res.status(400).json({ error: 'Unsupported lang' });

  try {
    const map = l === 'en' ? {} : loadTranslationMap(l);

    // Without a slug, return every translation for the language (used by listing cards).
    if (!s) {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
      return res.json({ translations: map });
    }

    const entry = findTranslation(map, s, DESCRIPTION_MAP[s]);
    if (!entry) return res.status(404).json({ error: 'Translation not found' });
    return res.json({ translation: entry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
