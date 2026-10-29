import { useEffect, useState } from 'react';
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
      if (current.length >= 6) {
        setStatus('You can feature up to 6 reviews.');
        return current;
      }
      return [...current, id];
    });
  };

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
          <button type="button" onClick={save} disabled={loading}>Save featured reviews ({selected.length}/6)</button>
        </div>
      </div>
      <p className="feedback-admin-intro">Choose up to six approved-by-you reviews to show below destinations on the homepage. New submissions are never featured automatically.</p>
      {status && <p className="admin-error">{status}</p>}
      {!loading && feedback.length === 0 && <section className="admin-panel"><p>No tourist feedback has been submitted yet.</p></section>}
      <div className="feedback-admin-grid">
        {feedback.map((item) => (
          <article className={`admin-panel feedback-admin-card${selected.includes(item.id) ? ' is-featured' : ''}`} key={item.id}>
            {item.photo_urls?.length ? <div className="feedback-admin-photos">{item.photo_urls.map((photo, index) => <img key={`${item.id}-${index}`} className="feedback-admin-photo" src={photo} alt={`Tourist-submitted reference ${index + 1}`} />)}</div> : null}
            <div className="feedback-admin-card-content">
              <div className="feedback-admin-meta">
                <strong>{item.destination_name}</strong>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
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
