import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../../lib/i18n';
import DestinationForm, { DestinationFormData } from '../../../components/DestinationForm';

export default function EditDestination() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;
  const [initial, setInitial] = useState<DestinationFormData | null>(null);
  const [feedback, setFeedback] = useState<{ averageRating: number | null; ratingCount: number; comments: { rating: number; comment: string | null; photo_urls?: string[]; featured?: boolean; created_at: string }[] } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    fetch(`/api/admin/destinations/${id}`)
      .then(async (res) => {
        if (res.status === 401) { router.push('/admin/login'); return; }
        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        const d = json.destination;
        setInitial({
          name: d.name,
          slug: d.slug,
          region: d.region || '',
          location: d.location || '',
          short_description: d.short_description || '',
          content: d.content || '',
          best_time_to_visit: d.best_time_to_visit || '',
          highlights: (d.highlights || []).join('\n'),
          travel_tips: (d.travel_tips || []).join('\n'),
          cover_image: d.images?.[0] || '',
          gallery_images: (d.images || []).slice(1),
          categories: Array.isArray(d.destination_categories)
            ? d.destination_categories
            : Array.isArray(d.local_foods) && d.local_foods.length
              ? [{ title: 'Local food to try', items: d.local_foods }]
              : [],
          related_slugs: (d.related_slugs || []).join(', '),
          featured: Boolean(d.featured),
          published: d.published !== false,
        });
      })
      .catch(() => setError(t('failedToLoadDestination')));

    fetch(`/api/admin/destinations/${id}/feedback`)
      .then(async (res) => {
        if (res.status === 401) { router.push('/admin/login'); return; }
        if (!res.ok) return;
        const json = await res.json();
        setFeedback(json);
      })
      .catch(() => setFeedback(null));
  }, [id, router]);

  const save = async (data: DestinationFormData) => {
    if (!id || typeof id !== 'string') return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/destinations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        highlights: data.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
        travel_tips: data.travel_tips.split('\n').map((s) => s.trim()).filter(Boolean),
        images: [data.cover_image.trim(), ...data.gallery_images.map((image) => image.trim())].filter(Boolean),
        destination_categories: data.categories.filter((category) => category.title.trim()).map((category) => ({
          title: category.title.trim(),
          items: category.items.filter((item) => item.name.trim()).map((item) => ({ ...item, name: item.name.trim(), description: item.description.trim(), image: item.image.trim() })),
        })),
        related_slugs: data.related_slugs.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || t('saveFailed'));
      return;
    }
    router.push('/admin/destinations');
  };

  if (!initial && !error) return <main className="admin-page"><p>{t('loading')}</p></main>;

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>{t('editDestination')}</h1>
        <Link href="/admin/destinations">← {t('back')}</Link>
      </div>
      {error && <p className="admin-error">{error}</p>}
      {initial && <DestinationForm initial={initial} onSubmit={save} saving={saving} />}

      {feedback && (
        <section style={{ marginTop: 32, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Tourist feedback</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <strong style={{ fontSize: 24 }}>{feedback.averageRating !== null ? `${feedback.averageRating.toFixed(1)}★` : 'No rating yet'}</strong>
            <span style={{ color: '#64748b' }}>({feedback.ratingCount} review{feedback.ratingCount === 1 ? '' : 's'})</span>
          </div>

          {feedback.comments.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {feedback.comments.map((entry, index) => (
                <div key={`${entry.created_at}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <strong>{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</strong>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ color: '#334155', lineHeight: 1.6 }}>{entry.comment || 'No comment provided.'}</div>
                  {entry.photo_urls?.length ? <div className="feedback-admin-photos">{entry.photo_urls.map((photo, photoIndex) => <img key={`${entry.created_at}-${photoIndex}`} className="feedback-admin-photo" src={photo} alt={`Tourist feedback photo ${photoIndex + 1}`} />)}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', margin: 0 }}>No tourist feedback yet for this destination.</p>
          )}
        </section>
      )}
    </main>
  );
}
