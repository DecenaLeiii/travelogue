import fs from 'fs';
import path from 'path';
import type { DestinationTranslationEntry } from './destinationTranslations';

export const TRANSLATION_LANGS = ['hil', 'war', 'pam', 'bik', 'pag', 'tl', 'ceb', 'ilo', 'zh', 'hi', 'es', 'ar'];

export function addTranslationPlaceholder(
  slug: string,
  destination: {
    name: string;
    short_description?: string;
    content?: string;
    highlights?: string[];
    travel_tips?: string[];
    region?: string;
    location?: string;
    best_time_to_visit?: string;
  },
): void {
  // Add placeholder translations for all regional language files
  // This ensures new destinations can be displayed (even in English) until proper translations are added
  const regionalLangs = ['hil', 'war', 'pam', 'bik', 'pag'];
  
  for (const lang of regionalLangs) {
    const file = path.join(process.cwd(), 'db', `destination_translations.${lang}.json`);
    try {
      let translations: Record<string, DestinationTranslationEntry> = {};
      
      if (fs.existsSync(file)) {
        translations = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      
      // Only add if doesn't exist
      if (!translations[slug]) {
        translations[slug] = {
          name: destination.name,
          short_description: destination.short_description || '',
          content: destination.content || '',
          highlights: destination.highlights || [],
          travel_tips: destination.travel_tips || [],
          region: destination.region || '',
          location: destination.location || '',
          best_time_to_visit: destination.best_time_to_visit || '',
        };
        
        fs.writeFileSync(file, JSON.stringify(translations, null, 2), 'utf8');
      }
    } catch (err) {
      console.error(`Failed to update translation file for language ${lang}:`, err);
    }
  }
}

export function removeTranslationEntry(slug: string): void {
  // Remove placeholder translations when a destination is deleted
  const regionalLangs = ['hil', 'war', 'pam', 'bik', 'pag'];
  
  for (const lang of regionalLangs) {
    const file = path.join(process.cwd(), 'db', `destination_translations.${lang}.json`);
    try {
      if (fs.existsSync(file)) {
        const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
        delete translations[slug];
        fs.writeFileSync(file, JSON.stringify(translations, null, 2), 'utf8');
      }
    } catch (err) {
      console.error(`Failed to update translation file for language ${lang}:`, err);
    }
  }
}
