const DAY_MS = 24 * 60 * 60 * 1000;

type ViewEvent = {
  created_at?: string | null;
  payload?: { path?: unknown } | null;
};

export function isDashboardDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function dailyDestinationViews(events: ViewEvent[]): Record<string, Record<string, number>> {
  const daily: Record<string, Record<string, number>> = {};
  for (const event of events) {
    const slug = String(event.payload?.path || '').match(/\/destination\/([^/?]+)/)?.[1];
    const time = event.created_at ? new Date(event.created_at).getTime() : NaN;
    if (!slug || !Number.isFinite(time)) continue;
    const date = new Date(time).toISOString().slice(0, 10);
    if (!daily[date]) daily[date] = {};
    daily[date][slug] = (daily[date][slug] || 0) + 1;
  }
  return daily;
}

export function dailyPageViews(events: ViewEvent[]): Record<string, number> {
  const daily: Record<string, number> = {};
  for (const event of events) {
    const time = event.created_at ? new Date(event.created_at).getTime() : NaN;
    if (!Number.isFinite(time)) continue;
    const date = new Date(time).toISOString().slice(0, 10);
    daily[date] = (daily[date] || 0) + 1;
  }
  return daily;
}

export function chartDateBuckets(start: string, end: string) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) return [];
  const days = Math.floor((endTime - startTime) / DAY_MS) + 1;
  const bucketDays = Math.ceil(days / 31);
  return Array.from({ length: Math.ceil(days / bucketDays) }, (_, index) => {
    const first = startTime + index * bucketDays * DAY_MS;
    const last = Math.min(first + (bucketDays - 1) * DAY_MS, endTime);
    return {
      start: new Date(first).toISOString().slice(0, 10),
      end: new Date(last).toISOString().slice(0, 10),
    };
  });
}

export function sumBucket(counts: Record<string, number>, start: string, end: string) {
  return Object.entries(counts).reduce((sum, [date, count]) => date >= start && date <= end ? sum + count : sum, 0);
}
