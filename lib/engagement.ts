const SCAN_KEY = 'travelogue_scan_id';
const VISITOR_KEY = 'travelogue_visitor_id';
const API = '/api/engagement/event';

export function getScanId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('scan');
  if (fromUrl) {
    sessionStorage.setItem(SCAN_KEY, fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem(SCAN_KEY);
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let vid = localStorage.getItem(VISITOR_KEY);
  if (!vid) {
    vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(VISITOR_KEY, vid);
  }
  return vid;
}

export function sendEngagement(eventType: string, payload: Record<string, unknown> = {}) {
  const scan_id = getScanId();
  const body = JSON.stringify({
    event_type: eventType,
    scan_id,
    payload: { ...payload, scan_id, visitor_id: getVisitorId() },
  });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(API, blob);
  }

  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}
