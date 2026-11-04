import React, { useRef, useState } from 'react';

type Review = {
  id: string;
  destination_slug: string;
  destination_name: string;
  rating: number;
  comment: string | null;
  photo_urls: string[] | null;
  created_at: string;
  nickname?: string | null;
};

export default function TestimonialCard({ review }: { review: Review }) {
  const photos = (review.photo_urls || []).slice(0, 5);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const date = new Date(review.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
    <article className={`tcard${photos.length ? '' : ' tcard-plain'}`}>
      {photos.length > 0 && (
        <div
          className="tcard-track"
          ref={trackRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {photos.map((photo, i) => (
            <img key={`${review.id}-${i}`} src={photo} alt={`${review.destination_name} visitor photo ${i + 1}`} loading="lazy" onClick={() => setViewer(i)} />
          ))}
        </div>
      )}
      <div className="tcard-glass">
        <p className="tcard-quote">“{review.comment || 'A visitor rated this destination.'}”</p>
        <strong className="tcard-name">{review.nickname || 'Anonymous Tourist'}</strong>
        <a href={`/destination/${review.destination_slug}`} className="tcard-destination">{review.destination_name}</a>
        <span className="tcard-date">{date}</span>
        <span className="tcard-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
      </div>
      {photos.length > 1 && (
        <div className="tcard-dots" aria-hidden="true">
          {photos.map((_, i) => <span key={i} className={i === index ? 'on' : ''} />)}
        </div>
      )}
    </article>
    {viewer !== null && (
      <div className="image-lightbox" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
        <img src={photos[viewer]} alt={`Visitor photo `} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} onClick={(e) => e.stopPropagation()} />
        {photos.length > 1 && (
          <>
            <button type="button" className="tcard-nav tcard-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setViewer((viewer + photos.length - 1) % photos.length); }}>{'\u2039'}</button>
            <button type="button" className="tcard-nav tcard-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setViewer((viewer + 1) % photos.length); }}>{'\u203A'}</button>
          </>
        )}
        <button type="button" className="secondary-cta" style={{ position: 'absolute', top: 18, right: 18 }} onClick={() => setViewer(null)}>Close</button>
      </div>
    )}
    </>
  );
}
