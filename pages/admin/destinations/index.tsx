import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../../lib/i18n';

type Destination = {
  id: string;
  name: string;
  slug: string;
  region?: string;
  published?: boolean;
  featured?: boolean;
};

export default function AdminDestinations() {
  const router = useRouter();
  const { t } = useTranslation();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [qrcodes, setQrcodes] = useState<Record<string, string>>({});
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [qrLoading, setQrLoading] = useState<Record<string, boolean>>({});
  const [feedbackStats, setFeedbackStats] = useState<Record<string, { averageRating: number; ratingCount: number }>>({});
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/destinations');
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { setError(t('failedToLoad')); return; }
    const json = await res.json();
    setDestinations(json.destinations || []);
  };

  const loadQRCodes = async () => {
    const res = await fetch('/api/admin/qrcodes');
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { return; }
    const json = await res.json();
    const map: Record<string, string> = {};
    (json.qrcodes || []).forEach((q: any) => {
      if (q.destination_id) map[q.destination_id] = q.code;
    });
    setQrcodes(map);
  };

  const loadFeedbackStats = async () => {
    const res = await fetch('/api/admin/destinations/feedback');
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { return; }
    const json = await res.json();
    setFeedbackStats(json.feedback || {});
  };

  useEffect(() => {
    load();
    loadQRCodes();
    loadFeedbackStats();
  }, []);

  const archive = async (id: string) => {
    if (!confirm(t('archiveConfirmation'))) return;
    await fetch(`/api/admin/destinations/${id}?archive=true`, { method: 'DELETE' });
    load();
    loadQRCodes();
    loadFeedbackStats();
  };

  const publish = async (id: string) => {
    const res = await fetch(`/api/admin/destinations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: true }),
    });
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) {
      setError(t('saveFailed'));
      return;
    }
    load();
    loadQRCodes();
    loadFeedbackStats();
  };

  const generateAllQRCodes = async () => {
    try {
      const res = await fetch('/api/admin/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_all: true }),
      });
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) {
        setError(t('failedToLoad'));
        return;
      }
      await loadQRCodes();
      load();
    } catch (e) {
      setError(t('failedToLoad'));
    }
  };

  const generateQRCode = async (destinationId: string) => {
    setQrLoading((current) => ({ ...current, [destinationId]: true }));
    try {
      const res = await fetch('/api/admin/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_id: destinationId }),
      });
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) {
        setError(t('failedToLoad'));
        return;
      }
      const json = await res.json();
      const code = json.qr.code;
      setQrcodes((current) => ({ ...current, [destinationId]: code }));

      const targetUrl = `${window.location.origin}/r/${encodeURIComponent(code)}`;
      const dataUrl = await QRCode.toDataURL(targetUrl, { width: 180, margin: 1, errorCorrectionLevel: 'M' });
      setQrImages((current) => ({ ...current, [destinationId]: dataUrl }));
    } finally {
      setQrLoading((current) => ({ ...current, [destinationId]: false }));
    }
  };

  useEffect(() => {
    const updateQrImages = async () => {
      const entries = Object.entries(qrcodes);
      for (const [destinationId, code] of entries) {
        if (qrImages[destinationId]) continue;
        const targetUrl = `${window.location.origin}/r/${encodeURIComponent(code)}`;
        const dataUrl = await QRCode.toDataURL(targetUrl, { width: 180, margin: 1, errorCorrectionLevel: 'M' });
        setQrImages((current) => ({ ...current, [destinationId]: dataUrl }));
      }
    };

    if (Object.keys(qrcodes).length) updateQrImages();
  }, [qrcodes]);

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>{t('destinations')}</h1>
        <div className="admin-nav">
          <Link href="/admin">{t('adminDashboard')}</Link>
          <Link href="/admin/photo-strip">Photo strip</Link>
          <Link href="/admin/contacts">Contacts</Link>
          <Link href="/admin/feedback">Tourist feedback</Link>
          <button type="button" onClick={generateAllQRCodes}>Generate all QR</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Link
          href="/admin/destinations/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 10,
            background: '#4f46e5',
            color: '#fff',
            fontWeight: 700,
            padding: '11px 16px',
            textDecoration: 'none',
          }}
        >
          + {t('createNewDestination')}
        </Link>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('nameLabel')}</th>
            <th>{t('slugLabel')}</th>
            <th>{t('regionLabel')}</th>
            <th>{t('qrCode')}</th>
            <th>Tourist feedback</th>
            <th>{t('statusLabel')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {destinations.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td><a href={`/destination/${d.slug}`} target="_blank" rel="noreferrer">{d.slug}</a></td>
              <td>{d.region || '—'}</td>
              <td>
                {qrcodes[d.id] ? (
                  <div className="qr-cell">
                    <a href={`/r/${qrcodes[d.id]}`} target="_blank" rel="noreferrer" className="qr-preview-link">
                      {qrImages[d.id] ? (
                        <img src={qrImages[d.id]} alt={`QR code for ${d.name}`} className="qr-preview-image" />
                      ) : (
                        <span className="qr-code-fallback">{qrcodes[d.id]}</span>
                      )}
                    </a>
                    {qrImages[d.id] && (
                      <a href={qrImages[d.id]} download={`qr-${d.slug}.png`} className="qr-download-link">
                        Download
                      </a>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="link-btn"
                    disabled={qrLoading[d.id]}
                    onClick={() => generateQRCode(d.id)}
                  >
                    {qrLoading[d.id] ? t('loading') : t('generateQr')}
                  </button>
                )}
              </td>
              <td>
                {feedbackStats[d.id] ? (
                  <>
                    <strong>{feedbackStats[d.id].averageRating.toFixed(1)}★</strong>
                    <div style={{ fontSize: 12, color: '#64748b' }}>({feedbackStats[d.id].ratingCount} reviews)</div>
                  </>
                ) : (
                  <span style={{ color: '#64748b' }}>No feedback</span>
                )}
              </td>
              <td>{d.published !== false ? t('publishedStatus') : t('draftStatus')}</td>
              <td>
                <Link href={`/admin/destinations/${d.id}`}>{t('editLabel')}</Link>
                {' · '}
                {d.published === false ? (
                  <button type="button" className="link-btn" onClick={() => publish(d.id)}>Publish</button>
                ) : (
                  <button type="button" className="link-btn" onClick={() => archive(d.id)}>{t('archiveLabel')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
