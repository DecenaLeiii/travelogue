const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
  const fullPath = path.join(process.cwd(), 'db', 'destinations_full.json');
  let destinations;

  if (fs.existsSync(fullPath)) {
    destinations = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`Loading ${destinations.length} destinations from destinations_full.json`);
  } else {
    destinations = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'db', 'seed_destinations.json'), 'utf8'));
  }

  try {
    console.log('Upserting destinations...');
    for (const dest of destinations) {
      const { error } = await supabase.from('destinations').upsert(
        { ...dest, updated_at: new Date().toISOString() },
        { onConflict: 'slug' }
      );
      if (error) console.warn(`Warning for ${dest.slug}:`, error.message);
    }
    console.log('Destinations upserted.');

    const qrCode = { code: 'travelogue', label: 'Main Travelogue QR' };
    console.log('Upserting QR code...');
    const { data: qrData, error: qrError } = await supabase.from('qr_codes').upsert(qrCode, { onConflict: 'code' }).select();
    if (qrError) throw qrError;
    console.log('QR upserted:', qrData);

    console.log('Seeding completed.');
  } catch (err) {
    console.error('Seeding error', err.message || err);
    process.exit(1);
  }
}

seed();
