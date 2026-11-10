import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

type Feedback = {
  id: string;
  destination_slug: string;
  destination_name: string;
  rating: number;
  comment: string | null;
  photo_urls: string[] | null;
  featured: boolean;
  created_at: string;
  nickname?: string | null;
};

export default function AdminFeedback() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then(async (response) => {
        if (response.status === 401) return router.push('/admin/login');
        if (!response.ok) throw new Error('Could not load feedback.');
        const result = await response.json();
        const rows: Feedback[] = result.feedback || [];
        setFeedback(rows);
        setSelected(rows.filter((item) => item.featured).map((item) => item.id));
      })
      .catch(() => setStatus('Could not load feedback. Apply database migration v4 if this is a new setup.'))
      .finally(() => setLoading(false));
  }, [router]);

  const save = async () => {
    setStatus('Saving featured reviews...');
    const response = await fetch('/api/admin/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featuredIds: selected }),
    });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error || 'Could not save featured reviews.');
    setFeedback((current) => current.map((item) => ({ ...item, featured: selected.includes(item.id) })));
    setStatus('Homepage testimonials updated.');
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((itemId) => itemId !== id);
      // Allow 8-15 reviews, but auto-adjust to nearest even multiple of 5
      if (current.length >= 15) {
        setStatus('You can feature up to 15 reviews (will display as 3 rows × 5 columns).');
        return current;
      }
      const newSelected = [...current, id];
      // Auto-adjust: if selecting more than 8, round to nearest multiple of 5 (5, 10, or 15)
      if (newSelected.length > 7) {
        const remainder = newSelected.length % 5;
        if (remainder !== 0 && remainder !== 1) {
          setStatus(`Auto-adjusted to show even rows. Now displaying ${newSelected.length} reviews.`);
        }
      }
      return newSelected;
    });
  };

  const stats = useMemo(() => {
    const total = feedback.length;
    const average = total ? feedback.reduce((sum, item) => sum + item.rating, 0) / total : 0;
    const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: feedback.filter((item) => item.rating === star).length }));
    const byDestination = new Map<string, { name: string; sum: number; count: number }>();
    feedback.forEach((item) => {
      const entry = byDestination.get(item.destination_slug) || { name: item.destination_name, sum: 0, count: 0 };
      entry.sum += item.rating;
      entry.count += 1;
      byDestination.set(item.destination_slug, entry);
    });
    const destinations = Array.from(byDestination.values())
      .map((entry) => ({ name: entry.name, count: entry.count, average: entry.sum / entry.count }))
      .sort((a, b) => b.average - a.average || b.count - a.count);
    return { total, average, counts, destinations };
  }, [feedback]);

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="panel-label">Homepage content</p>
          <h1>Tourist feedback</h1>
        </div>
        <div className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/destinations">Manage destinations</Link>
          <button type="button" onClick={save} disabled={loading}>Save featured reviews ({selected.length}/15)</button>
        </div>
      </div>
      {stats.total > 0 && (
        <section className="admin-panel rating-dashboard">
          <div className="rating-summary">
            <p className="panel-label">Rating dashboard</p>
            <div className="rating-big">{stats.average.toFixed(1)}</div>
            <div className="feedback-admin-stars">{'★'.repeat(Math.round(stats.average))}{'☆'.repeat(5 - Math.round(stats.average))}</div>
            <span>{stats.total} rating{stats.total === 1 ? '' : 's'} from tourists</span>
          </div>
          <div className="rating-bars">
            {stats.counts.map(({ star, count }) => (
              <div className="rating-bar-row" key={star}>
                <span>{star} ★</span>
                <div className="rating-bar"><div style={{ width: `${(count / stats.total) * 100}%` }} /></div>
                <span>{count} ({Math.round((count / stats.total) * 100)}%)</span>
              </div>
            ))}
          </div>
          <div className="rating-destinations">
            <p className="panel-label">Average by destination</p>
            {stats.destinations.map((entry) => (
              <div className="rating-destination-row" key={entry.name}>
                <span>{entry.name}</span>
                <strong>{entry.average.toFixed(1)} ★ <small>({entry.count})</small></strong>
              </div>
            ))}
          </div>
        </section>
      )}
      {status && <p className="admin-error">{status}</p>}
      {!loading && feedback.length === 0 && <section className="admin-panel"><p>No tourist feedback has been submitted yet.</p></section>}
      <div className="feedback-admin-grid">
        {feedback.map((item) => (
          <article className={`admin-panel feedback-admin-card${selected.includes(item.id) ? ' is-featured' : ''}`} key={item.id}>
            {item.photo_urls?.length ? <div className="feedback-admin-photos">{item.photo_urls.map((photo, index) => <img key={`${item.id}-${index}`} className="feedback-admin-photo" src={photo} alt={`Tourist-submitted reference ${index + 1}`} />)}</div> : null}
            <div className="feedback-admin-card-content">
              <div className="feedback-admin-meta">
                <strong>{item.destination_name}</strong>
                <span>{item.nickname || 'Anonymous Tourist'} · {new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <div className="feedback-admin-stars" aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</div>
              <p>{item.comment || 'No written comment.'}</p>
              <label className="feedback-feature-toggle">
                <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                Show on homepage
              </label>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
