import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../lib/i18n';
import getSupabaseAdmin from '../../lib/supabaseAdmin';
import { verifyAdmin } from '../../lib/auth';
import { buildEngagementChart } from '../../lib/engagementChart';
import { chartDateBuckets, sumBucket } from '../../lib/dashboardDates';

type Analytics = {
  totals: {
    scans: number;
    uniqueVisitors: number;
    pageViews: number;
    totalTimeSeconds: number;
    destinations: number;
  };
  perDestination: { slug: string; name: string; views: number; timeSeconds: number }[];
  destinationBreakdown: {
    slug: string;
    name: string;
    scans: number;
    uniqueVisitors: number;
    pageViews: number;
    totalTimeSeconds: number;
  }[];
  dailyScans: Record<string, number>;
  dailyPageViews: Record<string, number>;
  scanSources?: { slug: string; name: string; views: number }[];
  dailyScansBySource?: Record<string, Record<string, number>>;
  dailyDestinationViews: Record<string, Record<string, number>>;
  recentScans: any[];
  recentEngagements: any[];
  auditLogs: any[];
  assistantFeedback?: { up: number; down: number; recent: { created_at: string | null; rating: string | null; question: string; lang: string }[] };
};

type Props = {
  analytics: Analytics | null;
  error?: string;
};

function formatAuditDetails(details: any) {
  if (!details) return 'No details available.';
  if (typeof details === 'string') return details;
  if (details.description) return details.description;
  if (details.fields) {
    const fields = Array.isArray(details.fields) ? details.fields.join(', ') : String(details.fields);
    return `Updated fields: ${fields}.`;
  }
  if (details.slug && details.name) return `Created destination "${details.name}" (${details.slug}).`;
  if (details.destination_id && details.code) return `Created QR code "${details.code}" for destination ${details.destination_id}.`;
  return JSON.stringify(details);
}

function formatChartDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function AdminDashboard({ analytics, error: initialError }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [data, setData] = useState<Analytics | null>(analytics);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportDestinations, setExportDestinations] = useState<{ name: string; slug: string }[]>([]);
  const [homepageDestinations, setHomepageDestinations] = useState<{ name: string; slug: string }[]>([]);
  const [homepageSelectedSlugs, setHomepageSelectedSlugs] = useState<string[]>([]);
  const [homepageSelectionStatus, setHomepageSelectionStatus] = useState('');
  const [savingHomepageSelection, setSavingHomepageSelection] = useState(false);
  const [selectedExportDestinations, setSelectedExportDestinations] = useState<string[]>([]);
  const [exportAllDestinations, setExportAllDestinations] = useState(true);
  const [destination, setDestination] = useState('');
  const [appliedDestination, setAppliedDestination] = useState('');
  const [filterVersion, setFilterVersion] = useState(0);
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });
  const [error, setError] = useState(initialError || '');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'scans' | 'pageViews'>('pageViews');

  useEffect(() => {
    if (from && to && from > to) {
      setAnalyticsLoading(false);
      setError('Start date must be on or before end date.');
      return;
    }
    const controller = new AbortController();
    setAnalyticsLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (appliedDestination) params.set('destination', appliedDestination);
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/analytics?${params}`, { signal: controller.signal });
        if (res.status === 401) { await router.push('/admin/login'); return; }
        if (!res.ok) throw new Error(t('failedToLoad'));
        const result = await res.json();
        if (controller.signal.aborted) return;
        setData(result);
        setAppliedRange({ from, to });
        setError('');
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Failed to load dashboard analytics:', loadError);
        setError(loadError instanceof Error ? loadError.message : t('failedToLoad'));
      } finally {
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [from, to, appliedDestination, filterVersion, router, t]);

  useEffect(() => {
    fetch('/api/admin/destinations')
      .then((response) => response.json())
      .then((json) => setExportDestinations((json.destinations || []).map((item: any) => ({ name: item.name, slug: item.slug }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const loadHomepageSelection = async () => {
      try {
        const response = await fetch('/api/admin/homepage-most-viewed');
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        if (!response.ok) throw new Error('Failed to load homepage destination settings.');
        const settings = await response.json();
        if (!active) return;
        setHomepageDestinations(Array.isArray(settings.destinations) ? settings.destinations : []);

        if (Array.isArray(settings.selectedSlugs)) {
          setHomepageSelectedSlugs(settings.selectedSlugs);
          return;
        }

        const currentResponse = await fetch('/api/destinations/most-viewed');
        if (!currentResponse.ok) throw new Error('Failed to load current homepage destinations.');
        const current = await currentResponse.json();
        if (active) {
          setHomepageSelectedSlugs(
            Array.isArray(current.destinations)
              ? current.destinations.map((item: { slug: string }) => item.slug)
              : []
          );
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) setHomepageSelectionStatus('Could not load homepage destination settings.');
      }
    };
    loadHomepageSelection();
    return () => { active = false; };
  }, [router]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const exportParams = new URLSearchParams();
  if (exportFrom) exportParams.set('from', exportFrom);
  if (exportTo) exportParams.set('to', exportTo);
  if (!exportAllDestinations && selectedExportDestinations.length) exportParams.set('destinations', selectedExportDestinations.join(','));
  const exportHref = `/api/admin/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
  const exportRangeDays = exportFrom && exportTo
    ? Math.floor((new Date(`${exportTo}T00:00:00`).getTime() - new Date(`${exportFrom}T00:00:00`).getTime()) / 86400000) + 1
    : 31;
  const exportRangeTooLong = exportRangeDays > 31;
  const exportDatesMissing = !exportFrom || !exportTo;
  const exportScopeInvalid = !exportAllDestinations && selectedExportDestinations.length === 0;

  const availableDates = [...Object.keys(data?.dailyScans || {}), ...Object.keys(data?.dailyPageViews || {})].sort();
  const today = new Date().toISOString().slice(0, 10);
  let chartStart = appliedRange.from || availableDates[0] || appliedRange.to || today;
  let chartEnd = appliedRange.to || availableDates[availableDates.length - 1] || appliedRange.from || today;
  if (chartStart > chartEnd && !appliedRange.from) chartStart = chartEnd;
  if (chartStart > chartEnd && !appliedRange.to) chartEnd = chartStart;
  const chartBuckets = chartDateBuckets(chartStart, chartEnd);
  const scanEntries = chartBuckets.map((bucket) => [bucket.start, sumBucket(data?.dailyScans || {}, bucket.start, bucket.end)] as [string, number]);
  const dailyEntries = chartMetric === 'scans'
    ? scanEntries
    : chartBuckets.map((bucket) => [bucket.start, sumBucket(data?.dailyPageViews || {}, bucket.start, bucket.end)] as [string, number]);
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);
  const maxScans = Math.max(...scanEntries.map(([, value]) => value), 1);
  const topDestinations = data ? [...data.perDestination].sort((a, b) => b.views - a.views).slice(0, 6) : [];
  const engagementChart = buildEngagementChart(chartMetric === 'scans' ? data?.scanSources || [] : data?.perDestination || []);
  const strongestDestination = engagementChart.segments[0];
  const activeSegment = engagementChart.segments.find((segment) => segment.slug === (hoveredSegment || selectedSegment));
  const dailyViews = chartMetric === 'scans' ? data?.dailyScansBySource || {} : data?.dailyDestinationViews || {};
  const metricUnit = chartMetric === 'scans' ? 'scans' : 'views';
  const destinationSeries = engagementChart.segments.map((segment) => {
    const countsByDate = Object.fromEntries(Object.entries(dailyViews).map(([date, counts]) => [date, counts[segment.slug] || 0]));
    return { ...segment, counts: chartBuckets.map((bucket) => sumBucket(countsByDate, bucket.start, bucket.end)) };
  });
  const maxDestinationViews = Math.max(1, ...destinationSeries.flatMap((series) => series.counts));
  const metricTrend = scanEntries.length > 1
    ? ((scanEntries[scanEntries.length - 1][1] - scanEntries[0][1]) / Math.max(scanEntries[0][1], 1)) * 100
    : 0;

  const sparklinePoints = scanEntries.length
    ? scanEntries
        .map(([, value], index) => {
          const x = (index / Math.max(scanEntries.length - 1, 1)) * 100;
          const y = 100 - (value / maxScans) * 100;
          return `${x},${y}`;
        })
        .join(' ')
    : '0,100 100,100';

  const metricLabels: Record<string, string> = {
    scans: t('qrScans'),
    uniqueVisitors: t('uniqueVisitors'),
    pageViews: t('pageViews'),
    totalTimeSeconds: t('timeOnSite'),
  };
  const selectedMetricLabel = selectedMetric ? metricLabels[selectedMetric] : '';
  const selectedBreakdown = data?.destinationBreakdown || [];
  const homepageDestinationViews = new Map(data?.perDestination.map((item) => [item.slug.toLowerCase(), item.views]) || []);

  const toggleHomepageDestination = (slug: string) => {
    setHomepageSelectedSlugs((current) => {
      if (current.includes(slug)) {
        if (current.length <= 3) return current;
        return current.filter((item) => item !== slug);
      }
      if (current.length >= 6) return current;
      return [...current, slug];
    });
    setHomepageSelectionStatus('');
  };

  const saveHomepageSelection = async () => {
    if (homepageSelectedSlugs.length < 3 || homepageSelectedSlugs.length > 6) {
      setHomepageSelectionStatus('Select between 3 and 6 destinations.');
      return;
    }
    setSavingHomepageSelection(true);
    setHomepageSelectionStatus('');
    try {
      const response = await fetch('/api/admin/homepage-most-viewed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: homepageSelectedSlugs }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save homepage destinations.');
      setHomepageSelectedSlugs(result.selectedSlugs);
      setHomepageSelectionStatus('Homepage destinations saved.');
    } catch (saveError) {
      console.error(saveError);
      setHomepageSelectionStatus(saveError instanceof Error ? saveError.message : 'Failed to save homepage destinations.');
    } finally {
      setSavingHomepageSelection(false);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>{t('adminDashboard')}</h1>
        <div className="admin-nav">
          <Link href="/admin/destinations">{t('manageDestinations')}</Link>
          <Link href="/admin/activity">Activity</Link>
          <Link href="/admin/feedback">Tourist feedback</Link>
          <Link href="/admin/contacts">Contacts</Link>
          <Link href="/admin/destinations/new">+ {t('createNewDestination')}</Link>
          <button type="button" onClick={() => setExportOpen((open) => !open)}>{t('exportCsv')}</button>
          <button type="button" onClick={logout}>{t('logout')}</button>
        </div>
      </div>

      <div className="admin-filters">
        <label>
          {t('fromLabel')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          {t('toLabel')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          {t('destinationSlug')}
          <input placeholder={t('exampleBoracay')} value={destination} onChange={(e) => setDestination(e.target.value)} />
        </label>
        <button type="button" onClick={() => { setAppliedDestination(destination); setFilterVersion((version) => version + 1); }} disabled={Boolean(from && to && from > to)}>{t('applyFilters')}</button>
        <span>Dates update the dashboard automatically (UTC).</span>
        {analyticsLoading && <span role="status">Updating analytics...</span>}
      </div>

      {exportOpen && (
        <section className="export-options admin-panel">
          <div>
            <p className="panel-label">Analytics export</p>
            <h2>Choose export date range</h2>
            <p>Download total, daily, weekly, monthly, and per-destination analytics for the selected period.</p>
          </div>
          <div className="export-options-controls">
            <label>
              From <span className="required-field">Required</span>
              <input required type="date" value={exportFrom} max={exportTo || undefined} onChange={(event) => setExportFrom(event.target.value)} />
            </label>
            <label>
              To <span className="required-field">Required</span>
              <input required type="date" value={exportTo} min={exportFrom || undefined} onChange={(event) => setExportTo(event.target.value)} />
            </label>
            <div className="export-destination-picker">
              <span>Destination scope</span>
              <div className="export-destination-options">
                <label className={`export-all-option${exportAllDestinations ? ' selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={exportAllDestinations}
                    onChange={() => {
                      setExportAllDestinations((selected) => !selected);
                      setSelectedExportDestinations([]);
                    }}
                  />
                  <strong>All destinations summary</strong>
                </label>
                <div className="export-destination-divider" />
                <span className="export-destination-count">Choose up to 5 individual destinations</span>
                <div className="export-destination-grid">
                  {exportDestinations.map((item) => (
                    <label key={item.slug}>
                      <input
                        type="checkbox"
                        checked={!exportAllDestinations && selectedExportDestinations.includes(item.slug)}
                        disabled={exportAllDestinations || (!selectedExportDestinations.includes(item.slug) && selectedExportDestinations.length >= 5)}
                        onChange={() => setSelectedExportDestinations((current) => current.includes(item.slug)
                          ? current.filter((slug) => slug !== item.slug)
                          : [...current, item.slug])}
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                className={`details-btn export-download${exportDatesMissing || exportRangeTooLong || exportScopeInvalid ? ' disabled' : ''}`}
                href={exportDatesMissing || exportRangeTooLong || exportScopeInvalid ? undefined : exportHref + '&format=csv'}
                download={!exportDatesMissing && !exportRangeTooLong && !exportScopeInvalid}
                onClick={(event) => { if (exportDatesMissing || exportRangeTooLong || exportScopeInvalid) event.preventDefault(); }}
              >
                Download CSV
              </a>
              <a
                className={`details-btn export-download${exportDatesMissing || exportRangeTooLong || exportScopeInvalid ? ' disabled' : ''}`}
                href={exportDatesMissing || exportRangeTooLong || exportScopeInvalid ? undefined : exportHref + '&format=pdf'}
                download={!exportDatesMissing && !exportRangeTooLong && !exportScopeInvalid}
                onClick={(event) => { if (exportDatesMissing || exportRangeTooLong || exportScopeInvalid) event.preventDefault(); }}
              >
                Download PDF
              </a>
            </div>
            {exportDatesMissing && <span className="export-warning">Select both From and To dates before downloading.</span>}
            {exportRangeTooLong && <span className="export-warning">Choose a maximum of 31 days.</span>}
            {exportScopeInvalid && <span className="export-warning">Choose All destinations or at least one destination.</span>}
          </div>
        </section>
      )}

      {error && <p className="admin-error">{error}</p>}
      {!data && analyticsLoading && <p className="admin-panel" role="status">Loading dashboard analytics...</p>}
      <div className="chart-metric-controls">
        <label>
          Show charts for
          <select value={chartMetric} onChange={(event) => {
            setChartMetric(event.target.value === 'scans' ? 'scans' : 'pageViews');
            setSelectedSegment(null);
            setHoveredSegment(null);
          }}>
            <option value="scans">QR scans</option>
            <option value="pageViews">Page views</option>
          </select>
        </label>
        <p>QR scans count recorded QR openings. Page views count tracked page loads and navigation, including repeat visits and admin pages. A destination filter limits page views to that destination.</p>
      </div>

      {data && (
        <>
          <div className="admin-stats">
            <button type="button" className="stat-card stat-card-featured" onClick={() => setSelectedMetric('scans')}>
              <div className="stat-card-top">
                <span>{t('qrScans')}</span>
                <span className="stat-trend positive">{metricTrend >= 0 ? '+' : ''}{metricTrend.toFixed(0)}%</span>
              </div>
              <strong>{data.totals.scans}</strong>
              <svg viewBox="0 0 100 35" className="sparkline" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={sparklinePoints} />
              </svg>
            </button>
            <button type="button" className="stat-card" onClick={() => setSelectedMetric('uniqueVisitors')}>
              <div className="stat-card-top"><span>{t('uniqueVisitors')}</span></div>
              <strong>{data.totals.uniqueVisitors}</strong>
            </button>
            <button type="button" className="stat-card" onClick={() => setSelectedMetric('pageViews')}>
              <div className="stat-card-top"><span>{t('pageViews')}</span></div>
              <strong>{data.totals.pageViews}</strong>
            </button>
            <button type="button" className="stat-card" onClick={() => setSelectedMetric('totalTimeSeconds')}>
              <div className="stat-card-top"><span>{t('timeOnSite')}</span><span className="stat-trend neutral">Avg</span></div>
              <strong>{Math.round(data.totals.totalTimeSeconds / 60)}m</strong>
            </button>
            <button type="button" className="stat-card" onClick={() => setSelectedMetric('destinations')}>
              <div className="stat-card-top"><span>{t('destinations')}</span><span className="stat-trend neutral">Map</span></div>
              <strong>{data.totals.destinations}</strong>
            </button>
          </div>

          {selectedMetric && (
            <section className="admin-section admin-panel metric-breakdown-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-label">Metric breakdown</p>
                  <h2>{selectedMetric === 'destinations' ? t('destinations') : selectedMetricLabel}</h2>
                </div>
                <button type="button" className="details-btn" onClick={() => setSelectedMetric(null)}>Close</button>
              </div>
              <div className="metric-breakdown-list">
                {selectedMetric === 'destinations' ? selectedBreakdown.filter((row) => row.slug !== '__main__').map((row) => (
                  <div className="metric-breakdown-row" key={row.slug}>
                    <span>{row.name}</span>
                    <strong>1</strong>
                  </div>
                )) : selectedBreakdown.map((row) => {
                  const value = row[selectedMetric as keyof typeof row];
                  return (
                    <div className="metric-breakdown-row" key={row.slug}>
                      <span>{row.name}</span>
                      <strong>{selectedMetric === 'totalTimeSeconds' ? `${Math.round(Number(value) / 60)}m` : String(value)}</strong>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="admin-visual-grid">
            <article className="admin-panel admin-traffic-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Traffic overview</p>
                  <h2>{chartMetric === 'scans' ? 'QR scans over time' : 'Page views over time'}</h2>
                </div>
                <div className="scan-chart-controls">
                  <label>
                    <span>Start date</span>
                    <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                  </label>
                  <label>
                    <span>End date</span>
                    <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="chart-legend">
                <span><i className="legend-dot" />{chartMetric === 'scans' ? 'QR scans' : 'Tracked page views'}</span>
                <span className="chart-total">{chartMetric === 'scans' ? data.totals.scans : data.totals.pageViews} {metricUnit}</span>
              </div>
              <p className="chart-range">{chartStart} to {chartEnd} (UTC){chartBuckets.some((bucket) => bucket.start !== bucket.end) ? ' · grouped intervals' : ' · daily'}</p>

              <div className="admin-chart-with-axis">
                <div className="chart-y-axis" aria-hidden="true">
                  <span>{maxDaily}</span>
                  <span>{Math.ceil(maxDaily / 2)}</span>
                  <span>0</span>
                </div>
                <svg viewBox="0 0 100 40" width="100%" height={180} preserveAspectRatio="none" className="admin-chart admin-line-chart" role="img" aria-label={chartMetric === 'scans' ? 'QR scans over the selected date range' : 'Tracked page views over the selected date range'}>
                  <defs>
                    <linearGradient id="scan-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(99,102,241,0.35)" />
                      <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="10" x2="100" y2="10" className="chart-grid-line" />
                  <line x1="0" y1="25" x2="100" y2="25" className="chart-grid-line" />
                  <line x1="0" y1="40" x2="100" y2="40" className="chart-grid-line" />
                  <path d={`M0,40 ${dailyEntries.map(([, c], i) => {
                    const x = (i / Math.max(dailyEntries.length - 1, 1)) * 100;
                    const y = 40 - (c / maxDaily) * 30;
                    return `L ${x} ${y}`;
                  }).join(' ')} L 100 40 Z`} fill="url(#scan-gradient)" opacity="1" />
                  <polyline points={dailyEntries.map(([, c], i) => {
                    const x = (i / Math.max(dailyEntries.length - 1, 1)) * 100;
                    const y = 40 - (c / maxDaily) * 30;
                    return `${x},${y}`;
                  }).join(' ')} />
                  {dailyEntries.length === 1 && <circle cx="0" cy={40 - (dailyEntries[0][1] / maxDaily) * 30} r="1.5" fill="#4f46e5" />}
                </svg>
              </div>
              <div className="chart-x-axis" style={{ gridTemplateColumns: `repeat(${Math.max(dailyEntries.length, 1)}, minmax(0, 1fr))` }} aria-hidden="true">
                {chartBuckets.map((bucket, index) => (
                  <span key={bucket.start} title={bucket.start === bucket.end ? bucket.start : `${bucket.start} to ${bucket.end}`}>
                    {index % Math.ceil(chartBuckets.length / 5) === 0 || index === chartBuckets.length - 1 ? formatChartDate(bucket.start) : ''}
                  </span>
                ))}
              </div>

              <div className="destination-trend">
                <h3>{chartMetric === 'scans' ? 'QR scans by source' : 'Destination page views'}</h3>
                <p className="chart-range">{chartMetric === 'scans' ? 'Scans are grouped by the destination linked to the QR code; main or unassigned QR scans are separate.' : 'Only destination pages are included here; other page views appear only in the total above.'} Colors match the engagement chart (UTC).</p>
                {destinationSeries.length ? (
                  <>
                    <div className="admin-chart-with-axis">
                      <div className="chart-y-axis" aria-hidden="true">
                        <span>{maxDestinationViews}</span><span>{Math.ceil(maxDestinationViews / 2)}</span><span>0</span>
                      </div>
                      <svg viewBox="0 0 100 40" width="100%" height={180} preserveAspectRatio="none" className="admin-chart destination-trend-chart" role="img" aria-label={chartMetric === 'scans' ? 'QR scans by source over the selected date range' : 'Destination page views over the selected date range'}>
                        <line x1="0" y1="10" x2="100" y2="10" className="chart-grid-line" />
                        <line x1="0" y1="25" x2="100" y2="25" className="chart-grid-line" />
                        <line x1="0" y1="40" x2="100" y2="40" className="chart-grid-line" />
                        {destinationSeries.map((series) => {
                          const points = series.counts.map((count, index) => {
                            const x = index / Math.max(series.counts.length - 1, 1) * 100;
                            const y = 40 - count / maxDestinationViews * 30;
                            return { x, y };
                          });
                          const curve = points.map((point, index) => {
                            if (index === 0) return `M ${point.x} ${point.y}`;
                            const previous = points[index - 1];
                            const middle = (previous.x + point.x) / 2;
                            return `C ${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y}`;
                          }).join(' ');
                          return (
                            <g key={series.slug}>
                              <title>{series.name}</title>
                              {points.length > 1 && <path d={`${curve} L 100 40 L 0 40 Z`} fill={series.color} fillOpacity="0.1" />}
                              <path d={curve} fill="none" stroke={series.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                              {series.counts.length === 1 && <circle cx="0" cy={40 - series.counts[0] / maxDestinationViews * 30} r="1.5" fill={series.color} />}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    <div className="chart-x-axis" style={{ gridTemplateColumns: `repeat(${Math.max(chartBuckets.length, 1)}, minmax(0, 1fr))` }} aria-hidden="true">
                      {chartBuckets.map((bucket, index) => (
                        <span key={bucket.start} title={bucket.start === bucket.end ? bucket.start : `${bucket.start} to ${bucket.end}`}>
                          {index % Math.ceil(chartBuckets.length / 5) === 0 || index === chartBuckets.length - 1 ? formatChartDate(bucket.start) : ''}
                        </span>
                      ))}
                    </div>
                    <ul className="destination-trend-legend" aria-label={chartMetric === 'scans' ? 'QR source chart colors' : 'Destination chart colors'}>
                      {destinationSeries.map((series) => (
                        <li key={series.slug}><i aria-hidden="true" style={{ backgroundColor: series.color }} />{series.name}</li>
                      ))}
                    </ul>
                  </>
                ) : <p className="most-viewed-empty">{chartMetric === 'scans' ? 'No QR scans found for the selected filters.' : 'No destination page views found for the selected filters.'}</p>}
              </div>
            </article>

            <article className="admin-panel admin-summary-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-label">Engagement</p>
                  <h2>Performance</h2>
                </div>
              </div>

              <div className="engagement-ring-wrap">
                <div className="engagement-ring">
                  <svg viewBox="0 0 100 100" className="engagement-ring-svg" aria-label={chartMetric === 'scans' ? 'QR scan shares by source' : 'Destination page view shares'}>
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    {engagementChart.segments.map((segment) => (
                      <circle
                        key={segment.slug} cx="50" cy="50" r="44" fill="none" stroke={segment.color} strokeWidth="12"
                        pathLength="100" strokeDasharray={`${segment.end - segment.start} ${100 - (segment.end - segment.start)}`}
                        strokeDashoffset={-segment.start} transform="rotate(-90 50 50)"
                        role="button" tabIndex={0} aria-label={`${segment.name}: ${segment.views} ${metricUnit}, ${segment.percentage.toFixed(1)}%`}
                        onMouseEnter={() => setHoveredSegment(segment.slug)} onMouseLeave={() => setHoveredSegment(null)}
                        onFocus={() => setHoveredSegment(segment.slug)} onBlur={() => setHoveredSegment(null)}
                        onClick={() => setSelectedSegment((current) => current === segment.slug ? null : segment.slug)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedSegment((current) => current === segment.slug ? null : segment.slug);
                          }
                        }}
                      ><title>{segment.name}: {segment.views} {metricUnit} ({segment.percentage.toFixed(1)}%)</title></circle>
                    ))}
                  </svg>
                  <div className="engagement-ring-inner">
                    <strong>{engagementChart.total}</strong>
                    <span>{chartMetric === 'scans' ? 'QR scans' : 'destination views'}</span>
                  </div>
                </div>
              </div>
              <p className="engagement-selection" aria-live="polite">
                {activeSegment ? `${activeSegment.name}: ${activeSegment.views} ${metricUnit} (${activeSegment.percentage.toFixed(1)}%)` : 'Point to or select a color to see its name.'}
              </p>

              {engagementChart.segments.length ? (
                <div>
                  <p className="engagement-legend-title">{chartMetric === 'scans' ? 'Share of QR scans by source' : 'Share of destination page views'}</p>
                  <ul className="engagement-legend">
                    {engagementChart.segments.map((segment) => (
                      <li key={segment.slug}>
                        <span className="engagement-legend-name"><i aria-hidden="true" style={{ backgroundColor: segment.color }} />{segment.name}</span>
                        <strong>{segment.views} ({segment.percentage.toFixed(1)}%)</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="most-viewed-empty">{chartMetric === 'scans' ? 'No QR scans found for the selected filters.' : 'No destination page views found for the selected filters.'}</p>
              )}

              <div className="summary-stack">
                <div>
                  <span>{chartMetric === 'scans' ? 'Top QR source' : 'Top destination by views'}</span>
                  <strong>{strongestDestination ? strongestDestination.name : 'N/A'}</strong>
                </div>
                <div>
                  <span>Avg. dwell time per page view</span>
                  <strong>{Math.round(data.totals.totalTimeSeconds / Math.max(data.totals.pageViews || 1, 1))} sec</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="admin-section admin-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-label">{t('pageViews')}</p>
                <h2>{t('mostViewedDestinations')}</h2>
              </div>
            </div>

            {topDestinations.length ? (
              <div className="destination-bars" role="list" aria-label={t('mostViewedDestinations')}>
                {topDestinations.map((d, index) => (
                  <div className="destination-bar-row" key={d.slug} role="listitem">
                    <div className="destination-labels">
                      <span className="destination-rank" aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                      <Link href={`/destination/${encodeURIComponent(d.slug)}`} className="destination-view-link">{d.name}</Link>
                      <strong>{d.views} {t('pageViews').toLowerCase()}</strong>
                    </div>
                    <div className="destination-bar-track">
                      <div className="destination-bar-fill" style={{ width: `${(d.views / Math.max(topDestinations[0]?.views || 1, 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="most-viewed-empty">No destination page views found for the selected filters.</p>
            )}
            <div className="homepage-destination-controls">
              <div className="homepage-destination-controls-heading">
                <div>
                  <h3>Show on homepage</h3>
                  <p>Select 3–6 published destinations to display on the homepage.</p>
                </div>
                <span>{homepageSelectedSlugs.length}/6 selected</span>
              </div>
              <div className="homepage-destination-options">
                {[...homepageDestinations]
                  .sort((a, b) =>
                    (homepageDestinationViews.get(b.slug.toLowerCase()) || 0) -
                    (homepageDestinationViews.get(a.slug.toLowerCase()) || 0) ||
                    a.name.localeCompare(b.name)
                  )
                  .map((item) => {
                    const checked = homepageSelectedSlugs.includes(item.slug);
                    return (
                      <label className={checked ? 'selected' : ''} key={item.slug}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={(!checked && homepageSelectedSlugs.length >= 6) || (checked && homepageSelectedSlugs.length <= 3)}
                          onChange={() => toggleHomepageDestination(item.slug)}
                        />
                        <span>{item.name}</span>
                        <small>{homepageDestinationViews.get(item.slug.toLowerCase()) || 0} views</small>
                      </label>
                    );
                  })}
              </div>
              <div className="homepage-destination-save-row">
                {homepageSelectionStatus && (
                  <p className={homepageSelectionStatus === 'Homepage destinations saved.' ? 'success' : 'error'} role="status">
                    {homepageSelectionStatus}
                  </p>
                )}
                <button
                  type="button"
                  className="details-btn"
                  onClick={saveHomepageSelection}
                  disabled={savingHomepageSelection || homepageSelectedSlugs.length < 3 || homepageSelectedSlugs.length > 6}
                >
                  {savingHomepageSelection ? 'Saving…' : 'Publish selection'}
                </button>
              </div>
            </div>
          </section>

          <section className="admin-section admin-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-label">Smart Assistant</p>
                <h2>Assistant feedback</h2>
              </div>
              <span>👍 {data?.assistantFeedback?.up ?? 0} · 👎 {data?.assistantFeedback?.down ?? 0}</span>
            </div>
            {data?.assistantFeedback?.recent?.length ? (
              <ul>
                {data.assistantFeedback.recent.map((item, i) => (
                  <li key={i}>{item.rating === 'up' ? '👍' : '👎'} {item.question || '—'} {item.lang ? `(${item.lang})` : ''}</li>
                ))}
              </ul>
            ) : (
              <p className="most-viewed-empty">No assistant feedback yet.</p>
            )}
          </section>

          <section className="admin-panel activity-link-panel">
            <div>
              <p className="panel-label">Dashboard records</p>
              <h2>Recent scans and audit log</h2>
              <p>Open the activity page to review visitor scans and administrator history.</p>
            </div>
            <Link className="details-btn" href="/admin/activity">View activity</Link>
          </section>
        </>
      )}
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const admin = await verifyAdmin(context.req);
  if (!admin) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { props: { analytics: null, error: 'Server misconfiguration' } };
  }

  return { props: { analytics: null } };
};
