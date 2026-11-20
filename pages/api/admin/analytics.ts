import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth';
import { dailyDestinationViews, dailyPageViews, isDashboardDate } from '../../../lib/dashboardDates';

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
  if (from && d < new Date(`${from}T00:00:00Z`).getTime()) return false;
  if (to && d >= new Date(`${to}T00:00:00Z`).getTime() + 86400000) return false;
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

async function loadAnalyticsRows(
  supabase: SupabaseClient,
  table: string,
  dateColumn?: string,
  from?: string,
  to?: string,
) {
  const rows: Record<string, any>[] = [];
  let total: number;
  do {
    let query = supabase.from(table).select('*', { count: 'exact' });
    if (dateColumn && from) query = query.gte(dateColumn, `${from}T00:00:00Z`);
    if (dateColumn && to) query = query.lt(dateColumn, new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString());
    const result = await query.order('id').range(rows.length, rows.length + 999);
    if (result.error) throw new Error(`Failed to load ${table}: ${result.error.message}`);
    if (result.count === null || !result.data) throw new Error(`Failed to count ${table}.`);
    total = result.count;
    if (!result.data.length && rows.length < total) throw new Error(`Incomplete results for ${table}.`);
    rows.push(...result.data);
  } while (rows.length < total);
  return rows;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  const { from, to } = req.query;
  if ((from !== undefined && (typeof from !== 'string' || !isDashboardDate(from)))
    || (to !== undefined && (typeof to !== 'string' || !isDashboardDate(to)))
    || (typeof from === 'string' && typeof to === 'string' && from > to)) {
    return res.status(400).json({ error: 'Enter a valid start and end date in order.' });
  }
  const destinationSlug = String(req.query.destination || '').trim().toLowerCase() || undefined;

  const fallbackData = toFallbackAnalytics();
  let remoteScans: Record<string, any>[] = [];
  let remoteEngagements: Record<string, any>[] = [];
  let remoteDestinations: Record<string, any>[] = [];
  let remoteQrCodes: Record<string, any>[] = [];
  let remoteAuditLogs: Record<string, any>[] = [];
  let remoteFeedback: Record<string, any>[] = [];
  if (supabaseAdmin) {
    try {
      [remoteScans, remoteEngagements, remoteDestinations, remoteQrCodes, remoteAuditLogs, remoteFeedback] = await Promise.all([
        loadAnalyticsRows(supabaseAdmin, 'scans'),
        loadAnalyticsRows(supabaseAdmin, 'engagements', 'created_at', from, to),
        loadAnalyticsRows(supabaseAdmin, 'destinations'),
        loadAnalyticsRows(supabaseAdmin, 'qr_codes'),
        loadAnalyticsRows(supabaseAdmin, 'audit_logs', 'created_at', from, to),
        loadAnalyticsRows(supabaseAdmin, 'destination_feedback', 'created_at', from, to),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard analytics:', error);
      return res.status(500).json({ error: 'Unable to load dashboard analytics.' });
    }
  }

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

    const path = String(e.payload?.path || '');
    const pathSlug = path.match(/\/destination\/([^/?]+)/)?.[1]?.toLowerCase();
    if (e.event_type === 'page_view') return pathSlug === destinationSlug;

    const scanId = e.scan_id || e.payload?.scan_id;
    const scanDestination = scanId ? destinationByScanId.get(String(scanId)) : '';
    if (scanDestination) return scanDestination === destinationSlug;

    return pathSlug === destinationSlug;
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

  const destMap = Object.fromEntries((destinations || []).map((d: any) => [String(d.slug || '').toLowerCase(), d.name]));
  const perDestination = Object.values(byDestination).map((row) => ({
    ...row,
    name: destMap[row.slug.toLowerCase()] || row.slug,
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
  const dailyScansBySource: Record<string, Record<string, number>> = {};
  const scanSources = new Map<string, { slug: string; name: string; views: number }>();
  for (const s of filteredScans) {
    const key = new Date(s.scanned_at || s.created_at).toISOString().slice(0, 10);
    if (!key || Number.isNaN(new Date(key).getTime())) continue;
    dailyScans[key] = (dailyScans[key] || 0) + 1;
    const slug = destinationByQrId.get(String(s.qr_id)) || '__unassigned__';
    const source = scanSources.get(slug) || {
      slug,
      name: slug === '__unassigned__' ? 'Main / unassigned QR' : destMap[slug] || slug,
      views: 0,
    };
    source.views += 1;
    scanSources.set(slug, source);
    if (!dailyScansBySource[key]) dailyScansBySource[key] = {};
    dailyScansBySource[key][slug] = (dailyScansBySource[key][slug] || 0) + 1;
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
    scanSources: Array.from(scanSources.values()),
    dailyScansBySource,
    dailyPageViews: dailyPageViews(pageViews),
    dailyDestinationViews: dailyDestinationViews(pageViews),
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
