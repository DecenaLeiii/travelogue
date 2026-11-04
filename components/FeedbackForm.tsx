import React, { useState } from 'react';

type Translate = (key: string) => string;

const FALLBACK: Record<string, string> = {
  pleaseSelectRating: 'Please select a star rating.',
  ratingPrompt: 'How would you rate this destination?',
  stars: 'stars',
  commentLabel: 'Comments',
  ratingPlaceholder: 'Tell us what you liked or what could be better...',
  saving: 'Saving...',
  submitFeedback: 'Submit feedback',
  ratingThankYou: 'Thank you for your feedback!',
  failedToLoad: 'Could not send your feedback. Please try again.',
};

const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 15;

// Resize big phone photos in the browser so the upload stays under the hosting body limit.
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

export default function FeedbackForm({ slug, t, heading, prompt, onSubmitted }: {
  slug: string;
  t?: Translate;
  heading?: string;
  prompt?: string;
  onSubmitted?: (rating: number) => void;
}) {
  const tr = (key: string) => {
    const value = t ? t(key) : '';
    return value && value !== key ? value : FALLBACK[key] || key;
  };
  const [rating, setRating] = useState(0);
  const [nickname, setNickname] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating) return setMessage(tr('pleaseSelectRating'));
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/destinations/${encodeURIComponent(slug)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, nickname, photoData: photos }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || tr('failedToLoad'));
      const submitted = rating;
      setRating(0);
      setComment('');
      setNickname('');
      setPhotos([]);
      setMessage(tr('ratingThankYou'));
      onSubmitted?.(submitted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr('failedToLoad'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {heading && <h2>{heading}</h2>}
      {prompt !== '' && (
        <div className="feedback-summary">
          <div><strong>{prompt || tr('ratingPrompt')}</strong></div>
        </div>
      )}

      <div className="star-rating" aria-label={prompt || tr('ratingPrompt')}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            className={`star ${value <= rating ? 'selected' : ''}`}
            onClick={() => setRating(value)}
            aria-label={`${value} ${tr('stars')}`}
          >
            ★
          </button>
        ))}
      </div>

      <label className="feedback-field">
        Nickname (optional)
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={40}
          placeholder="Leave blank to appear as Anonymous Tourist + number"
        />
      </label>

      <label className="feedback-field">
        {tr('commentLabel')}
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tr('ratingPlaceholder')} rows={4} maxLength={2000} />
      </label>

      <label className="feedback-field feedback-photo-field">
        Add reference photos (1–{MAX_PHOTOS} photos, {photos.length}/{MAX_PHOTOS} added, up to {MAX_PHOTO_MB} MB each)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={photos.length >= MAX_PHOTOS || submitting}
          onChange={async (event) => {
            const input = event.currentTarget;
            const picked = Array.from(input.files || []);
            input.value = '';
            const room = MAX_PHOTOS - photos.length;
            const tooBig = picked.filter((file) => file.size > MAX_PHOTO_MB * 1024 * 1024);
            const notes: string[] = [];
            if (tooBig.length) notes.push(`${tooBig.length} photo(s) skipped: each photo must be ${MAX_PHOTO_MB} MB or smaller.`);
            const files = picked.filter((file) => file.size <= MAX_PHOTO_MB * 1024 * 1024);
            if (files.length > room) notes.push(`Limit reached: you can attach up to ${MAX_PHOTOS} photos. Only the first ${room} were added.`);
            setMessage(notes.join(' '));
            try {
              const reads = await Promise.all(files.slice(0, room).map(shrinkImage));
              setPhotos((current) => [...current, ...reads].slice(0, MAX_PHOTOS));
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Could not read that image.');
            }
          }}
        />
      </label>
      {photos.length > 0 && (
        <div className="feedback-photo-previews">
          {photos.map((photo, index) => (
            <div className="feedback-photo-preview" key={`${photo.slice(-24)}-${index}`}>
              <img src={photo} alt={`Feedback attachment ${index + 1}`} />
              <button type="button" onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}>×</button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={submit} disabled={submitting} className="feedback-submit">
        {submitting ? tr('saving') : tr('submitFeedback')}
      </button>
      {message && <p className="feedback-message">{message}</p>}
    </>
  );
}
