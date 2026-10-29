import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from '../../lib/i18n';

function describeDevice(ua: string) {
  if (!ua) return '—';
  const os = /iPhone/i.test(ua) ? 'iPhone'
    : /iPad/i.test(ua) ? 'iPad'
    : /Android/i.test(ua) ? 'Android'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'Mac'
    : /Linux/i.test(ua) ? 'Linux'
    : 'Unknown device';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /OPR\/|Opera/i.test(ua) ? 'Opera'
    : /SamsungBrowser/i.test(ua) ? 'Samsung Internet'
    : /CriOS|Chrome\//i.test(ua) ? 'Chrome'
    : /FxiOS|Firefox\//i.test(ua) ? 'Firefox'
    : /Safari\//i.test(ua) ? 'Safari'
    : /bot|crawl|spider/i.test(ua) ? 'Bot'
    : 'Other browser';
  return `${os} · ${browser}`;
}

function isLocalVisitor(value: string) {
  return value === '::1' || value === '127.0.0.1' || value === '::ffff:127.0.0.1';
}

function formatDetails(details: any) {
  if (!details) return 'No details available.';
  if (typeof details === 'string') return details;
  if (details.description) return details.description;
  if (details.fields) return `Updated fields: ${Array.isArray(details.fields) ? details.fields.join(', ') : details.fields}.`;
  if (details.slug && details.name) return `Created destination "${details.name}" (${details.slug}).`;
  return JSON.stringify(details);
}

export default function AdminActivity() {
  const router = useRouter();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(async (response) => {
        if (response.status === 401) return router.push('/admin/login');
        if (!response.ok) throw new Error();
        setData(await response.json());
      })
      .catch(() => setError(t('failedToLoad')));
  }, [router, t]);

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="panel-label">Dashboard records</p>
          <h1>Activity</h1>
        </div>
        <div className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/destinations">Manage destinations</Link>
          <Link href="/admin/photo-strip">Photo strip</Link>
        </div>
      </div>
      {error && <p className="admin-error">{error}</p>}
      {data && <>
        <section className="admin-section admin-panel admin-table-panel">
          <div className="panel-header compact"><div><p className="panel-label">Visitor activity</p><h2>{t('recentScans')}</h2></div><span className="panel-pill">{data.recentScans.length} records</span></div>
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>{t('timeLabel')}</th><th>{t('visitorLabel')}</th><th>{t('userAgentLabel')}</th></tr></thead><tbody>{data.recentScans.map((scan: any) => <tr key={scan.id}><td>{new Date(scan.scanned_at).toLocaleString()}</td><td>{(() => { const v = String(scan.visitor_id || scan.ip_address || ''); return !v ? '—' : isLocalVisitor(v) ? 'Local test (this computer)' : v; })()}</td><td title={scan.user_agent || ''}>{describeDevice(scan.user_agent || '')}</td></tr>)}</tbody></table></div>
        </section>
        <section className="admin-section admin-panel admin-table-panel">
          <div className="panel-header compact"><div><p className="panel-label">System history</p><h2>{t('auditLog')}</h2></div><span className="panel-pill">{data.auditLogs.length} records</span></div>
          <div className="admin-table-scroll"><table className="admin-table audit-table"><thead><tr><th>{t('timeLabel')}</th><th>{t('adminLabel')}</th><th>{t('actionLabel')}</th><th>{t('entityLabel')}</th><th>{t('details')}</th></tr></thead><tbody>{data.auditLogs.map((audit: any) => <tr key={audit.id}><td>{new Date(audit.created_at).toLocaleString()}</td><td>{audit.admin_email || '—'}</td><td><span className="audit-action">{audit.action}</span></td><td>{audit.entity_type} {audit.entity_id ? `(${String(audit.entity_id).slice(0, 8)}...)` : ''}</td><td className="audit-details">{formatDetails(audit.details)}</td></tr>)}</tbody></table></div>
        </section>
      </>}
    </main>
  );
}
