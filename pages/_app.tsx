import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import '../styles/globals.css';
import { I18nProvider, useTranslation, LANG_GROUPS } from '../lib/i18n';
import { sendEngagement, getScanId } from '../lib/engagement';
import { useSiteLogo } from '../lib/useSiteBranding';
import LoadingNotification from '../components/LoadingNotification';

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

  // Supabase access tokens expire after about an hour, so renew the admin session while an admin page is open.
  useEffect(() => {
    if (!router.pathname.startsWith('/admin') || router.pathname === '/admin/login') return;
    const refresh = () => { void fetch('/api/admin/refresh', { method: 'POST' }); };
    const timer = window.setInterval(refresh, 20 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router.pathname]);

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

  return (
    <I18nProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </I18nProvider>
  );
}

type GlassGroup = { label: string; items: { value: string; label: string }[] };

function GlassSelect({ label, groups, value, onSelect, ariaLabel }: {
  label: string;
  groups: GlassGroup[];
  value?: string;
  onSelect: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="glass-select" ref={rootRef}>
      <button type="button" className="glass-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="glass-select-menu" role="listbox" aria-label={ariaLabel}>
          {groups.map((group, gi) => (
            <div key={`${group.label}-${gi}`}>
              {group.label && <div className="glass-select-group">{group.label}</div>}
              {group.items.map((item) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={item.value === value}
                  key={item.value}
                  className={`glass-select-option${item.value === value ? ' selected' : ''}`}
                  onClick={() => { setOpen(false); onSelect(item.value); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
    const router = useRouter();
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
                <Link href="/">{t('home')}</Link>
                <Link href="/contact">{t('contact')}</Link>
              </nav>
            )}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GlassSelect
                ariaLabel="Destinations"
                label={t('destinations')}
                groups={[{ label: '', items: dests.map((d) => ({ value: d.slug, label: d.name })) }]}
                onSelect={(slug) => router.push(`/destination/${slug}`)}
              />
            </nav>

            <GlassSelect
              ariaLabel="Language selector"
              label={LANG_GROUPS.flatMap((g) => g.langs).find((l) => l.code === lang)?.label || lang}
              value={lang}
              groups={LANG_GROUPS.map((g) => ({ label: g.label, items: g.langs.map((l) => ({ value: l.code, label: l.label })) }))}
              onSelect={(code) => setLang(code as any)}
            />
          </div>
        </div>
      </header>
    );
  }

function AppContent({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) {
    const router = useRouter();
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
        <LoadingNotification />
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
