import fs from 'fs';
import path from 'path';
import getSupabaseAdmin from './supabaseAdmin';

type Engagement = {
  event_type?: string;
  payload?: { path?: string };
};

function readLocalEngagements(): Engagement[] {
  const filePath = path.join(process.cwd(), 'db', 'local_engagements.json');
  try {
    if (!fs.existsSync(filePath)) return [];
    const rows: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(rows) ? rows as Engagement[] : [];
  } catch (error) {
    console.warn('Failed to read local engagement events:', error);
    return [];
  }
}

function getDestinationSlug(event: Engagement): string | null {
  if (event.event_type !== 'page_view' || typeof event.payload?.path !== 'string') return null;
  const match = event.payload.path.match(/^\/destination\/([^/?#]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
}

export async function getDestinationViewCounts(): Promise<Map<string, number>> {
  const supabaseAdmin = getSupabaseAdmin();
  let engagements: Engagement[] = [];

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('engagements')
      .select('event_type,payload')
      .eq('event_type', 'page_view')
      .limit(20000);

    if (error) {
      console.warn('Failed to load destination views from Supabase:', error.message);
      engagements = readLocalEngagements();
    } else {
      engagements = [...(data || []), ...readLocalEngagements()];
    }
  } else {
    engagements = readLocalEngagements();
  }

  const viewCounts = new Map<string, number>();
  for (const engagement of engagements) {
    const slug = getDestinationSlug(engagement);
    if (slug) viewCounts.set(slug, (viewCounts.get(slug) || 0) + 1);
  }
  return viewCounts;
}
