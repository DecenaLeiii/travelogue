const fs = require('fs');
const path = require('path');

// Configuration: set TRANSLATE_API_URL and optional TRANSLATE_API_KEY in .env.local
// To use Microsoft Translator via RapidAPI, set TRANSLATE_PROVIDER=microsoft,
// TRANSLATE_API_URL=https://microsoft-translator-text.p.rapidapi.com/translate,
// TRANSLATE_RAPIDAPI_KEY and TRANSLATE_RAPIDAPI_HOST.
const API_URL = process.env.TRANSLATE_API_URL || 'https://libretranslate.de/translate';
const API_KEY = process.env.TRANSLATE_API_KEY || '';
const PROVIDER = (process.env.TRANSLATE_PROVIDER || 'libre').toLowerCase();
const RAPIDAPI_KEY = process.env.TRANSLATE_RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.TRANSLATE_RAPIDAPI_HOST || '';

const TARGET_LANGS = ['es', 'tl', 'zh', 'hi', 'ar'];

// Map slugs to description keys used by translation files (keeps parity with lib/destinations DESCRIPTION_MAP)
const DESCRIPTION_MAP = {
  'boracay': 'boracay',
  'el-nido': 'palawan',
  'coron': 'coron',
  'chocolate-hills': 'bohol',
  'panglao': 'bohol',
  'banaue-rice-terraces': 'banaue',
  'vigan': 'vigan',
  'mayon-volcano': 'bicol',
  'kawasan-falls': 'cebu',
  'siargao': 'siargao',
  'intramuros': 'manila',
  'taal-volcano': 'batangas',
  'eden-nature-park': 'davao city',
  'apo-island': 'dumaguete',
  'camiguin': 'camiguin',
  'baguio': 'baguio',
  'sagada': 'sagada',
  'bohol': 'bohol',
  'cebu': 'cebu',
  'palawan': 'palawan',
  'davao': 'davao city',
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function translate(text, target) {
  if (!text) return '';
  // Use fetch available in Node 18+; otherwise user should run with a compatible Node.
  if (PROVIDER === 'microsoft') {
    // Microsoft Translator (via RapidAPI) expects an array body: [{ "Text": "..." }]
    const url = `${API_URL}?api-version=3.0&to=${encodeURIComponent(target)}`;
    const headers = { 'Content-Type': 'application/json' };
    if (RAPIDAPI_HOST) headers['x-rapidapi-host'] = RAPIDAPI_HOST;
    if (RAPIDAPI_KEY) headers['x-rapidapi-key'] = RAPIDAPI_KEY;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ Text: text }]),
    });
    if (!res.ok) throw new Error(`Microsoft Translate API error ${res.status}`);
    const j = await res.json();
    // Response shape: [{ translations: [{ text: '...', to: 'es' }] }]
    try {
      return (j && j[0] && j[0].translations && j[0].translations[0] && j[0].translations[0].text) || '';
    } catch (e) {
      return '';
    }
  }

  // Default: LibreTranslate-like API
  const body = { q: text, source: 'en', target };
  if (API_KEY) body.api_key = API_KEY;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Translate API error ${res.status}`);
  const j = await res.json();
  return j.translatedText || j.translation || j.result || j;
}

async function run() {
  const fullPath = path.join(process.cwd(), 'db', 'destinations_full.json');
  const seedPath = path.join(process.cwd(), 'db', 'seed_destinations.json');
  const descPath = path.join(process.cwd(), 'db', 'destination_descriptions.json');

  const sources = fs.existsSync(fullPath)
    ? JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    : JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const descMap = fs.existsSync(descPath) ? JSON.parse(fs.readFileSync(descPath, 'utf8')) : {};

  for (const lang of TARGET_LANGS) {
    console.log(`Generating translations for ${lang}...`);
    const out = {};
    for (const dest of sources) {
      const key = DESCRIPTION_MAP[dest.slug] || dest.slug;
      const name = dest.name || '';
      const short_description = dest.short_description || '';
      const content = dest.content || descMap[key] || '';
      const highlights = dest.highlights || [];
      const travel_tips = dest.travel_tips || [];

      try {
        // Translate fields
        const tName = await translate(name, lang);
        await sleep(300);
        const tShort = await translate(short_description, lang);
        await sleep(300);
        const tContent = await translate(content, lang);
        await sleep(300);

        const tHighlights = [];
        for (const h of highlights) {
          const th = await translate(h, lang);
          tHighlights.push(th);
          await sleep(200);
        }

        const tTips = [];
        for (const tt of travel_tips) {
          const ttt = await translate(tt, lang);
          tTips.push(ttt);
          await sleep(200);
        }

        out[key] = {
          name: tName,
          short_description: tShort,
          content: tContent,
          highlights: tHighlights,
          travel_tips: tTips,
        };
        console.log(`Translated ${dest.slug} -> ${key}`);
      } catch (err) {
        console.error(`Failed to translate ${dest.slug}`, err.message || err);
      }
    }

    const outPath = path.join(process.cwd(), 'db', `destination_translations.${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log(`Wrote ${outPath}`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
