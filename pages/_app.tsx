import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import '../styles/globals.css';
import { I18nProvider, useTranslation, LANG_GROUPS } from '../lib/i18n';
import { sendEngagement, getScanId } from '../lib/engagement';
import { useSiteLogo } from '../lib/useSiteBranding';

function WelcomeOverlay() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(true);
    const off = () => setShow(false);
    window.addEventListener('welcome-show', on);
    window.addEventListener('welcome-hide', off);
    return () => {
      window.removeEventListener('welcome-show', on);
      window.removeEventListener('welcome-hide', off);
    };
  }, []);
  if (!show) return null;
  return (
    <div
      aria-live="polite"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.12)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      <div style={{ width: 'min(1200px, 92vw)', padding: '40px 24px 0', color: '#fff', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Barabara', 'Segoe Script', 'Lucida Handwriting', cursive",
            fontSize: 'clamp(70px, 10vw, 170px)',
            lineHeight: 0.9,
            fontWeight: 400,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 0 25px rgba(255,255,255,0.12), 0 10px 30px rgba(15,23,42,0.12)',
            letterSpacing: '0.02em',
            marginBottom: 18,
          }}
        >
          Mabuhay!
        </div>
      </div>
    </div>
  );
}

function BackToTop() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow((window.scrollY || window.pageYOffset) > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      id="back-to-top"
      className="back-to-top"
      style={{ display: show ? 'block' : 'none' }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      {t('top')}
    </button>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const startRef = useRef<number | null>(null);
  const maxScrollRef = useRef(0);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const isProtectedAdminRoute = (route: string) => route.startsWith('/admin') && route !== '/admin/login';
    const logoutWhenLeavingAdmin = (url: string) => {
      if (isProtectedAdminRoute(router.pathname) && !isProtectedAdminRoute(url)) {
        void fetch('/api/admin/logout', { method: 'POST', keepalive: true });
      }
    };
    const logoutOnPageExit = () => {
      if (isProtectedAdminRoute(window.location.pathname)) {
        void fetch('/api/admin/logout', { method: 'POST', keepalive: true });
      }
    };

    router.events.on('routeChangeStart', logoutWhenLeavingAdmin);
    window.addEventListener('pagehide', logoutOnPageExit);
    return () => {
      router.events.off('routeChangeStart', logoutWhenLeavingAdmin);
      window.removeEventListener('pagehide', logoutOnPageExit);
    };
  }, [router.events, router.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isHomePage = window.location.pathname === '/';
    let welcomeTimer: number | undefined;
    const dismissWelcome = () => {
      if (welcomeTimer !== undefined) window.clearTimeout(welcomeTimer);
      window.dispatchEvent(new Event('welcome-hide'));
    };
    if (isHomePage) {
      window.dispatchEvent(new Event('welcome-show'));
      welcomeTimer = window.setTimeout(() => window.dispatchEvent(new Event('welcome-hide')), 8000);
      window.addEventListener('click', dismissWelcome, { once: true });
    } else {
      window.dispatchEvent(new Event('welcome-hide'));
    }

    getScanId();
    sendEngagement('page_view', { path: window.location.pathname });
    startRef.current = Date.now();
    maxScrollRef.current = 0;
    scrollMilestonesRef.current = new Set();

    const reportTime = (path: string) => {
      if (!startRef.current) return;
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      if (duration > 0) {
        sendEngagement('time_spent', { path, seconds: duration, max_scroll: maxScrollRef.current });
      }
    };

    const handleRouteChange = (url: string) => {
      reportTime(window.location.pathname);
      startRef.current = Date.now();
      maxScrollRef.current = 0;
      scrollMilestonesRef.current = new Set();
      sendEngagement('page_view', { path: url });
    };

    const handleBeforeUnload = () => {
      reportTime(window.location.pathname);
    };

    const onScroll = () => {};

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a, button, [data-track]');
      if (!link) return;
      sendEngagement('click', {
        path: window.location.pathname,
        tag: link.tagName.toLowerCase(),
        href: (link as HTMLAnchorElement).href || null,
        text: (link.textContent || '').slice(0, 80),
      });
    };

    router.events.on('routeChangeStart', handleRouteChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick);

    return () => {
      if (welcomeTimer !== undefined) window.clearTimeout(welcomeTimer);
      window.removeEventListener('click', dismissWelcome);
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
    };
  }, [router.events]);

  function Header() {
    const { t, lang, setLang } = useTranslation();
    const siteLogo = useSiteLogo();
    const isAdminRoute = router.pathname.startsWith('/admin') && router.pathname !== '/admin/login';
    const isHome = router.pathname === '/' || router.pathname === '/destination/[slug]';
    const [dests, setDests] = useState<{ name: string; slug: string }[]>([])

    useEffect(() => {
      let mounted = true
      fetch('/api/destinations')
        .then((r) => r.json())
        .then((j) => {
          if (!mounted) return
          setDests((j?.destinations || []).map((d: any) => ({ name: d.name, slug: d.slug })))
        })
        .catch(() => {})
      return () => { mounted = false }
    }, [])
    return (
      <header className={`site-header${isHome || isAdminRoute ? ' on-hero' : ''}${isAdminRoute ? ' on-admin' : ''}`}>
        <div className="inner" style={{ gap: 16 }}>
          <a href="/" onClick={async (event) => {
            if (!isAdminRoute) return;
            event.preventDefault();
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.assign('/');
          }} style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1e1e1e' }}>
            <img src={siteLogo} alt="Department of Tourism" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span>Department of Tourism</span>
          </a>

          <div className="global-header-controls" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isHome && (
              <nav className="home-header-nav">
                <a href="/">{t('home')}</a>
                <a href="/contact">{t('contact')}</a>
              </nav>
            )}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                aria-label="Destinations"
                onChange={(e) => {
                  const slug = (e.target as HTMLSelectElement).value
                  if (!slug) return
                  router.push(`/destination/${slug}`)
                }}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#1f2937' }}
                defaultValue=""
              >
                <option value="">{t('destinations')}</option>
                {dests.map((d) => (
                  <option key={d.slug} value={d.slug}>{d.name}</option>
                ))}
              </select>
            </nav>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#1f2937' }}
              aria-label="Language selector"
            >
              {LANG_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.langs.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </header>
    );
  }

  function AppContent() {
    const { t } = useTranslation();
    const isAdminPage = router.pathname.startsWith('/admin') && router.pathname !== '/admin/login';
    const adminLinks = [
      { href: '/admin', label: 'Dashboard', active: router.pathname === '/admin' },
      { href: '/admin/destinations', label: 'Manage destinations', active: router.pathname.startsWith('/admin/destinations') },
      { href: '/admin/activity', label: 'Activity', active: router.pathname === '/admin/activity' },
      { href: '/admin/feedback', label: 'Tourist feedback', active: router.pathname === '/admin/feedback' },
      { href: '/admin/contacts', label: 'Contacts', active: router.pathname === '/admin/contacts' },
      { href: '/admin/photo-strip', label: 'Homepage media', active: router.pathname === '/admin/photo-strip' },
      { href: '/admin/accounts', label: 'Admin accounts', active: router.pathname === '/admin/accounts' },
    ];

    const adminContent = (
      <>
      <div className="admin-band admin-band-top" aria-hidden="true" />
      <div className="admin-band admin-band-bottom" aria-hidden="true" />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin menu">
          <Link href="/admin" className="admin-sidebar-brand">Travelogue Admin</Link>
          <nav className="admin-sidebar-nav">
            {adminLinks.map((item) => (
              <Link key={item.href} href={item.href} className={item.active ? 'active' : ''} aria-current={item.active ? 'page' : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <button type="button" className="admin-sidebar-logout" onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); router.push('/admin/login'); }}>Log out</button>
        </aside>
        <div className="admin-shell-content"><Component {...pageProps} /></div>
      </div>
      </>
    );
    return (
      <>
        <Header />
        <WelcomeOverlay />
        <BackToTop />
        {isAdminPage ? adminContent : <Component {...pageProps} />}
        {!isAdminPage && <footer style={{ marginTop: 48, borderTop: '1px solid #eee', padding: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <img src="/dot-logo.png" alt="Department of Tourism" style={{ maxHeight: 48, maxWidth: 180, objectFit: 'contain' }} />
          </div>
        </footer>}
      </>
    );
  }

  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
