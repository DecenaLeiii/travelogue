const assert = require('node:assert/strict');
const test = require('node:test');
const { buildEngagementChart } = require('./load-typescript.cjs')('lib/engagementChart.ts');

test('destination views produce proportional colored segments without excluding destinations', () => {
  const rows = [
    { slug: 'first', name: 'First', views: 3 },
    { slug: 'second', name: 'Second', views: 1 },
    ...Array.from({ length: 7 }, (_, index) => ({ slug: `extra-${index}`, name: `Extra ${index}`, views: 1 })),
    { slug: 'zero', name: 'No views', views: 0 },
  ];
  const chart = buildEngagementChart(rows);
  assert.equal(chart.total, 11);
  assert.equal(chart.segments.length, 9);
  assert.equal(chart.segments[0].slug, 'first');
  assert.equal(chart.segments[0].percentage, 3 / 11 * 100);
  assert.equal(chart.segments[0].start, 0);
  assert.equal(chart.segments.at(-1).end, 100);
  assert.equal(new Set(chart.segments.map((segment) => segment.color)).size, 9);
});

test('no destination views produces an empty chart', () => {
  const chart = buildEngagementChart([{ slug: 'zero', name: 'Zero', views: 0 }]);
  assert.equal(chart.total, 0);
  assert.equal(chart.segments.length, 0);
});
