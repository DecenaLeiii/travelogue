const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Attempt to load .env.local manually so the script works when run via npm
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();
    // Remove surrounding quotes if present
    const unquoted = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!process.env[key]) process.env[key] = unquoted;
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  const destinations = [
    { name: 'Boracay', slug: 'boracay', region: 'Visayas', short_description: 'White-sand beaches and lively nightlife.', content: 'Boracay is famous for White Beach and watersports.' },
    { name: 'Palawan (El Nido)', slug: 'el-nido', region: 'MIMAROPA', short_description: 'Limestone cliffs and island hopping.', content: 'El Nido offers dramatic karst landscapes and clear lagoons.' },
    { name: 'Palawan (Coron)', slug: 'coron', region: 'MIMAROPA', short_description: 'Shipwreck diving and freshwater lakes.', content: 'Coron is a top wreck-diving and snorkeling site.' },
    { name: 'Chocolate Hills (Bohol)', slug: 'chocolate-hills', region: 'Visayas', short_description: 'Unique karst hill formations.', content: 'The Chocolate Hills are a geological formation of over 1,000 hills.' },
    { name: 'Banaue Rice Terraces', slug: 'banaue-rice-terraces', region: 'Cordillera', short_description: 'Ancient rice terraces carved into the mountains.', content: 'A UNESCO World Heritage site built by indigenous people.' },
    { name: 'Vigan', slug: 'vigan', region: 'Ilocos', short_description: 'Spanish-colonial architecture and cobblestone streets.', content: 'Vigan is known for its preserved colonial townscape.' },
    { name: 'Mayon Volcano (Legazpi)', slug: 'mayon-volcano', region: 'Bicol', short_description: 'Perfect cone volcano and outdoor activities.', content: 'Mayon Volcano offers scenic views and hiking opportunities.' },
    { name: 'Cebu (Kawasan Falls)', slug: 'kawasan-falls', region: 'Visayas', short_description: 'Canyoneering and turquoise waterfalls.', content: 'Kawasan Falls is famous for canyoneering and clear waters.' },
    { name: 'Siargao', slug: 'siargao', region: 'Mindanao', short_description: 'Surfing capital with island lagoons.', content: 'Siargao is famous for Cloud 9 surf break and laid-back vibe.' },
    { name: 'Intramuros (Manila)', slug: 'intramuros', region: 'NCR', short_description: 'Historic walled city in Manila.', content: 'Intramuros contains Fort Santiago and colonial-era churches.' },
    { name: 'Taal Volcano', slug: 'taal-volcano', region: 'Calabarzon', short_description: 'Crater lake within a volcano island.', content: 'Taal Volcano features a lake within a volcanic island.' },
    { name: 'Panglao Island (Bohol)', slug: 'panglao', region: 'Visayas', short_description: 'Beaches and diving near Bohol.', content: 'Panglao offers resorts, beaches, and diving access to coral reefs.' },
    { name: 'Davao (Eden Nature Park)', slug: 'eden-nature-park', region: 'Mindanao', short_description: 'Highland resort with nature activities.', content: 'Eden Nature Park is a cool highland retreat near Davao City.' },
    { name: 'Hundred Islands (Pangasinan)', slug: 'hundred-islands', region: 'Luzon', short_description: 'Cluster of small islands with beaches.', content: 'Hundred Islands National Park is popular for island hopping.' },
    { name: 'Fortune Island (Batangas)', slug: 'fortune-island', region: 'Calabarzon', short_description: 'Clifftop ruins and snorkeling.', content: 'Fortune Island is known for Grecian-style ruins and clear waters.' },
    { name: 'Apo Island', slug: 'apo-island', region: 'Visayas', short_description: 'Marine sanctuary for turtles and snorkeling.', content: 'Apo Island is a protected marine sanctuary with abundant turtles.' },
    { name: 'Samal Island', slug: 'samal-island', region: 'Mindanao', short_description: 'Beaches and beach resorts near Davao.', content: 'Samal Island is popular for resorts and white-sand beaches.' },
    { name: 'Camiguin', slug: 'camiguin', region: 'Mindanao', short_description: 'Small island with volcanoes and hot springs.', content: 'Camiguin offers hot springs, waterfalls, and diving.' },
    { name: 'Mt. Pulag', slug: 'mt-pulag', region: 'Cordillera', short_description: 'Highest peak in Luzon with sea-of-clouds.', content: 'Mt. Pulag is famed for its sunrise sea of clouds and trekking.' },
    { name: 'Pagudpud', slug: 'pagudpud', region: 'Ilocos', short_description: 'Beaches and coastal scenery in northern Luzon.', content: 'Pagudpud is known for its pristine beaches and windmills.' }
  ];

  try {
    console.log('Inserting destinations...');
    const { data, error } = await supabase.from('destinations').insert(destinations).select();
    if (error) throw error;
    console.log('Inserted', data.length, 'destinations');

    // Ensure single QR code pointing to whole travelogue
    const qrCode = { code: 'travelogue', label: 'Main Travelogue QR' };
    console.log('Upserting QR code...');
    const { data: qrData, error: qrError } = await supabase.from('qr_codes').upsert(qrCode, { onConflict: ['code'] }).select();
    if (qrError) throw qrError;
    console.log('QR upserted:', qrData);

    console.log('Seeding completed.');
  } catch (err) {
    console.error('Seeding error', err.message || err);
    process.exit(1);
  }
}

seed();
