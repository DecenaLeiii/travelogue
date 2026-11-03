import fs from 'fs';
import path from 'path';

export type DestinationTranslationEntry = {
  name?: string;
  short_description?: string;
  content?: string;
  highlights?: string[];
  travel_tips?: string[];
  region?: string;
  location?: string;
  best_time_to_visit?: string;
};

export const TRANSLATION_LANGS = ['zh', 'hi', 'es', 'ar', 'tl', 'ceb', 'ilo', 'hil', 'war', 'pam', 'bik', 'pag'];

export function loadTranslationMap(lang: string): Record<string, DestinationTranslationEntry> {
  const file = path.join(process.cwd(), 'db', `destination_translations.${lang}.json`);
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    /* ignore */
  }
  return {};
}

export function findTranslation(
  map: Record<string, DestinationTranslationEntry>,
  slug: string,
  fallbackKey?: string,
): DestinationTranslationEntry | undefined {
  return map[slug] || (fallbackKey ? map[fallbackKey] : undefined);
}
