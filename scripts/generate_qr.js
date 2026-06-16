const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Load .env.local if present
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

const SITE = process.env.SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const code = process.argv[2] || 'travelogue';
const target = SITE.startsWith('http') ? `${SITE.replace(/\/$/, '')}/r/${code}` : `https://${SITE.replace(/\/$/, '')}/r/${code}`;

const outDir = path.resolve(process.cwd(), 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `qr-${code}.svg`);

QRCode.toString(target, { type: 'svg', width: 400 }, (err, svg) => {
  if (err) {
    console.error('QR generation failed', err);
    process.exit(1);
  }
  fs.writeFileSync(outPath, svg, 'utf8');
  console.log('QR saved to', outPath);
});
