import { useEffect, useState } from 'react';
import { parseContentSections } from './content';
import type { Lang } from './i18n';

export type DestinationTranslation = {
  name?: string;
  short_description?: string;
  content?: string;
  highlights?: string[];
  travel_tips?: string[];
  overview?: string;
  full?: string;
};

export function useDestinationTranslation(slug: string | undefined, lang: Lang) {
  const [translated, setTranslated] = useState<DestinationTranslation | null>(null);

  useEffect(() => {
    if (!slug || !lang || lang === 'en') {
      setTranslated(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/translations/destination?slug=${encodeURIComponent(slug)}&lang=${encodeURIComponent(lang)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('no translation');
        const j = await res.json();
        const entry = j.translation || {};
        const content = entry.content || '';
        const sect = parseContentSections(content);
        if (!cancelled) {
          setTranslated({
            name: entry.name,
            short_description: entry.short_description,
            content,
            highlights: entry.highlights,
            travel_tips: entry.travel_tips,
            overview: sect.overview,
            full: sect.full,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setTranslated(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, lang]);

  return translated;
}
