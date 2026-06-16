import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

function sendEngagement(eventType: string, payload: any) {
  return fetch('/api/engagements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, payload }),
  });
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const startRef = useRef<number | null>(null);
  const scanIdRef = useRef<string | null>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    // Capture scan id from query param if present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scan = params.get('scan');
      if (scan) scanIdRef.current = scan;
      // page view event
      sendEngagement('page_view', { path: window.location.pathname, scan_id: scan });
      startRef.current = Date.now();
    }

    const handleRouteChange = (url: string) => {
      // send engagement for time spent on previous page
      if (startRef.current) {
        const duration = Math.round((Date.now() - startRef.current) / 1000);
        sendEngagement('time_spent', { path: url, seconds: duration, scan_id: scanIdRef.current });
      }
      startRef.current = Date.now();
    };

    router.events.on('routeChangeStart', handleRouteChange);
    // before unload
    const handleBeforeUnload = () => {
      if (startRef.current) {
        const duration = Math.round((Date.now() - startRef.current) / 1000);
        navigator.sendBeacon('/api/engagements', JSON.stringify({ event_type: 'time_spent', payload: { path: window.location.pathname, seconds: duration, scan_id: scanIdRef.current } }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router.events]);

  useEffect(() => {
    // Back-to-top visibility
    const onScroll = () => {
      const s = window.scrollY || window.pageYOffset;
      const visible = s > 300;
      const el = document.getElementById('back-to-top');
      if (el) el.style.display = visible ? 'block' : 'none';
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/dot-logo.png" alt="DOT" style={{ width: 36, height: 36 }} onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span>Philippines Travelogue</span>
          </a>
          <nav>
            <a href="/admin" style={{ marginLeft: 12 }}>Admin</a>
            <a href="/admin/login" style={{ marginLeft: 12 }}>Login</a>
          </nav>
        </div>
      </header>
      <button id="back-to-top" className="back-to-top" style={{ display: 'none' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
      <Component {...pageProps} />
      <footer style={{ marginTop: 48, borderTop: '1px solid #eee', padding: 16, textAlign: 'center' }}>
        Built with ❤️ — Travelogue
      </footer>
    </>
  );
}
