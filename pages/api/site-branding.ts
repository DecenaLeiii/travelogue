import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../lib/auth';
import { logAudit } from '../../lib/audit';
import { DEFAULT_SITE_BRANDING, SiteBranding, CultureBlock, CultureBuiltIn, CULTURE_BUILT_INS } from '../../lib/siteBranding';

const BRANDING_PATH = path.join(process.cwd(), 'db', 'site_branding.json');

function cleanHidden(value: unknown): CultureBuiltIn[] {
  return Array.isArray(value) ? CULTURE_BUILT_INS.filter((key) => value.includes(key)) : [];
}

function cleanBlocks(value: unknown): CultureBlock[] {
  if (!Array.isArray(value)) return [];
  const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  return value.slice(0, 30).map((item: any, index) => ({
    id: text(item?.id, 60) || `block-${Date.now()}-${index}`,
    kind: item?.kind === 'list' || item?.kind === 'location' ? item.kind : 'text',
    title: text(item?.title, 120),
    body: text(item?.body, 2000),
    address: text(item?.address, 300),
    phone: text(item?.phone, 60),
    email: text(item?.email, 120),
    archived: item?.archived === true,
  })).filter((block) => block.title);
}

function readBranding(): SiteBranding {
  try {
    if (!fs.existsSync(BRANDING_PATH)) return DEFAULT_SITE_BRANDING;
    const value = JSON.parse(fs.readFileSync(BRANDING_PATH, 'utf8'));
    return {
      logo: typeof value.logo === 'string' && value.logo ? value.logo : DEFAULT_SITE_BRANDING.logo,
      hero_video: typeof value.hero_video === 'string' && value.hero_video ? value.hero_video : DEFAULT_SITE_BRANDING.hero_video,
      culture_hidden: cleanHidden(value.culture_hidden),
      culture_blocks: cleanBlocks(value.culture_blocks),
      hero_description: typeof value.hero_description === 'string' && value.hero_description ? value.hero_description : DEFAULT_SITE_BRANDING.hero_description,
      tourism_heading: typeof value.tourism_heading === 'string' && value.tourism_heading ? value.tourism_heading : DEFAULT_SITE_BRANDING.tourism_heading,
      tourism_description: typeof value.tourism_description === 'string' && value.tourism_description ? value.tourism_description : DEFAULT_SITE_BRANDING.tourism_description,
      mission_heading: typeof value.mission_heading === 'string' && value.mission_heading ? value.mission_heading : DEFAULT_SITE_BRANDING.mission_heading,
      mission_text: typeof value.mission_text === 'string' && value.mission_text ? value.mission_text : DEFAULT_SITE_BRANDING.mission_text,
      key_programs_heading: typeof value.key_programs_heading === 'string' && value.key_programs_heading ? value.key_programs_heading : DEFAULT_SITE_BRANDING.key_programs_heading,
      key_programs: Array.isArray(value.key_programs) && value.key_programs.length ? value.key_programs : DEFAULT_SITE_BRANDING.key_programs,
      contact_heading: typeof value.contact_heading === 'string' && value.contact_heading ? value.contact_heading : DEFAULT_SITE_BRANDING.contact_heading,
      contact_email: typeof value.contact_email === 'string' && value.contact_email ? value.contact_email : DEFAULT_SITE_BRANDING.contact_email,
      contact_phone: typeof value.contact_phone === 'string' && value.contact_phone ? value.contact_phone : DEFAULT_SITE_BRANDING.contact_phone,
    };
  } catch {
    return DEFAULT_SITE_BRANDING;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.json(readBranding());
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const current = readBranding();
  const logo = req.body?.logo === undefined ? current.logo : String(req.body.logo || '').trim();
  const hero_description = req.body?.hero_description === undefined
    ? current.hero_description
    : String(req.body.hero_description || '').trim().slice(0, 500);
  const fields = ['tourism_heading', 'tourism_description', 'mission_heading', 'mission_text', 'key_programs_heading', 'contact_heading', 'contact_email', 'contact_phone'] as const;
  const content = Object.fromEntries(fields.map((field) => [
    field,
    req.body?.[field] === undefined ? current[field] : String(req.body[field] || '').trim().slice(0, 2000),
  ]));
  const key_programs = req.body?.key_programs === undefined
    ? current.key_programs
    : Array.isArray(req.body.key_programs) ? req.body.key_programs.map((item: unknown) => String(item || '').trim().slice(0, 300)).filter(Boolean).slice(0, 20) : current.key_programs;
  if (!logo) return res.status(400).json({ error: 'Logo image is required.' });
  const hero_video = req.body?.hero_video === undefined ? current.hero_video : String(req.body.hero_video || '').trim() || DEFAULT_SITE_BRANDING.hero_video;
  if (!/^(\/[^\s]*|https?:\/\/[^\s]+)$/.test(hero_video)) return res.status(400).json({ error: 'Enter a valid video URL or upload a video.' });
  const culture_hidden = req.body?.culture_hidden === undefined ? current.culture_hidden : cleanHidden(req.body.culture_hidden);
  const culture_blocks = req.body?.culture_blocks === undefined ? current.culture_blocks : cleanBlocks(req.body.culture_blocks);
  const branding = { logo, hero_video, hero_description, ...content, key_programs, culture_hidden, culture_blocks };
  fs.writeFileSync(BRANDING_PATH, JSON.stringify(branding, null, 2));

  const describe: string[] = [];
  if (logo !== current.logo) describe.push('Changed the site logo');
  if (hero_video !== current.hero_video) describe.push('Changed the homepage video');
  if (hero_description !== current.hero_description) describe.push('Edited the homepage hero text');
  if (JSON.stringify(culture_hidden) !== JSON.stringify(current.culture_hidden)) {
    culture_hidden.filter((k) => !current.culture_hidden.includes(k)).forEach((k) => describe.push(`Hid "${k}" in Tourism & Culture`));
    current.culture_hidden.filter((k) => !culture_hidden.includes(k)).forEach((k) => describe.push(`Showed "${k}" in Tourism & Culture`));
  }
  const before = new Map(current.culture_blocks.map((b) => [b.id, b]));
  culture_blocks.forEach((b) => {
    const old = before.get(b.id);
    if (!old) describe.push(`Added Tourism & Culture category "${b.title}"`);
    else if (old.archived !== b.archived) describe.push(`${b.archived ? 'Archived' : 'Restored'} Tourism & Culture category "${b.title}"`);
    else if (JSON.stringify(old) !== JSON.stringify(b)) describe.push(`Edited Tourism & Culture category "${b.title}"`);
  });
  current.culture_blocks.filter((b) => !culture_blocks.some((n) => n.id === b.id)).forEach((b) => describe.push(`Deleted Tourism & Culture category "${b.title}"`));
  if (!describe.length && JSON.stringify({ ...current, culture_blocks: 0, culture_hidden: 0 }) !== JSON.stringify({ ...branding, culture_blocks: 0, culture_hidden: 0 })) {
    describe.push('Edited Tourism & Culture content');
  }
  for (const description of describe) {
    await logAudit({ adminId: admin.id, adminEmail: admin.email, action: 'update', entityType: 'homepage', details: { description } }).catch(() => undefined);
  }
  return res.json(branding);
}
