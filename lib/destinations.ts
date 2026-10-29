import fs from 'fs';
import path from 'path';
import getSupabaseAdmin from './supabaseAdmin';

function normalizeImagePath(src?: string) {
  return src ? src.replace(/ /g, '%20') : '';
}

export type Destination = {
  id?: string;
  name: string;
  slug: string;
  region?: string;
  location?: string;
  short_description?: string;
  qr_code?: string | null;
  content?: string;
  best_time_to_visit?: string;
  highlights?: string[];
  travel_tips?: string[];
  local_foods?: { name: string; description?: string; image?: string }[];
  destination_categories?: { title: string; items: { name: string; description?: string; image?: string }[] }[];
  images?: string[];
  related_slugs?: string[];
  featured?: boolean;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
};

export const DESCRIPTION_MAP: Record<string, string> = {
  boracay: 'boracay',
  'el-nido': 'palawan',
  coron: 'coron',
  'chocolate-hills': 'bohol',
  panglao: 'bohol',
  'banaue-rice-terraces': 'banaue',
  vigan: 'vigan',
  'mayon-volcano': 'bicol',
  'kawasan-falls': 'cebu',
  siargao: 'siargao',
  intramuros: 'manila',
  'taal-volcano': 'batangas',
  'eden-nature-park': 'davao city',
  'apo-island': 'dumaguete',
  camiguin: 'camiguin',
  baguio: 'baguio',
  sagada: 'sagada',
  bohol: 'bohol',
  cebu: 'cebu',
  palawan: 'palawan',
  davao: 'davao city',
};

function loadDescriptions(): Record<string, string> {
  try {
    const p = path.join(process.cwd(), 'db', 'destination_descriptions.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* ignore */
  }
  return {};
}

function loadFullSeed(): Destination[] {
  try {
    const p = path.join(process.cwd(), 'db', 'destinations_full.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* ignore */
  }
  return [];
}

function loadBasicSeed(): Destination[] {
  try {
    const p = path.join(process.cwd(), 'db', 'seed_destinations.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* ignore */
  }
  return [];
}

export function enrichDestination(dest: Destination): Destination {
  const full = loadFullSeed().find((d) => d.slug === dest.slug);
  if (full) {
    // Prefer values from the database (`dest`) over the local full seed so
    // admin edits persist on the public site. Local seed remains a
    // fallback for missing fields.
    return {
      ...full,
      ...dest,
      id: dest.id || full.id || dest.slug,
      images: (dest.images && dest.images.length)
        ? dest.images.map(normalizeImagePath)
        : (full.images?.length ? full.images.map(normalizeImagePath) : ['/hero.svg']),
      published: dest.published !== undefined ? dest.published : (full.published !== false),
    };
  }

  const descMap = loadDescriptions();
  const descKey = DESCRIPTION_MAP[dest.slug];
  const extended = descKey ? descMap[descKey] : undefined;

  return {
    ...dest,
    id: dest.id || dest.slug,
    content: dest.content || extended || '',
    highlights: dest.highlights || [],
    travel_tips: dest.travel_tips || [],
    images: dest.images?.length ? dest.images.map(normalizeImagePath) : ['/hero.svg'],
    related_slugs: dest.related_slugs || [],
    published: dest.published !== false,
  };
}

export function getLocalDestinations(): Destination[] {
  const full = loadFullSeed();
  if (full.length) return full.map(enrichDestination);
  return loadBasicSeed().map(enrichDestination);
}

export async function getDestinationBySlug(slug: string): Promise<Destination | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .limit(1);
    if (!error && data?.[0]) {
      const destination = enrichDestination(data[0]);
      if (destination.id) {
        const { data: qrRows, error: qrError } = await supabaseAdmin
          .from('qr_codes')
          .select('code')
          .eq('destination_id', destination.id)
          .limit(1);
        if (!qrError && qrRows?.[0]?.code) {
          destination.qr_code = qrRows[0].code;
        }
      }
      return destination;
    }
  }
  const local = getLocalDestinations().find((d) => d.slug === slug);
  return local ? enrichDestination(local) : null;
}

async function attachQrCodesToDestinations(dests: Destination[]): Promise<Destination[]> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return dests;
  const ids = dests.map((d) => d.id).filter(Boolean) as string[];
  if (!ids.length) return dests;

  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .select('destination_id,code')
    .in('destination_id', ids);
  if (error || !data) return dests;

  const map = Object.fromEntries(data.map((qr: any) => [qr.destination_id, qr.code]));
  return dests.map((dest) => ({
    ...dest,
    qr_code: dest.id ? map[dest.id] ?? dest.qr_code ?? null : dest.qr_code ?? null,
  }));
}

export async function getPublishedDestinations(): Promise<Destination[]> {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('destinations')
      .select('*')
      .eq('published', true)
      .order('featured', { ascending: false })
      .order('name');
    if (!error && data?.length) {
      const destinations = data.map(enrichDestination);
      return attachQrCodesToDestinations(destinations);
    }
    // Fallback if published column missing or table empty
    if (error) console.warn('Supabase destinations query failed, using local data:', error.message);
  }
  return getLocalDestinations()
    .filter((d) => d.published !== false)
    .map((d) => ({ ...d, qr_code: d.qr_code ?? null }));
}

export async function getRelatedDestinations(slugs: string[]): Promise<Destination[]> {
  if (!slugs.length) return [];
  const all = await getPublishedDestinations();
  return slugs.map((s) => all.find((d) => d.slug === s)).filter(Boolean) as Destination[];
}

export function parseContentSections(content: string) {
  const lines = (content || '').split('\n').filter(Boolean);
  const overview = lines.slice(0, 3).join('\n');
  return { overview, full: content || '' };
}
