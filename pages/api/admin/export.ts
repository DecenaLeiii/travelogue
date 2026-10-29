import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth';

const EXPORT_CONFIG = {
  scans: {
    query: (supabaseAdmin: any) => supabaseAdmin.from('scans').select('*').order('scanned_at', { ascending: false }).limit(1000),
    columns: ['id', 'qr_id', 'scanned_at', 'session_ended_at', 'visitor_id', 'user_agent', 'ip_address', 'referrer'],
  },
  engagements: {
    query: (supabaseAdmin: any) => supabaseAdmin.from('engagements').select('*').order('created_at', { ascending: false }).limit(5000),
    columns: ['id', 'scan_id', 'event_type', 'payload', 'created_at'],
  },
  audit_logs: {
    query: (supabaseAdmin: any) => supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
    columns: ['id', 'admin_id', 'admin_email', 'action', 'entity_type', 'entity_id', 'details', 'created_at'],
  },
  destination_feedback: {
    query: (supabaseAdmin: any) => supabaseAdmin.from('destination_feedback').select('*').order('created_at', { ascending: false }).limit(1000),
    columns: ['id', 'destination_slug', 'rating', 'comment', 'created_at'],
  },
};

function formatCsvValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function toCSV(rows: any[], columns: string[]) {
  if (!rows || rows.length === 0) {
    return columns.join('\r\n') === '' ? '' : [columns.join(','), ''].join('\r\n');
  }

  const lines = rows.map((row) => columns.map((key) => formatCsvValue(row[key] ?? '')).join(','));
  return [columns.join(','), ...lines].join('\r\n');
}

type SummaryRow = {
  destination: string;
  period: string;
  total_scans: number;
  unique_visitors: number;
  page_views: number;
  time_on_site_seconds: number;
  time_on_site_minutes: number;
};

function inRange(value: string, from?: string, to?: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  if (from && time < new Date(`${from}T00:00:00Z`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999Z`).getTime()) return false;
  return true;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function periodStart(date: Date, granularity: 'day' | 'week' | 'month') {
  const value = new Date(date);
  if (granularity === 'day') return value.toISOString().slice(0, 10);
  if (granularity === 'month') return value.toISOString().slice(0, 7);

  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

function buildSummary(
  scans: any[],
  engagements: any[],
  qrCodes: any[],
  destinations: any[],
  from: string,
  to: string,
  selectedSlugs: string[],
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const validScans = scans.filter((scan) => inRange(scan.scanned_at, from, to));
  const validEngagements = engagements.filter((event) => inRange(event.created_at, from, to));
  const destinationById = new Map(destinations.map((destination) => [String(destination.id), destination]));
  const destinationByQrId = new Map(qrCodes.map((qr) => [String(qr.id), destinationById.get(String(qr.destination_id))]));
  const destinationByScanId = new Map(validScans.map((scan) => [String(scan.id), destinationByQrId.get(String(scan.qr_id))]));
  const destinationName = (destination: any) => destination?.name || 'Main Travelogue QR';
  const pageViewEvents = validEngagements.filter((event) => event.event_type === 'page_view');
  const timeEvents = validEngagements.filter((event) => event.event_type === 'time_spent');
  const timeOnSite = timeEvents.reduce((sum, event) => sum + (Number(event.payload?.seconds) || 0), 0);

  const totalVisitors = new Set(validScans.map((scan) => scan.visitor_id || scan.ip_address || scan.id).filter(Boolean)).size;
  rows.push({
    destination: 'All destinations',
    period: `Total: ${from} to ${to}`,
    total_scans: validScans.length,
    unique_visitors: totalVisitors,
    page_views: pageViewEvents.length,
    time_on_site_seconds: timeOnSite,
    time_on_site_minutes: Math.round(timeOnSite / 60),
  });

  for (const granularity of ['day', 'week', 'month'] as const) {
    const groups = new Map<string, { scans: any[]; pageViews: number; timeSeconds: number }>();
    if (granularity === 'day') {
      for (let date = from; date <= to; date = addDays(date, 1)) {
        groups.set(date, { scans: [], pageViews: 0, timeSeconds: 0 });
      }
    }
    for (const scan of validScans) {
      const key = periodStart(new Date(scan.scanned_at), granularity);
      if (!groups.has(key)) groups.set(key, { scans: [], pageViews: 0, timeSeconds: 0 });
      groups.get(key)!.scans.push(scan);
    }
    for (const event of validEngagements) {
      if (event.event_type !== 'page_view') continue;
      const key = periodStart(new Date(event.created_at), granularity);
      if (!groups.has(key)) groups.set(key, { scans: [], pageViews: 0, timeSeconds: 0 });
      groups.get(key)!.pageViews += 1;
    }
    for (const event of timeEvents) {
      const key = periodStart(new Date(event.created_at), granularity);
      if (!groups.has(key)) groups.set(key, { scans: [], pageViews: 0, timeSeconds: 0 });
      groups.get(key)!.timeSeconds += Number(event.payload?.seconds) || 0;
    }
    Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([period, group]) => {
      rows.push({
        destination: 'All destinations',
        period: `${granularity === 'day' ? 'Day' : granularity === 'week' ? 'Week of' : 'Month'}: ${period}`,
        total_scans: group.scans.length,
        unique_visitors: new Set(group.scans.map((scan) => scan.visitor_id || scan.ip_address || scan.id).filter(Boolean)).size,
        page_views: group.pageViews,
        time_on_site_seconds: group.timeSeconds,
        time_on_site_minutes: Math.round(group.timeSeconds / 60),
      });
    });
  }

  const chosenDestinations = destinations.filter((destination) => !selectedSlugs.length || selectedSlugs.includes(String(destination.slug).toLowerCase()));
  for (const destination of chosenDestinations.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
    const slug = String(destination.slug).toLowerCase();
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const destinationScans = validScans.filter((scan) =>
        periodStart(new Date(scan.scanned_at), 'day') === date &&
        String(destinationByScanId.get(String(scan.id))?.slug || '').toLowerCase() === slug
      );
      const destinationEvents = validEngagements.filter((event) => {
        if (periodStart(new Date(event.created_at), 'day') !== date) return false;
        const scanDestination = event.scan_id ? destinationByScanId.get(String(event.scan_id)) : undefined;
        const pathSlug = String(event.payload?.path || '').match(/\/destination\/([^/?]+)/)?.[1]?.toLowerCase();
        return String(scanDestination?.slug || pathSlug || '').toLowerCase() === slug;
      });
      const timeSeconds = destinationEvents
        .filter((event) => event.event_type === 'time_spent')
        .reduce((sum, event) => sum + (Number(event.payload?.seconds) || 0), 0);
      rows.push({
        destination: destination.name,
        period: `Day: ${date}`,
        total_scans: destinationScans.length,
        unique_visitors: new Set(destinationScans.map((scan) => scan.visitor_id || scan.ip_address || scan.id).filter(Boolean)).size,
        page_views: destinationEvents.filter((event) => event.event_type === 'page_view').length,
        time_on_site_seconds: timeSeconds,
        time_on_site_minutes: Math.round(timeSeconds / 60),
      });
    }
  }

  return rows;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).end();

  const table = String(req.query.table || '').trim();
  const selectedTable = table || 'all';
  const from = String(req.query.from || '').trim() || undefined;
  const to = String(req.query.to || '').trim() || undefined;
  const selectedSlugs = String(req.query.destinations || '').split(',').map((slug) => slug.trim().toLowerCase()).filter(Boolean).slice(0, 5);

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return res.status(500).json({ error: 'server misconfiguration' });

    const tables = Object.keys(EXPORT_CONFIG) as Array<keyof typeof EXPORT_CONFIG>;

    if (selectedTable !== 'all' && !tables.includes(selectedTable as keyof typeof EXPORT_CONFIG)) {
      return res.status(400).json({ error: 'Invalid export table parameter' });
    }

    if (selectedTable !== 'all') {
      const config = EXPORT_CONFIG[selectedTable as keyof typeof EXPORT_CONFIG];
      const { data } = await config.query(supabaseAdmin);
      const csv = toCSV(data || [], config.columns);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="travelogue_${selectedTable}.csv"`);
      res.send(`\uFEFF${csv}`);
      return;
    }

    const [{ data: scans }, { data: engagements }, { data: qrCodes }, { data: destinations }] = await Promise.all([
      supabaseAdmin.from('scans').select('scanned_at,visitor_id,ip_address,id,qr_id').order('scanned_at', { ascending: true }).limit(10000),
      supabaseAdmin.from('engagements').select('event_type,created_at,scan_id,payload').order('created_at', { ascending: true }).limit(20000),
      supabaseAdmin.from('qr_codes').select('id,destination_id'),
      supabaseAdmin.from('destinations').select('id,name,slug'),
    ]);

    const activityDates = [...(scans || []).map((scan) => scan.scanned_at), ...(engagements || []).map((event) => event.created_at)]
      .filter((value) => !Number.isNaN(new Date(value).getTime()))
      .sort();
    const latestDate = to || activityDates[activityDates.length - 1]?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const effectiveFrom = from || addDays(latestDate, -30);
    const effectiveTo = to || latestDate;
    const rangeDays = Math.floor((new Date(`${effectiveTo}T00:00:00Z`).getTime() - new Date(`${effectiveFrom}T00:00:00Z`).getTime()) / 86400000) + 1;
    if (Number.isNaN(rangeDays) || rangeDays < 1) return res.status(400).json({ error: 'The export date range is invalid.' });
    if (rangeDays > 31) return res.status(400).json({ error: 'Please export a maximum of 31 days at a time.' });

    const csv = toCSV(buildSummary(scans || [], engagements || [], qrCodes || [], destinations || [], effectiveFrom, effectiveTo, selectedSlugs), [
      'destination',
      'period',
      'total_scans',
      'unique_visitors',
      'page_views',
      'time_on_site_seconds',
      'time_on_site_minutes',
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="travelogue_analytics_summary.csv"');
    res.send(`\uFEFF${csv}`);
  } catch (e) {
    console.error('Export error', e);
    res.status(500).json({ error: 'export failed' });
  }
}
