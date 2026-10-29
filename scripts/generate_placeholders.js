const fs = require('fs');
const path = require('path');

const TARGET_LANGS = ['es', 'tl', 'zh', 'hi', 'ar'];

function loadSources() {
  const fullPath = path.join(process.cwd(), 'db', 'destinations_full.json');
  const seedPath = path.join(process.cwd(), 'db', 'seed_destinations.json');
  const descPath = path.join(process.cwd(), 'db', 'destination_descriptions.json');

  const sources = fs.existsSync(fullPath)
    ? JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    : JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const descMap = fs.existsSync(descPath) ? JSON.parse(fs.readFileSync(descPath, 'utf8')) : {};
  return { sources, descMap };
}

function makeOut(sources, descMap) {
  const out = {};
  for (const dest of sources) {
    const key = dest.slug;
    const name = dest.name || '';
    const short_description = dest.short_description || '';
    const content = dest.content || descMap[key] || '';
    const highlights = dest.highlights || [];
    const travel_tips = dest.travel_tips || [];

    out[key] = { name, short_description, content, highlights, travel_tips };
  }
  return out;
}

function run() {
  const { sources, descMap } = loadSources();
  const baseOut = makeOut(sources, descMap);

  for (const lang of TARGET_LANGS) {
    const outPath = path.join(process.cwd(), 'db', `destination_translations.${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(baseOut, null, 2), 'utf8');
    console.log(`Wrote placeholder ${outPath}`);
  }
}

run();
