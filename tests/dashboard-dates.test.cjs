const assert = require('node:assert/strict');
const test = require('node:test');
const loadTypeScript = require('./load-typescript.cjs');
const dates = loadTypeScript('lib/dashboardDates.ts');

test('daily destination views use UTC dates and only destination paths', () => {
  const result = dates.dailyDestinationViews([
    { created_at: '2026-09-20T23:59:59.999Z', payload: { path: '/destination/a?x=1' } },
    { created_at: '2026-09-21T00:00:00Z', payload: { path: '/destination/a' } },
    { created_at: '2026-09-21T01:00:00Z', payload: { path: '/destination/b' } },
    { created_at: 'bad-date', payload: { path: '/destination/a' } },
    { created_at: '2026-09-21T00:00:00Z', payload: { path: '/' } },
  ]);
  assert.deepEqual(result, { '2026-09-20': { a: 1 }, '2026-09-21': { a: 1, b: 1 } });
  assert.deepEqual(dates.dailyPageViews([
    { created_at: '2026-09-20T23:59:59.999Z', payload: { path: '/' } },
    { created_at: '2026-09-21T00:00:00Z', payload: { path: '/admin' } },
    { created_at: 'invalid' },
  ]), { '2026-09-20': 1, '2026-09-21': 1 });
});

test('chart buckets cover the requested date range with bounded grouping', () => {
  const daily = dates.chartDateBuckets('2026-09-20', '2026-09-22');
  assert.deepEqual(daily, [
    { start: '2026-09-20', end: '2026-09-20' },
    { start: '2026-09-21', end: '2026-09-21' },
    { start: '2026-09-22', end: '2026-09-22' },
  ]);
  const grouped = dates.chartDateBuckets('2026-01-01', '2026-12-31');
  assert.ok(grouped.length <= 31);
  assert.equal(grouped[0].start, '2026-01-01');
  assert.equal(grouped.at(-1).end, '2026-12-31');
  assert.equal(dates.sumBucket({ '2026-01-01': 2, '2026-01-12': 3, '2026-01-13': 7 }, grouped[0].start, grouped[0].end), 5);
  assert.deepEqual(dates.chartDateBuckets('2026-09-22', '2026-09-20'), []);
});

test('analytics date filters include the whole UTC end date', async () => {
  const fixtures = {
    scans: [
      { id: 's1', qr_id: 'qa', scanned_at: '2026-09-20T23:59:59Z' },
      { id: 's2', qr_id: 'main', scanned_at: '2026-09-21T12:00:00Z' },
      { id: 's3', qr_id: null, scanned_at: '2026-09-21T12:01:00Z' },
      { id: 's4', qr_id: 'qa', scanned_at: '2026-09-22T00:00:00Z' },
    ],
    engagements: [
      { created_at: '2026-09-20T23:59:59.999Z', event_type: 'page_view', payload: { path: '/destination/a' } },
      { created_at: '2026-09-21T23:59:59.999Z', event_type: 'page_view', payload: { path: '/destination/b' } },
      { created_at: '2026-09-22T00:00:00.000Z', event_type: 'page_view', payload: { path: '/destination/a' } },
      { created_at: '2026-09-21T12:00:00.000Z', event_type: 'page_view', scan_id: 's1', payload: { path: '/destination/b' } },
      { created_at: '2026-09-21T13:00:00.000Z', event_type: 'page_view', payload: { path: '/admin' } },
    ],
    destinations: [{ id: 'a', name: 'A', slug: 'a' }, { id: 'b', name: 'B', slug: 'b' }],
    qr_codes: [{ id: 'qa', destination_id: 'a' }, { id: 'main', destination_id: null }], audit_logs: [], destination_feedback: [],
  };
  const db = { from(table) {
    let rows = fixtures[table];
    const query = {
      select: () => query,
      order: () => query,
      gte: (column, value) => { rows = rows.filter((row) => Date.parse(row[column]) >= Date.parse(value)); return query; },
      lt: (column, value) => { rows = rows.filter((row) => Date.parse(row[column]) < Date.parse(value)); return query; },
      range: async (start, end) => ({ data: rows.slice(start, Math.min(end + 1, start + 1)), count: rows.length, error: null }),
    };
    return query;
  } };
  const handler = loadTypeScript('pages/api/admin/analytics.ts', {
    fs: { __esModule: true, default: { existsSync: () => false } },
    '../../../lib/auth': { verifyAdmin: async () => ({ id: 'head', email: 'head@example.test' }) },
    '../../../lib/supabaseAdmin': { __esModule: true, default: () => db },
    '../../../lib/dashboardDates': dates,
  }).default;
  const invoke = async (query) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method: 'GET', query }, res);
    return res;
  };
  const res = await invoke({ from: '2026-09-20', to: '2026-09-21' });
  assert.equal(res.body.totals.pageViews, 4);
  assert.equal(res.body.totals.scans, 3);
  assert.deepEqual(res.body.dailyPageViews, { '2026-09-20': 1, '2026-09-21': 3 });
  assert.deepEqual(res.body.dailyDestinationViews, { '2026-09-20': { a: 1 }, '2026-09-21': { b: 2 } });
  assert.deepEqual(res.body.dailyScansBySource, { '2026-09-20': { a: 1 }, '2026-09-21': { __unassigned__: 2 } });
  assert.deepEqual(Object.fromEntries(res.body.scanSources.map((source) => [source.slug, source.views])), { a: 1, __unassigned__: 2 });
  const filtered = await invoke({ from: '2026-09-20', to: '2026-09-21', destination: 'a' });
  assert.equal(filtered.body.totals.scans, 1);
  assert.equal(filtered.body.totals.pageViews, 1);
  assert.deepEqual(filtered.body.dailyPageViews, { '2026-09-20': 1 });
  assert.deepEqual(filtered.body.dailyScansBySource, { '2026-09-20': { a: 1 } });
  assert.equal((await invoke({ from: '2026-09-22', to: '2026-09-21' })).statusCode, 400);
  assert.equal((await invoke({ from: '2026-02-30' })).statusCode, 400);
});
