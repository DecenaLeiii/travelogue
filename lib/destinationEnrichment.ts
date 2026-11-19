import type { DestinationTranslationEntry } from './destinationTranslations';
import { TRANSLATION_LANGS } from './destinationTranslations';

export const TRANSLATABLE_FIELDS = [
  'name',
  'short_description',
  'content',
  'highlights',
  'travel_tips',
  'region',
  'location',
  'best_time_to_visit',
] as const;

type TranslatableFields = Partial<Record<(typeof TRANSLATABLE_FIELDS)[number], string | string[] | null>>;

export type DestinationCategoryInput = {
  title?: string;
  items?: Array<{ name?: string; description?: string }>;
};

type TranslationSource = TranslatableFields & { destination_categories?: DestinationCategoryInput[] | null };

// Fields whose change should trigger re-translation when a destination is saved.
export const TRANSLATION_TRIGGER_FIELDS = [...TRANSLATABLE_FIELDS, 'destination_categories'] as const;

const REQUEST_TIMEOUT_MS = 8000;
const MAX_CHUNK_LENGTH = 1500;
const USER_AGENT = 'travelogue-app/1.0 (https://github.com/DecenaLeiii/travelogue)';

// Google's target codes differ from ours for Chinese only.
const GOOGLE_LANG_CODES: Record<string, string> = { zh: 'zh-CN' };

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];
  const chunks: string[] = [];
  let current = '';
  for (const piece of text.split(/(?<=[.!?\n])\s+/)) {
    if (current && `${current} ${piece}`.length > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateText(text: string, lang: string): Promise<string> {
  if (!text.trim()) return text;
  const target = GOOGLE_LANG_CODES[lang] || lang;
  const parts: string[] = [];
  for (const chunk of chunkText(text)) {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: chunk }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error(`Translation request failed with status ${res.status}`);
    const data = (await res.json()) as any[];
    parts.push((data[0] as any[]).map((segment) => segment[0]).join(''));
  }
  return parts.join(' ');
}

/** Machine-translates a destination's text into every supported language. Languages that fail are skipped. */
export async function translateDestinationFields(
  source: TranslationSource,
): Promise<Record<string, DestinationTranslationEntry>> {
  const result: Record<string, DestinationTranslationEntry> = {};

  await Promise.all(
    TRANSLATION_LANGS.map(async (lang) => {
      try {
        const entry: Record<string, unknown> = {};
        for (const field of TRANSLATABLE_FIELDS) {
          const value = source[field];
          if (Array.isArray(value)) {
            entry[field] = await Promise.all(value.map((item) => translateText(String(item), lang)));
          } else {
            entry[field] = await translateText(String(value ?? ''), lang);
          }
        }
        entry.destination_categories = await Promise.all(
          (source.destination_categories || []).map(async (category) => ({
            title: await translateText(category.title || '', lang),
            items: await Promise.all(
              (category.items || []).map(async (item) => ({
                name: await translateText(item.name || '', lang),
                description: await translateText(item.description || '', lang),
              })),
            ),
          })),
        );
        result[lang] = entry as DestinationTranslationEntry;
      } catch (err) {
        console.warn(`Machine translation skipped for ${lang}:`, err);
      }
    }),
  );

  return result;
}

/** Resolves coordinates from the destination's location, falling back to its name. Returns null if nothing matches. */
export async function geocodeDestination(
  location?: string | null,
  name?: string | null,
): Promise<{ latitude: number; longitude: number } | null> {
  const candidates = [location, name]
    .map((value) => (value || '').trim())
    .filter(Boolean)
    .map((value) => (/philippines/i.test(value) ? value : `${value}, Philippines`));

  for (const query of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const hits = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (hits.length && hits[0].lat && hits[0].lon) {
        return { latitude: Number(hits[0].lat), longitude: Number(hits[0].lon) };
      }
    } catch (err) {
      console.warn('Geocoding failed for', query, err);
    }
  }
  return null;
}
