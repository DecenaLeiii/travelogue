const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const i = line.indexOf('=');
    if (i === -1) return;
    const k = line.substring(0, i).trim();
    const v = line.substring(i + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!process.env[k]) process.env[k] = v;
  });
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { data, error } = await supabase.from('destinations').select('id,name,slug').order('created_at', { ascending: true }).limit(100);
  if (error) {
    console.error('Query error', error);
    process.exit(1);
  }
  console.log('Found', (data || []).length, 'destinations');
  (data || []).forEach((d, i) => console.log(i + 1, d.slug, '-', d.name));
}

run().catch((e) => { console.error(e); process.exit(1); });
