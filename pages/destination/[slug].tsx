import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation, translateCategoryTitle, translateCategoryItemText } from '../../lib/i18n';
import { useDestinationTranslations } from '../../lib/useDestinationTranslation';
import { parseContentSections } from '../../lib/content';
import { Destination } from '../../lib/destinations';
import FloatingAssistant from '../../components/FloatingAssistant';
import FeedbackForm from '../../components/FeedbackForm';
import DestinationMap from '../../components/DestinationMap';

type Props = {
  destination: Destination | null;
  related: Destination[];
};

export default function DestinationPage({ destination, related }: Props) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const translations = useDestinationTranslations(lang);

  if (!destination) {
    return (
      <main className="dest-detail">
        <div className="dest-detail-inner">
          <h1>{t('destinationNotFound')}</h1>
          <p>{t('destinationInvalid')}</p>
          <a className="cta" href="/">{t('backToTravelogue')}</a>
        </div>
      </main>
    );
  }

  const images = destination.images?.length ? destination.images : ['/hero.svg'];
  const normalizedImages = images.filter((src) => typeof src === 'string' && src.trim());
  const defaultHeroImage = normalizedImages[0];
  const [selectedImage, setSelectedImage] = useState(defaultHeroImage);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => {
    setSelectedImage(defaultHeroImage);
  }, [defaultHeroImage]);
  const galleryImages = normalizedImages.length > 1 ? normalizedImages.slice(1) : [];
  const destinationCategories = destination.destination_categories?.length
    ? destination.destination_categories
    : destination.local_foods?.length
      ? [{ title: 'Local food to try', items: destination.local_foods }]
      : [];
  const [translated, setTranslated] = useState<{
    name?: string;
    short_description?: string;
    content?: string;
    highlights?: string[];
    travel_tips?: string[];
    region?: string;
    location?: string;
    best_time_to_visit?: string;
    overview?: string;
    full?: string;
    destination_categories?: Array<{ title: string; items: Array<{ name: string; description: string }> }>;
  } | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    const qrCode = destination?.qr_code || destination?.slug;
    if (!qrCode) {
      setQrPreview(null);
      return;
    }

    let isMounted = true;
    const generate = async () => {
      try {
        const route = `${window.location.origin}/r/${encodeURIComponent(qrCode)}`;
        const dataUrl = await QRCode.toDataURL(route, { width: 260, margin: 1, errorCorrectionLevel: 'M' });
        if (isMounted) setQrPreview(dataUrl);
      } catch (error) {
        console.error('Failed to generate QR preview', error);
      }
    };

    generate();
    return () => { isMounted = false; };
  }, [destination]);

  useEffect(() => {
    if (!destination) return;
    if (!lang || lang === 'en') { setTranslated(null); return; }
    const slug = destination.slug;
    fetch(`/api/translations/destination?slug=${encodeURIComponent(slug)}&lang=${encodeURIComponent(lang)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('no translation');
        const j = await res.json();
        const entry = j.translation || {};
        const content = entry.content || '';
        const sect = parseContentSections(content || '');
        setTranslated({
          name: entry.name,
          short_description: entry.short_description,
          content: content,
          highlights: entry.highlights,
          travel_tips: entry.travel_tips,
          region: entry.region,
          location: entry.location,
          best_time_to_visit: entry.best_time_to_visit,
          overview: sect.overview,
          full: sect.full,
          destination_categories: entry.destination_categories,
        });
      })
      .catch(() => setTranslated(null));
  }, [destination, lang]);

  useEffect(() => {
    if (!destination) return;
    fetch(`/api/destinations/${encodeURIComponent(destination.slug)}/feedback`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load rating');
        const data = await res.json();
        setAverageRating(data.averageRating);
        setRatingCount(data.ratingCount || 0);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => {
        setAverageRating(null);
        setRatingCount(0);
        setReviews([]);
      });
  }, [destination]);

  return (
    <main className="dest-detail">
      {lightboxOpen && (
        <div className="image-lightbox" onClick={() => setLightboxOpen(false)}>
          <button type="button" className="lightbox-close" onClick={(event) => { event.stopPropagation(); setLightboxOpen(false); }} aria-label={t('close')}>
            ×
          </button>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={selectedImage} alt={`${destination.name} full view`} />
          </div>
        </div>
      )}
      {qrModalOpen && qrPreview && (
        <div className="modal-backdrop" onClick={() => setQrModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button className="close" onClick={() => setQrModalOpen(false)}>✕</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <img src={qrPreview} alt={`${destination.name} QR code`} style={{ width: 260, height: 260 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={qrPreview} download={`qr-${destination.slug}.png`}                 className="cta">Download QR</a>
                <button
                                  className="secondary-cta"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/r/${encodeURIComponent(destination.qr_code || destination.slug)}`);
                      alert('QR link copied to clipboard');
                    } catch (e) {
                      alert('Copy failed');
                    }
                  }}
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dest-detail-hero" onClick={() => setLightboxOpen(true)} style={{ cursor: 'pointer' }}>
        <img className="dest-detail-hero-image" src={selectedImage} alt={`${destination.name} cover`} onError={(event) => { event.currentTarget.src = '/hero.svg'; }} />
        <div className="dest-detail-hero-shade" />
        <div className="dest-detail-hero-inner">
          <Link href="/" className="dest-back" onClick={(event) => {
            event.stopPropagation();
            if (
              !event.defaultPrevented && event.button === 0 &&
              !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
              window.history.state?.travelogueHasPrevious === true
            ) {
              event.preventDefault();
              router.back();
            }
          }}>{t('back')}</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1>{translated?.name || destination.name}</h1>
              <p className="dest-location">{translated?.location || destination.location || translated?.region || destination.region}</p>
            </div>
            {destination.qr_code ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); setQrModalOpen(true); }} className="qr-link hero-qr-link">
                {t('qrCode')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dest-detail-inner">
        <p className="dest-overview">{translated?.short_description || translated?.overview || destination.short_description}</p>

        <div className="dest-meta-grid">
          {destination.region && (
            <div className="dest-meta-card">
              <strong>{t('regionLabel')}</strong>
              <span>{translated?.region || destination.region}</span>
            </div>
          )}
          {destination.location && (
            <div className="dest-meta-card">
              <strong>{t('locationLabel')}</strong>
              <span>{translated?.location || destination.location}</span>
            </div>
          )}
          {destination.best_time_to_visit && (
            <div className="dest-meta-card">
              <strong>{t('bestTimeLabel')}</strong>
              <span>{translated?.best_time_to_visit || destination.best_time_to_visit}</span>
            </div>
          )}
        </div>

        <DestinationMap destination={destination} />

        {(translated?.full || translated?.content || destination.content) && (
          <section className="dest-section">
            <h2>{t('overviewLabel')}</h2>
            <div className="dest-content">{translated?.full || translated?.content || destination.content}</div>
          </section>
        )}

        {((translated?.highlights && translated.highlights.length > 0) || (destination.highlights && destination.highlights.length > 0)) && (
          <section className="dest-section">
            <h2>{t('highlightsLabel')}</h2>
            <ul className="dest-list">
              {(translated?.highlights || destination.highlights || []).map((h: string) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        {((translated?.travel_tips && translated.travel_tips.length > 0) || (destination.travel_tips && destination.travel_tips.length > 0)) && (
          <section className="dest-section">
            <h2>{t('travelTipsLabel')}</h2>
            <ul className="dest-list dest-tips">
              {(translated?.travel_tips || destination.travel_tips || []).map((t: string) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        {galleryImages.length > 0 && (
          <section className="dest-section">
            <h2>{t('galleryLabel')}</h2>
            <div className="dest-gallery">
              {galleryImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={`gallery-thumb ${src === selectedImage ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedImage(src);
                    setLightboxOpen(true);
                  }}
                  aria-label={`${t('viewImage')} ${i + 1}`}
                >
                  <img src={src} alt={`${destination.name} gallery photo ${i + 1}`} onError={(event) => { event.currentTarget.src = '/hero.svg'; }} />
                </button>
              ))}
            </div>
          </section>
        )}

        {destinationCategories.map((category, categoryIndex) => {
          const translatedCategory = translated?.destination_categories?.[categoryIndex];
          return (
          <section className="dest-section destination-category-section" key={`${category.title}-${categoryIndex}`}>
            <h2>{translatedCategory?.title || translateCategoryTitle(category.title, t)}</h2>
            <div className="destination-category-grid">
              {category.items.map((item, itemIndex) => {
                const translatedItem = translatedCategory?.items?.[itemIndex];
                const itemName = translatedItem?.name || translateCategoryItemText(item.name, lang);
                return (
                <article className="destination-category-card" key={`${item.name}-${itemIndex}`}>
                  {item.image ? (
                    <button
                      type="button"
                      className="destination-category-image-button"
                      onClick={() => {
                        setSelectedImage(item.image as string);
                        setLightboxOpen(true);
                      }}
                      aria-label={`${t('viewImage')} ${itemName}`}
                    >
                      <img src={item.image} alt={itemName} loading="lazy" onError={(event) => { event.currentTarget.src = '/hero.svg'; }} />
                    </button>
                  ) : null}
                  <div className="destination-category-card-copy">
                    <h3>{itemName}</h3>
                    {item.description ? <p>{translatedItem?.description || translateCategoryItemText(item.description, lang)}</p> : null}
                  </div>
                </article>
                );
              })}
            </div>
          </section>
          );
        })}

        <section className="dest-section feedback-panel">
          <h2>{t('ratingHeading')}</h2>
          <div className="feedback-summary">
            <div>
              <strong>{t('ratingPrompt')}</strong>
            </div>
            {averageRating !== null && (
              <div className="feedback-rating-summary">
                <span className="feedback-average">{averageRating.toFixed(1)}</span>
                <span> / 5</span>
                <span className="feedback-count">({ratingCount} {t('ratings')})</span>
              </div>
            )}
          </div>

          <FeedbackForm
            slug={destination.slug}
            t={t as any}
            prompt=""
            onSubmitted={(submitted) => {
              setRatingCount((count) => count + 1);
              setAverageRating((prev) => (prev ? Math.round(((prev * ratingCount + submitted) / (ratingCount + 1)) * 10) / 10 : submitted));
            }}
          />

          {reviews.length > 0 && (
            <div className="destination-review-list">
              <h3>What visitors say</h3>
              {reviews.map((review) => (
                <article key={review.id} className="destination-review">
                  <div className="destination-review-head">
                    <strong>{review.nickname || 'Anonymous Tourist'}</strong>
                    <span className="tcard-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    <span className="tcard-date">{new Date(review.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {review.comment && <p>{review.comment}</p>}
                  {review.photo_urls.length > 0 && (
                    <div className="destination-review-photos">
                      {review.photo_urls.slice(0, 5).map((photo: string, i: number) => (
                        <img key={`${review.id}-${i}`} src={photo} alt={`${destination.name} visitor photo ${i + 1}`} loading="lazy" />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {related.length > 0 && (
          <section className="dest-section">
            <h2>{t('relatedDestinationsLabel')}</h2>
            <div className="related-grid">
              {related.map((r) => (
                <Link key={r.slug} href={`/destination/${r.slug}`} className="related-card" data-track="related-destination">
                  <div className="related-card-media">
                    <img src={(r.images && r.images.find((image) => image?.trim())) || '/hero.svg'} alt={`${r.name} cover`} onError={(event) => { event.currentTarget.src = '/hero.svg'; }} />
                  </div>
                  <div className="related-card-body">
                    <strong>{translations[r.slug]?.name || r.name}</strong>
                    <span>{translations[r.slug]?.short_description || r.short_description}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <FloatingAssistant destinationSlug={destination.slug} destinationName={translated?.name || destination.name} />
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
  if (!slug) return { notFound: true };

  // Import server-only data functions dynamically so bundler doesn't include
  // server modules (like `fs`) in client bundles.
  const { getDestinationBySlug, getRelatedDestinations } = await import('../../lib/destinations');
  const destination = await getDestinationBySlug(slug);
  if (!destination || destination.published === false) {
    return { props: { destination: null, related: [] } };
  }

  const related = await getRelatedDestinations(destination.related_slugs || []);
  return { props: { destination, related } };
};
