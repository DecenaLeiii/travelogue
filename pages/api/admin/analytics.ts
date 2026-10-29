import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth';

const LOCAL_SCANS_PATH = path.join(process.cwd(), 'db', 'local_scans.json');
const LOCAL_ENGAGEMENTS_PATH = path.join(process.cwd(), 'db', 'local_engagements.json');
const LOCAL_FEEDBACK_PATH = path.join(process.cwd(), 'db', 'destination_feedback_local.json');
const LOCAL_DESTINATIONS_PATH = path.join(process.cwd(), 'db', 'destinations_full.json');

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function inRange(dateStr: string | undefined, from?: string, to?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to + 'T23:59:59').getTime()) return false;
  return true;
}

function sortByNewest<T extends Record<string, unknown>>(rows: T[], field: string) {
  return [...rows].sort((a, b) => {
    const aDate = new Date(String(a[field] || 0)).getTime();
    const bDate = new Date(String(b[field] || 0)).getTime();
    return bDate - aDate;
  });
}

function toFallbackAnalytics() {
  const localScans = readJsonFile<any[]>(LOCAL_SCANS_PATH, []);
  const localEngagements = readJsonFile<any[]>(LOCAL_ENGAGEMENTS_PATH, []);
  const localFeedback = readJsonFile<any[]>(LOCAL_FEEDBACK_PATH, []);
  const localDestinations = readJsonFile<any[]>(LOCAL_DESTINATIONS_PATH, []);

  return {
    scans: localScans,
    engagements: localEngagements,
    destinations: localDestinations,
    feedback: localFeedback,
    auditLogs: [],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const destinationSlug = String(req.query.destination || '').trim().toLowerCase() || undefined;

  const fallbackData = toFallbackAnalytics();
  const queries = supabaseAdmin
    ? await Promise.allSettled([
        supabaseAdmin.from('scans').select('*').order('scanned_at', { ascending: false }).limit(5000),
        supabaseAdmin.from('engagements').select('*').order('created_at', { ascending: false }).limit(10000),
        supabaseAdmin.from('destinations').select('id,name,slug'),
        supabaseAdmin.from('qr_codes').select('id,destination_id'),
        supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
        supabaseAdmin.from('destination_feedback').select('*').order('created_at', { ascending: false }).limit(200),
      ])
    : [];

  const remoteScans = queries[0]?.status === 'fulfilled' ? (queries[0].value?.data || []) : [];
  const remoteEngagements = queries[1]?.status === 'fulfilled' ? (queries[1].value?.data || []) : [];
  const remoteDestinations = queries[2]?.status === 'fulfilled' ? (queries[2].value?.data || []) : [];
  const remoteQrCodes = queries[3]?.status === 'fulfilled' ? (queries[3].value?.data || []) : [];
  const remoteAuditLogs = queries[4]?.status === 'fulfilled' ? (queries[4].value?.data || []) : [];
  const remoteFeedback = queries[5]?.status === 'fulfilled' ? (queries[5].value?.data || []) : [];

  const scans = sortByNewest<any>([...(remoteScans || []), ...(fallbackData.scans || [])], 'scanned_at');
  const engagements = sortByNewest<any>([...(remoteEngagements || []), ...(fallbackData.engagements || [])], 'created_at');
  const destinations = (remoteDestinations?.length ? remoteDestinations : fallbackData.destinations || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
  }));
  const destinationById = new Map(destinations.map((d: any) => [String(d.id), String(d.slug || '').toLowerCase()]));
  const destinationByQrId = new Map(
    remoteQrCodes.map((qr: any) => [String(qr.id), destinationById.get(String(qr.destination_id)) || ''])
  );
  const destinationByScanId = new Map(
    scans.map((scan: any) => [String(scan.id), destinationByQrId.get(String(scan.qr_id)) || ''])
  );
  const auditLogs = sortByNewest<any>([...(remoteAuditLogs || []), ...(fallbackData.auditLogs || [])], 'created_at');
  const feedbackEntries = sortByNewest<any>([...(remoteFeedback || []), ...(fallbackData.feedback || [])], 'created_at');

  const filteredScans = scans.filter((s) => {
    if (!inRange(s.scanned_at, from, to)) return false;
    if (destinationSlug && destinationByQrId.get(String(s.qr_id)) !== destinationSlug) return false;
    return true;
  });
  const filteredEngagements = engagements.filter((e) => {
    if (!inRange(e.created_at, from, to)) return false;
    if (!destinationSlug) return true;

    const scanId = e.scan_id || e.payload?.scan_id;
    const scanDestination = scanId ? destinationByScanId.get(String(scanId)) : '';
    if (scanDestination) return scanDestination === destinationSlug;

    const path = String(e.payload?.path || '');
    return path.match(/\/destination\/([^/?]+)/)?.[1]?.toLowerCase() === destinationSlug;
  });
  const filteredFeedback = feedbackEntries.filter((entry) => {
    if (!inRange(entry.created_at, from, to)) return false;
    if (destinationSlug && String(entry.destination_slug || '').toLowerCase() !== destinationSlug) return false;
    return true;
  });

  const uniqueVisitors = new Set(
    filteredScans.map((s) => s.visitor_id || s.ip_address || s.id).filter(Boolean)
  ).size;

  const pageViews = filteredEngagements.filter((e) => e.event_type === 'page_view');
  const timeEvents = filteredEngagements.filter((e) => e.event_type === 'time_spent');

  const totalTimeSeconds = timeEvents.reduce(
    (sum, e) => sum + (Number(e.payload?.seconds) || 0),
    0
  );

  const byDestination: Record<string, { views: number; timeSeconds: number; slug: string }> = {};
  for (const e of pageViews) {
    const path = String(e.payload?.path || '');
    const match = path.match(/\/destination\/([^/?]+)/);
    if (!match) continue;
    const slug = match[1];
    if (destinationSlug && slug.toLowerCase() !== destinationSlug) continue;
    if (!byDestination[slug]) byDestination[slug] = { views: 0, timeSeconds: 0, slug };
    byDestination[slug].views += 1;
  }
  for (const e of timeEvents) {
    const path = String(e.payload?.path || '');
    const match = path.match(/\/destination\/([^/?]+)/);
    if (!match) continue;
    const slug = match[1];
    if (destinationSlug && slug.toLowerCase() !== destinationSlug) continue;
    if (!byDestination[slug]) byDestination[slug] = { views: 0, timeSeconds: 0, slug };
    byDestination[slug].timeSeconds += Number(e.payload?.seconds) || 0;
  }

  const destMap = Object.fromEntries((destinations || []).map((d: any) => [d.slug, d.name]));
  const perDestination = Object.values(byDestination).map((row) => ({
    ...row,
    name: destMap[row.slug] || row.slug,
  }));

  type Breakdown = {
    slug: string;
    name: string;
    scans: number;
    uniqueVisitors: Set<string>;
    pageViews: number;
    totalTimeSeconds: number;
  };

  const breakdown = new Map<string, Breakdown>();
  const getBreakdown = (slug: string, name: string) => {
    if (!breakdown.has(slug)) {
      breakdown.set(slug, {
        slug,
        name,
        scans: 0,
        uniqueVisitors: new Set<string>(),
        pageViews: 0,
        totalTimeSeconds: 0,
      });
    }
    return breakdown.get(slug)!;
  };

  getBreakdown('__main__', 'Main Travelogue QR');
  for (const destination of destinations) {
    const slug = String(destination.slug || '').toLowerCase();
    if (slug) getBreakdown(slug, destination.name || slug);
  }

  const groupByScanId = new Map<string, string>();
  for (const scan of filteredScans) {
    const slug = destinationByQrId.get(String(scan.qr_id)) || '__main__';
    groupByScanId.set(String(scan.id), slug);
    const row = getBreakdown(slug, slug === '__main__' ? 'Main Travelogue QR' : destMap[slug] || slug);
    row.scans += 1;
    const visitor = scan.visitor_id || scan.ip_address || scan.id;
    if (visitor) row.uniqueVisitors.add(String(visitor));
  }

  for (const engagement of filteredEngagements) {
    const path = String(engagement.payload?.path || '');
    const pathSlug = path.match(/\/destination\/([^/?]+)/)?.[1]?.toLowerCase();
    const slug = (engagement.scan_id || engagement.payload?.scan_id)
      ? groupByScanId.get(String(engagement.scan_id || engagement.payload?.scan_id)) || pathSlug || '__main__'
      : pathSlug || '__main__';
    const row = getBreakdown(slug, slug === '__main__' ? 'Main Travelogue QR' : destMap[slug] || slug);
    if (engagement.event_type === 'page_view') row.pageViews += 1;
    if (engagement.event_type === 'time_spent') row.totalTimeSeconds += Number(engagement.payload?.seconds) || 0;
  }

  const destinationBreakdown = Array.from(breakdown.values()).map((row) => ({
    ...row,
    uniqueVisitors: row.uniqueVisitors.size,
  }));

  const dailyScans: Record<string, number> = {};
  for (const s of filteredScans) {
    const key = new Date(s.scanned_at || s.created_at).toISOString().slice(0, 10);
    if (!key || Number.isNaN(new Date(key).getTime())) continue;
    dailyScans[key] = (dailyScans[key] || 0) + 1;
  }

  return res.json({
    totals: {
      scans: filteredScans.length,
      uniqueVisitors,
      pageViews: pageViews.length,
      totalTimeSeconds,
      destinations: destinationSlug
        ? destinations.filter((destination: any) => String(destination.slug || '').toLowerCase() === destinationSlug).length
        : (destinations || []).length,
      feedbackCount: filteredFeedback.length,
    },
    perDestination,
    destinationBreakdown,
    dailyScans,
    recentScans: filteredScans.slice(0, 50),
    recentEngagements: filteredEngagements.slice(0, 50),
    auditLogs: auditLogs.slice(0, 50),
    feedbackEntries: filteredFeedback.slice(0, 50),
    assistantFeedback: (() => {
      const items = filteredEngagements.filter((e: any) => e.event_type === 'assistant_feedback');
      return {
        up: items.filter((e: any) => e.payload?.rating === 'up').length,
        down: items.filter((e: any) => e.payload?.rating === 'down').length,
        recent: items.slice(0, 20).map((e: any) => ({
          created_at: e.created_at,
          rating: e.payload?.rating,
          question: e.payload?.question,
          reply: e.payload?.reply,
          lang: e.payload?.lang,
          destination: e.payload?.destination,
        })),
      };
    })(),
  });
}
