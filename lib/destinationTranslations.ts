import fs from 'fs';
import path from 'path';
import getSupabaseAdmin from './supabaseAdmin';

export type DestinationTranslationEntry = {
  name?: string;
  short_description?: string;
  content?: string;
  highlights?: string[];
  travel_tips?: string[];
  region?: string;
  location?: string;
  best_time_to_visit?: string;
  destination_categories?: Array<{
    title: string;
    items: Array<{ name: string; description: string }>;
  }>;
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

/** File-based translations plus machine translations stored on destination rows (server only). */
export async function loadTranslationMapWithDb(lang: string): Promise<Record<string, DestinationTranslationEntry>> {
  const map = { ...loadTranslationMap(lang) };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return map;

  const { data, error } = await supabaseAdmin.from('destinations').select('slug, translations');
  if (error) return map;
  for (const row of data || []) {
    const entry = row.translations?.[lang];
    if (entry) map[row.slug] = entry;
  }
  return map;
}
