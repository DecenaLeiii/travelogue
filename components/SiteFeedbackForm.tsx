import React, { useState } from 'react';

export default function SiteFeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) return setStatus('Please choose a star rating.');
    setSending(true);
    setStatus('');
    try {
      const response = await fetch('/api/destinations/travelogue/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, nickname }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Could not send your feedback.');
      setDone(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send your feedback.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="site-feedback" aria-labelledby="site-feedback-title">
      <p className="panel-label">Feedback</p>
      <h2 id="site-feedback-title">How was your Travelogue experience?</h2>
      {done ? (
        <p className="site-feedback-thanks">Thank you! Your feedback was sent to the Travelogue team.</p>
      ) : (
        <form onSubmit={submit} className="site-feedback-form">
          <div className="site-feedback-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value > 1 ? 's' : ''}`}
                className={value <= (hover || rating) ? 'on' : ''}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(value)}
              >
                ★
              </button>
            ))}
          </div>
          <input
            className="site-feedback-nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={40}
            placeholder="Nickname (optional, we'll assign Anonymous Tourist + a number if blank)"
          />
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Tell us what you liked or how we can improve the Travelogue (optional)"
          />
          <button type="submit" className="cta" disabled={sending}>{sending ? 'Sending...' : 'Send feedback'}</button>
          {status && <p className="site-feedback-status">{status}</p>}
        </form>
      )}
    </section>
  );
}
