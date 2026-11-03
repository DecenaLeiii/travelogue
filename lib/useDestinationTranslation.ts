import { useEffect, useState } from 'react';
import { parseContentSections } from './content';
import type { Lang } from './i18n';

export type DestinationTranslation = {
  name?: string;
  short_description?: string;
  content?: string;
  highlights?: string[];
  travel_tips?: string[];
  region?: string;
  location?: string;
  best_time_to_visit?: string;
  overview?: string;
  full?: string;
};

// Loads every destination translation for the active language so listing cards can localize in one request.
export function useDestinationTranslations(lang: Lang) {
  const [map, setMap] = useState<Record<string, DestinationTranslation>>({});

  useEffect(() => {
    if (!lang || lang === 'en') {
      setMap({});
      return;
    }

    let cancelled = false;
    fetch(`/api/translations/destination?lang=${encodeURIComponent(lang)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('no translations');
        const j = await res.json();
        if (!cancelled) setMap(j.translations || {});
      })
      .catch(() => {
        if (!cancelled) setMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  return map;
}

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
            region: entry.region,
            location: entry.location,
            best_time_to_visit: entry.best_time_to_visit,
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
