import type { Destination } from './destinations';
import type { Lang } from './i18n';
import { atext } from './assistantI18n';
import type { DestinationTranslationEntry } from './destinationTranslations';

export type QuestionKey = 'loc' | 'known' | 'fee' | 'hours' | 'how' | 'activities' | 'halal' | 'prayer' | 'nearby';

export const QUESTION_KEYS: QuestionKey[] = ['loc', 'known', 'fee', 'hours', 'how', 'activities', 'halal', 'prayer', 'nearby'];

// Order matters: more specific questions (halal/prayer) must match before "nearby" and "location".
const PATTERNS: [QuestionKey, RegExp][] = [
  ['halal', /halal/i],
  ['prayer', /prayer|mosque|masjid|musalla|pray\b|dasalan|dasalan|मस्जिद|مسجد|清真寺/i],
  ['fee', /entrance|entry fee|admission|ticket|how much|\bfees?\b|bayad|magkano|bayranan/i],
  ['hours', /operating hours|opening hours|business hours|open(s|ing)?\b|closing|closed|what time|schedule|oras ng|bukas|sarado/i],
  ['how', /how (can|do|to) (i )?(get|go|reach)|getting there|directions?|transport|commute|paano (pumunta|makarating)|unsaon pag/i],
  ['activities', /activities|things to do|what can i do|what to do|gagawin|puwedeng gawin|mahimo nga buhaton/i],
  ['nearby', /nearby|near by|other (tourist )?attractions|attractions near|around (it|there|here)|malapit|haduol/i],
  ['known', /known for|famous for|what is .{0,40} (about|like)|kilala|bantog/i],
  ['loc', /where (is|are)|located|location|saan|nasaan|asa (man )?ang/i],
];

export function detectQuestion(message: string): QuestionKey | null {
  for (const [key, pattern] of PATTERNS) if (pattern.test(message)) return key;
  return null;
}

const SOURCE_PATTERNS: Partial<Record<QuestionKey, RegExp>> = {
  fee: /entrance|entry fee|admission|\bfees?\b|₱|\bphp\b|\bpesos?\b|ticket/i,
  hours: /\bopen(s|ing)?\b|\bhours\b|\b\d{1,2}(:\d{2})?\s?(a\.?m\.?|p\.?m\.?)\b|\bclos(e|ed|es|ing)\b|daily/i,
  how: /airport|flight|\bfly\b|ferry|\bbus\b|\bvan\b|tricycle|jeepney|\bdrive\b|\broad\b|\bboat\b|\bhours? (from|by)\b/i,
};

// Pulls sentences from the destination's own English text so answers never invent facts.
function sourceSentences(destination: Destination, key: QuestionKey): string[] {
  const pattern = SOURCE_PATTERNS[key];
  if (!pattern) return [];
  const pool = [destination.content || '', ...(destination.travel_tips || []), ...(destination.highlights || [])].join('. ');
  const sentences = pool.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(sentences.filter((s) => pattern.test(s)))).slice(0, 3);
}

export type RelatedInfo = { name: string; slug: string };

export function answerQuestion(
  key: QuestionKey,
  destination: Destination,
  local: DestinationTranslationEntry,
  related: RelatedInfo[],
  lang: Lang,
): string {
  const name = local.name || destination.name;
  const place = local.location || destination.location || local.region || destination.region || '';
  const bullets = (items: string[]) => items.map((item) => `• ${item}`).join('\n');
  const link = `/destination/${destination.slug}`;
  const vars = { n: name, l: place };

  switch (key) {
    case 'loc':
      return place ? `${atext(lang, 'a_loc', vars)}\n\n${link}` : `${atext(lang, 'a_how', vars)}\n\n${link}`;
    case 'known': {
      const description = local.short_description || destination.short_description || '';
      const highlights = (local.highlights?.length ? local.highlights : destination.highlights || []).slice(0, 4);
      return [atext(lang, 'a_known', vars), description, highlights.length ? bullets(highlights) : '', link].filter(Boolean).join('\n');
    }
    case 'activities': {
      const highlights = (local.highlights?.length ? local.highlights : destination.highlights || []).slice(0, 6);
      if (!highlights.length) return `${atext(lang, 'a_known', vars)}\n${local.short_description || destination.short_description || ''}\n${link}`;
      return `${atext(lang, 'a_activities', vars)}\n${bullets(highlights)}\n\n${link}`;
    }
    case 'nearby': {
      if (!related.length) return `${atext(lang, 'a_nearbyNone', vars)}\n${link}`;
      return `${atext(lang, 'a_nearby', vars)}\n${bullets(related.map((r) => `${r.name} - /destination/${r.slug}`))}`;
    }
    case 'fee':
    case 'hours':
    case 'how': {
      const found = sourceSentences(destination, key);
      if (found.length) return `${atext(lang, 'a_found', vars)}\n${bullets(found)}\n\n${link}`;
      return `${atext(lang, key === 'fee' ? 'a_fee' : key === 'hours' ? 'a_hours' : 'a_how', vars)}\n\n${link}\n/contact`;
    }
    case 'halal':
      return `${atext(lang, 'a_halal', vars)}\n\n/contact`;
    case 'prayer':
      return `${atext(lang, 'a_prayer', vars)}\n\n/contact`;
  }
}
