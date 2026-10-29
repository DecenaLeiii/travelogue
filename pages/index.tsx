import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import SmartAssistant from '../components/SmartAssistant';
import supabase from '../lib/supabaseClient';
import { GetServerSideProps } from 'next';
import { getPublishedDestinations } from '../lib/destinations';
import { useTranslation } from '../lib/i18n';
import { DEFAULT_PROMO_SPOTS, PromoSpot } from '../lib/promoSpots';
import { useSiteLogo } from '../lib/useSiteBranding';
import type { CultureBlock } from '../lib/siteBranding';

type Destination = {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  images?: string[];
  qr_code?: string | null;
  featured?: boolean;
  region?: string;
};

type MostViewedDestination = Destination & {
  view_count: number;
};

type FeaturedReview = {
  id: string;
  destination_slug: string;
  destination_name: string;
  rating: number;
  comment: string | null;
  photo_urls: string[] | null;
  created_at: string;
};

type HomepageCultureContent = {
  tourism_heading: string;
  tourism_description: string;
  mission_heading: string;
  mission_text: string;
  key_programs_heading: string;
  key_programs: string[];
  contact_heading: string;
  contact_email: string;
  contact_phone: string;
  culture_hidden: string[];
  culture_blocks: CultureBlock[];
};

const EMPTY_HOMEPAGE_CULTURE: HomepageCultureContent = {
  tourism_heading: '', tourism_description: '', mission_heading: '', mission_text: '',
  key_programs_heading: '', key_programs: [], contact_heading: '', contact_email: '', contact_phone: '',
  culture_hidden: [], culture_blocks: [],
};

export default function Home({ initialDestinations }: { initialDestinations?: Destination[] }) {
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations || []);
  const [mostViewedDestinations, setMostViewedDestinations] = useState<MostViewedDestination[]>(
    (initialDestinations || []).slice(0, 6).map((destination) => ({ ...destination, view_count: 0 }))
  );
  const [featuredReviews, setFeaturedReviews] = useState<FeaturedReview[]>([]);
  const [promoSpots, setPromoSpots] = useState<PromoSpot[]>(DEFAULT_PROMO_SPOTS);
  const [heroDescription, setHeroDescription] = useState('');
  const [heroVideo, setHeroVideo] = useState('/TOURISM%20VIDEO.mp4');
  const [cultureContent, setCultureContent] = useState<HomepageCultureContent>(EMPTY_HOMEPAGE_CULTURE);
  const siteLogo = useSiteLogo();
  const { t, lang } = useTranslation();
  const [qrOpen, setQrOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  useEffect(() => {
    fetch('/api/admin/promo-spots')
      .then((response) => response.json())
      .then((json) => setPromoSpots(Array.isArray(json.spots) ? json.spots : DEFAULT_PROMO_SPOTS))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/site-branding')
      .then((response) => response.json())
      .then((branding) => {
        setHeroDescription(typeof branding.hero_description === 'string' ? branding.hero_description : '')
        if (typeof branding.hero_video === 'string' && branding.hero_video) setHeroVideo(branding.hero_video)
      })
      .catch(() => {});
    fetch('/api/site-branding')
      .then((response) => response.json())
      .then((branding) => setCultureContent({
        tourism_heading: branding.tourism_heading || '',
        tourism_description: branding.tourism_description || '',
        mission_heading: branding.mission_heading || '',
        mission_text: branding.mission_text || '',
        key_programs_heading: branding.key_programs_heading || '',
        key_programs: Array.isArray(branding.key_programs) ? branding.key_programs : [],
        contact_heading: branding.contact_heading || '',
        contact_email: branding.contact_email || '',
        contact_phone: branding.contact_phone || '',
        culture_hidden: Array.isArray(branding.culture_hidden) ? branding.culture_hidden : [],
        culture_blocks: Array.isArray(branding.culture_blocks) ? branding.culture_blocks : [],
      }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/featured-feedback')
      .then((response) => response.json())
      .then((json) => setFeaturedReviews(Array.isArray(json.feedback) ? json.feedback : []))
      .catch(() => setFeaturedReviews([]));
  }, []);

  useEffect(() => {
    fetch('/api/destinations/most-viewed')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load most-viewed destinations');
        const json = await response.json();
        setMostViewedDestinations(Array.isArray(json.destinations) ? json.destinations : []);
      })
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (initialDestinations && initialDestinations.length) {
      setDestinations(initialDestinations as Destination[]);
      return;
    }

    const load = async () => {
      if (!supabase) {
        console.warn('Supabase client not configured; skipping client-side fetch');
        return;
      }
      const { data, error } = await supabase.from('destinations').select('id,name,slug,short_description,images').order('featured', { ascending: false }).limit(50);
      if (error) {
        console.error('Failed to load destinations', error);
        return;
      }
      setDestinations(data || []);
    };
    load();
  }, []);

  return (
    <div>
      <div className="hero has-nav">
        <video key={heroVideo} autoPlay muted loop playsInline className="hero-video" poster="/hero.svg">
          <source src={heroVideo} type={heroVideo.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
          Your browser does not support the video tag.
        </video>
        <div className="overlay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 860, textAlign: 'center' }}>
              <img src="/LOVE VIDEO.png" alt="Love the Philippines" style={{ width: 'min(82vw, 820px)', maxWidth: 820, height: 'auto', display: 'block', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.28))' }} onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
              <p style={{ maxWidth: 760, textAlign: 'center', fontSize: 18, lineHeight: 1.8, margin: 0, color: '#f2f7ff' }}>{lang === 'en' && heroDescription ? heroDescription : t('homeHeroDesc')}</p>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a className="cta" href="#destinations">{t('exploreDestinations')}</a>
              <button className="secondary-cta" type="button" onClick={() => setQrOpen(true)}>{t('viewQr')}</button>
            </div>
            <div className="hero-pill-row">
              <span className="hero-pill">{t('beachGetaway')}</span>
              <span className="hero-pill">{t('islandCulture')}</span>
              <span className="hero-pill">{t('natureAdventures')}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="home-main">
        <button
          type="button"
          className="floating-assistant-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAssistantOpen((open) => !open);
          }}
          aria-label={assistantOpen ? 'Hide assistant' : 'Open assistant'}
          title={assistantOpen ? 'Hide assistant' : 'Open assistant'}
        >
          <span className="assistant-bubble">AI</span>
        </button>

        {assistantOpen && (
          <div className="assistant-panel open assistant-floating-panel" onClick={(e) => e.stopPropagation()}>
            <div className="assistant-floating-shell" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
                className="assistant-close-button"
              >
                ×
              </button>
              <div className="assistant-floating-chat">
                <SmartAssistant />
              </div>
            </div>
          </div>
        )}

        <div className="home-content">
          <section className="most-viewed-section" aria-labelledby="most-viewed-title">
            <div className="most-viewed-heading">
              <h2 id="most-viewed-title">{t('mostViewedDestinations')}</h2>
              <a href="#destinations">{t('seeAll')}</a>
            </div>
            <div className="most-viewed-row">
              {mostViewedDestinations.map((destination) => {
                const image = destination.images?.find((src) => typeof src === 'string' && src.trim()) || '/hero.svg';
                return (
                  <a
                    className="most-viewed-card"
                    href={`/destination/${destination.slug}`}
                    key={destination.id || destination.slug}
                  >
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        if (!event.currentTarget.src.endsWith('/hero.svg')) event.currentTarget.src = '/hero.svg';
                      }}
                    />
                    <span>{destination.name}</span>
                  </a>
                );
              })}
            </div>
          </section>

          <section className="tourism-culture-section" aria-labelledby="tourism-culture-title">
            <h2 id="tourism-culture-title">
              {lang === 'en' && cultureContent.tourism_heading ? cultureContent.tourism_heading : t('tourismHeading')}
            </h2>
            <div className="tourism-culture-card">
              <div className="culture-logo-panel">
                <img
                  src={siteLogo}
                  alt="Department of Tourism"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="culture-content">
                <p className="culture-intro">
                  {lang === 'en' && cultureContent.tourism_description ? cultureContent.tourism_description : t('tourismDescription')}
                </p>
                {!cultureContent.culture_hidden.includes('mission') && (
                <section className="culture-mission">
                  <h3>{lang === 'en' && cultureContent.mission_heading ? cultureContent.mission_heading : t('mission')}</h3>
                  <p>{lang === 'en' && cultureContent.mission_text ? cultureContent.mission_text : t('missionText')}</p>
                </section>
                )}
                <div className="culture-details-grid">
                  {!cultureContent.culture_hidden.includes('programs') && (
                  <section className="culture-detail">
                    <h3>{lang === 'en' && cultureContent.key_programs_heading ? cultureContent.key_programs_heading : t('keyPrograms')}</h3>
                    <ul className="culture-program-list">
                      {(lang === 'en' && cultureContent.key_programs.length ? cultureContent.key_programs : [t('tourismPromotion'), t('communityBasedTourism'), t('capacityBuilding'), t('qualityAssurance')]).map((program, index) => (
                        <li key={`${index}-${program}`}>{program}</li>
                      ))}
                    </ul>
                  </section>
                  )}
                  {!cultureContent.culture_hidden.includes('contact') && (
                  <section className="culture-detail">
                    <h3>{lang === 'en' && cultureContent.contact_heading ? cultureContent.contact_heading : t('contactHeading')}</h3>
                    <div className="culture-contact-list">
                      <div className="culture-contact-item">
                        <strong>{t('emailLabel')}</strong>
                        <a href={`mailto:${cultureContent.contact_email || 'dot-feedback@tourism.gov.ph'}`}>
                          {cultureContent.contact_email || 'dot-feedback@tourism.gov.ph'}
                        </a>
                      </div>
                      <div className="culture-contact-item">
                        <strong>{t('phoneLabel')}</strong>
                        <a href={`tel:${(cultureContent.contact_phone || '+63 (2) 8459-5200').replace(/[^+\d]/g, '')}`}>
                          {cultureContent.contact_phone || '+63 (2) 8459-5200'}
                        </a>
                      </div>
                    </div>
                  </section>
                  )}
                  {cultureContent.culture_blocks.filter((block) => !block.archived).map((block) => (
                    <section className="culture-detail" key={block.id}>
                      <h3>{block.title}</h3>
                      {block.kind === 'list' ? (
                        <ul className="culture-program-list">
                          {block.body.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}
                        </ul>
                      ) : (
                        block.body && <p style={{ whiteSpace: 'pre-wrap' }}>{block.body}</p>
                      )}
                      {block.kind === 'location' && (
                        <div className="culture-contact-list">
                          {block.address && (
                            <div className="culture-contact-item">
                              <strong>{t('locationLabel')}</strong>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(block.address)}`} target="_blank" rel="noreferrer">{block.address}</a>
                            </div>
                          )}
                          {block.phone && (
                            <div className="culture-contact-item">
                              <strong>{t('phoneLabel')}</strong>
                              <a href={`tel:${block.phone.replace(/[^+\d]/g, '')}`}>{block.phone}</a>
                            </div>
                          )}
                          {block.email && (
                            <div className="culture-contact-item">
                              <strong>{t('emailLabel')}</strong>
                              <a href={`mailto:${block.email}`}>{block.email}</a>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="promo-marquee" aria-label="Featured travel spots">
            <div className="promo-track">
              {promoSpots.concat(promoSpots).map((spot, index) => (
                  <div className="promo-card" key={`${spot.title}-${index}`}>
                    <div className="promo-image" style={{ backgroundImage: `url(${spot.image})` }} />
                    <div className="promo-overlay" />
                    <div className="promo-label">{spot.title}</div>
                  </div>
                ))}
            </div>
          </div>

          {qrOpen && (
            <div className="modal-backdrop" onClick={() => setQrOpen(false)}>
              <div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:420}}>
                <button className="close" onClick={()=>setQrOpen(false)}>✕</button>
                <div style={{display:'flex',flexDirection:'column',gap:12,alignItems:'center'}}>
                  <img src="/qr-travelogue.svg" alt="QR Travelogue Large" style={{width:320,height:320}} />
                  <div style={{display:'flex',gap:8}}>
                    <a href="/qr-travelogue.svg" download="travelogue-qr.svg" className="read-more">Download QR</a>
                    <button className="details-btn" onClick={async ()=>{ try{ await navigator.clipboard.writeText(shareUrl); alert('Share URL copied to clipboard') }catch(e){ alert('Copy failed') } }}>Copy link</button>
                  </div>
                  <div style={{fontSize:13,color:'#64748b',textAlign:'center'}}>Scan this QR to open the travelogue on mobile, or download to print/share.</div>
                </div>
              </div>
            </div>
          )}

          <h2 id="destinations">{t('featuredDestinations')}</h2>
          <div>
            <SearchableDestinations initial={destinations} />
          </div>
          {featuredReviews.length > 0 && (
            <section className="home-testimonials" aria-labelledby="home-testimonials-title">
              <div className="home-testimonials-heading">
                <p className="panel-label">Traveler stories</p>
                <h2 id="home-testimonials-title">What visitors are saying</h2>
              </div>
              <div className="home-testimonial-grid">
                {featuredReviews.map((review) => (
                  <article className="home-testimonial" key={review.id}>
                    <div className="home-testimonial-topline">
                      <span className="home-testimonial-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      <time>{new Date(review.created_at).toLocaleDateString()}</time>
                    </div>
                    <p className="home-testimonial-quote">{review.comment || 'A visitor rated this destination.'}</p>
                    {review.photo_urls?.length ? (
                      <div className="home-testimonial-photos">
                        {review.photo_urls.slice(0, 3).map((photo, index) => (
                          <img key={`${review.id}-${index}`} src={photo} alt={`${review.destination_name} visitor photo ${index + 1}`} loading="lazy" />
                        ))}
                      </div>
                    ) : null}
                    <a href={`/destination/${review.destination_slug}`} className="home-testimonial-destination">{review.destination_name}</a>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function SearchableDestinations({ initial }: { initial: Destination[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [modal, setModal] = useState<Destination | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [qrModal, setQrModal] = useState<{ destination: Destination; image: string } | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('travelogue_favs') : null;
      if (raw) setFavorites(JSON.parse(raw));
    } catch (err) {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const buildQrImages = async () => {
      const next: Record<string, string> = {};
      for (const d of initial) {
        const code = d.qr_code || d.slug;
        if (!code) continue;
        try {
          const url = `${window.location.origin}/r/${encodeURIComponent(code)}`;
          next[d.id] = await QRCode.toDataURL(url, { width: 160, margin: 1, errorCorrectionLevel: 'M' });
        } catch (err) {
          // ignore QR preview generation errors, fallback to text link below
        }
      }
      if (!cancelled) setQrImages(next);
    };

    if (initial.length) {
      buildQrImages();
    }

    return () => { cancelled = true; };
  }, [initial]);

  const toggleFav = (id: string) => {
    setFavorites((cur) => {
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : [id, ...cur.filter((x) => x !== id)];
      try { localStorage.setItem('travelogue_favs', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };
  const filtered = initial.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));
  const favoriteRank = new Map(favorites.map((id, index) => [id, index]));
  const orderedDestinations = [...filtered].sort((a, b) => {
    const aFav = favoriteRank.get(a.id);
    const bFav = favoriteRank.get(b.id);
    const aPriority = aFav === undefined ? 1 : 0;
    const bPriority = bFav === undefined ? 1 : 0;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (aFav !== undefined && bFav !== undefined) return aFav - bFav;
    return initial.findIndex((d) => d.id === a.id) - initial.findIndex((d) => d.id === b.id);
  });

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchDestinations')}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #eee' }}
        />
      </div>
      <div className="card-row">
        {orderedDestinations.map((d) => {
          const coverImage = (d.images && d.images.find((image) => typeof image === 'string' && image.trim())) || '/hero.svg';
          return (
            <div key={d.id} style={{ position: 'relative' }}>
              <div
                className="dest-card alt"
                role="button"
                tabIndex={0}
                onClick={() => setModal(d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setModal(d); }}
              >
                <div className="card-media">
                  <img
                    className="destination-card-image"
                    src={coverImage}
                    alt={`${d.name} destination cover`}
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (!image.src.endsWith('/hero.svg')) image.src = '/hero.svg';
                      else image.style.display = 'none';
                    }}
                  />
                  <div className="card-badge-row">
                    {d.featured && <span className="card-badge featured">Featured</span>}
                    {d.region && <span className="card-badge">{d.region}</span>}
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="dest-title">{d.name}</div>
                    {d.slug ? (
                      qrImages[d.id] ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setQrModal({ destination: d, image: qrImages[d.id] }); }}
                          className="qr-link qr-mini"
                          title={t('viewQr')}
                          aria-label={`Show QR code for ${d.name}`}
                        >
                          <img src={qrImages[d.id]} alt={`${d.name} QR code`} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (d.qr_code || d.slug) setQrModal({ destination: d, image: '' }); }}
                          className="qr-link"
                          title={t('viewQr')}
                        >
                          QR
                        </button>
                      )
                    ) : null}
                  </div>
                  <div className="meta">{d.short_description}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    <a className="read-more" href={`/destination/${d.slug}`} onClick={(e)=>e.stopPropagation()}>{t('readMore')}</a>
                    {d.slug ? (
                      <a href={`/r/${encodeURIComponent(d.qr_code || d.slug)}`} target="_blank" rel="noreferrer" className="read-more">{t('qrCode')}</a>
                    ) : null}
                  </div>
                </div>
              </div>
              <button className="fav-btn" title={t('toggleFavorite')} onClick={(e) => { e.stopPropagation(); toggleFav(d.id as string); }} style={{ position: 'absolute', right: 12, top: 12 }}>
                {favorites.includes(d.id) ? '💖' : '🤍'}
              </button>
            </div>
          );
        })}
      </div>
      {qrModal && (
        <div className="modal-backdrop" onClick={() => setQrModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button className="close" onClick={() => setQrModal(null)}>✕</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <img src={qrModal.image || `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`${window.location.origin}/r/${encodeURIComponent(qrModal.destination.qr_code || qrModal.destination.slug)}`)}`} alt={`${qrModal.destination.name} QR code`} style={{ width: 260, height: 260 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={qrModal.image || `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`${window.location.origin}/r/${encodeURIComponent(qrModal.destination.qr_code || qrModal.destination.slug)}`)}`} download={`qr-${qrModal.destination.slug}.png`} className="read-more">Download QR</a>
                <button className="details-btn" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/r/${encodeURIComponent(qrModal.destination.qr_code || qrModal.destination.slug)}`); alert('QR link copied to clipboard'); } catch (e) { alert('Copy failed'); } }}>Copy link</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {modal && <Modal dest={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function Modal({ dest, onClose }: { dest: Destination; onClose: () => void }) {
  const { t } = useTranslation();
  if (!dest) return null;
  const img = (dest.images && dest.images.length && dest.images[0]) || '/hero.svg';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <div className="modal-media"><img src={img} alt={`${dest.name} cover`} onError={(event) => { event.currentTarget.src = '/hero.svg'; }} /></div>
        <h3>{dest.name}</h3>
        <p className="modal-content">{dest.short_description}</p>
        <div className="modal-content" style={{ marginTop: 12 }}>{(dest as any).content || t('noAdditionalDetails')}</div>
        <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
          <a className="read-more" href={`/destination/${dest.slug}`} onClick={(e)=>{ /* allow navigation */ }}>{t('viewFullPage')}</a>
          <button className="details-btn" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const initialDestinations = await getPublishedDestinations();
  return { props: { initialDestinations } };
};
