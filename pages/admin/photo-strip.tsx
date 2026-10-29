import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { DEFAULT_PROMO_SPOTS, PromoSpot } from '../../lib/promoSpots';
import { DEFAULT_SITE_BRANDING, CultureBlock, CultureBuiltIn, CULTURE_BUILT_INS } from '../../lib/siteBranding';

type CultureContent = {
  tourism_heading: string;
  tourism_description: string;
  mission_heading: string;
  mission_text: string;
  key_programs_heading: string;
  key_programs: string;
  contact_heading: string;
  contact_email: string;
  contact_phone: string;
};

const EMPTY_CULTURE_CONTENT: CultureContent = {
  tourism_heading: '',
  tourism_description: '',
  mission_heading: '',
  mission_text: '',
  key_programs_heading: '',
  key_programs: '',
  contact_heading: '',
  contact_email: '',
  contact_phone: '',
};

export default function AdminPhotoStrip() {
  const router = useRouter();
  const [promoSpots, setPromoSpots] = useState<PromoSpot[]>(DEFAULT_PROMO_SPOTS);
  const [status, setStatus] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [logo, setLogo] = useState(DEFAULT_SITE_BRANDING.logo);
  const [logoStatus, setLogoStatus] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [heroDescription, setHeroDescription] = useState('');
  const [heroVideo, setHeroVideo] = useState(DEFAULT_SITE_BRANDING.hero_video);
  const [videoStatus, setVideoStatus] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [heroStatus, setHeroStatus] = useState('');
  const [cultureContent, setCultureContent] = useState<CultureContent>(EMPTY_CULTURE_CONTENT);
  const [cultureStatus, setCultureStatus] = useState('');
  const [cultureHidden, setCultureHidden] = useState<CultureBuiltIn[]>([]);
  const [cultureBlocks, setCultureBlocks] = useState<CultureBlock[]>([]);
  const updateBlock = (id: string, patch: Partial<CultureBlock>) =>
    setCultureBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));

  useEffect(() => {
    fetch('/api/admin/promo-spots')
      .then(async (response) => {
        if (response.status === 401) return router.push('/admin/login');
        const json = await response.json();
        setPromoSpots(Array.isArray(json.spots) ? json.spots : DEFAULT_PROMO_SPOTS);
      })
      .catch(() => setStatus('Unable to load photo strip settings.'));
    fetch('/api/site-branding')
      .then(async (response) => {
        const branding = await response.json();
        if (typeof branding.logo === 'string') setLogo(branding.logo);
        if (typeof branding.hero_video === 'string') setHeroVideo(branding.hero_video);
        setCultureHidden(Array.isArray(branding.culture_hidden) ? branding.culture_hidden : []);
        setCultureBlocks(Array.isArray(branding.culture_blocks) ? branding.culture_blocks : []);
        if (typeof branding.hero_description === 'string') setHeroDescription(branding.hero_description);
        setCultureContent({
          tourism_heading: branding.tourism_heading || '',
          tourism_description: branding.tourism_description || '',
          mission_heading: branding.mission_heading || '',
          mission_text: branding.mission_text || '',
          key_programs_heading: branding.key_programs_heading || '',
          key_programs: Array.isArray(branding.key_programs) ? branding.key_programs.join('\n') : '',
          contact_heading: branding.contact_heading || '',
          contact_email: branding.contact_email || '',
          contact_phone: branding.contact_phone || '',
        });
      })
      .catch(() => setLogoStatus('Unable to load logo setting.'));
  }, [router]);

  const saveLogo = async () => {
    setLogoStatus('Saving logo...');
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo }),
    });
    const result = await response.json();
    setLogoStatus(response.ok ? 'Logo saved.' : result.error || 'Unable to save logo.');
  };

  const saveHeroVideo = async (value = heroVideo) => {
    setVideoStatus('Saving video...');
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_video: value }),
    });
    const result = await response.json();
    if (response.ok) setHeroVideo(result.hero_video);
    setVideoStatus(response.ok ? 'Homepage video saved.' : result.error || 'Unable to save video.');
  };

  const uploadHeroVideo = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { setVideoStatus('Videos must be 100 MB or smaller.'); return; }
    setVideoUploading(true);
    setVideoStatus('Uploading video...');
    try {
      const response = await fetch('/api/admin/video-upload', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to upload video.');
      setHeroVideo(result.url);
      await saveHeroVideo(result.url);
    } catch (error) {
      setVideoStatus(error instanceof Error ? error.message : 'Unable to upload video.');
    } finally {
      setVideoUploading(false);
    }
  };

  const saveHeroDescription = async () => {
    setHeroStatus('Saving homepage text...');
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_description: heroDescription }),
    });
    const result = await response.json();
    setHeroStatus(response.ok ? 'Homepage text saved.' : result.error || 'Unable to save homepage text.');
  };

  const persistCulture = async (hidden: CultureBuiltIn[], blocks: CultureBlock[], message: string) => {
    const clean = blocks
      .filter((block) => block.title.trim())
      .map((block) => ({ ...block, kind: (block.address || block.phone || block.email ? 'location' : 'text') as CultureBlock['kind'] }));
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ culture_hidden: hidden, culture_blocks: clean }),
    });
    const result = await response.json();
    setCultureStatus(response.ok ? message : result.error || 'Unable to save.');
  };

  const toggleBuiltIn = (key: CultureBuiltIn) => {
    const next = cultureHidden.includes(key) ? cultureHidden.filter((k) => k !== key) : [...cultureHidden, key];
    setCultureHidden(next);
    void persistCulture(next, cultureBlocks, 'Updated on the homepage.');
  };

  const removeBlock = (block: CultureBlock) => {
    if (!window.confirm(`Delete "${block.title || 'this category'}"?`)) return;
    const next = cultureBlocks.filter((b) => b.id !== block.id);
    setCultureBlocks(next);
    void persistCulture(cultureHidden, next, 'Deleted from the homepage.');
  };

  const toggleArchive = (block: CultureBlock) => {
    const next = cultureBlocks.map((b) => (b.id === block.id ? { ...b, archived: !b.archived } : b));
    setCultureBlocks(next);
    void persistCulture(cultureHidden, next, block.archived ? 'Restored on the homepage.' : 'Archived (hidden from the homepage).');
  };

  const saveCultureContent = async () => {
    setCultureStatus('Saving Tourism & Culture content...');
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cultureContent,
        key_programs: cultureContent.key_programs.split('\n').map((line) => line.trim()).filter(Boolean),
        culture_hidden: cultureHidden,
        culture_blocks: cultureBlocks.filter((block) => block.title.trim()).map((block) => ({ ...block, kind: (block.address || block.phone || block.email ? 'location' : 'text') as CultureBlock['kind'] })),
      }),
    });
    const result = await response.json();
    setCultureStatus(response.ok ? 'Tourism & Culture content saved.' : result.error || 'Unable to save content.');
  };

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) return setLogoStatus('Please choose an image file.');
    setLogoUploading(true);
    setLogoStatus('Uploading logo...');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const response = await fetch('/api/admin/promo-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, category: 'logos' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Logo upload failed.');
      setLogo(result.url);
      setLogoStatus('Logo uploaded. Save logo to publish it.');
    } catch (error) {
      setLogoStatus(error instanceof Error ? error.message : 'Logo upload failed.');
    } finally {
      setLogoUploading(false);
    }
  };

  const save = async () => {
    setStatus('Saving...');
    const response = await fetch('/api/admin/promo-spots', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spots: promoSpots }),
    });
    setStatus(response.ok ? 'Photo strip saved.' : 'Unable to save photo strip.');
  };

  const upload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) return setStatus('Please choose an image file.');
    setUploadingIndex(index);
    setStatus('Uploading image...');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const response = await fetch('/api/admin/promo-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
    const json = await response.json();
    setUploadingIndex(null);
    if (!response.ok) return setStatus(json.error || 'Unable to upload image.');
    setPromoSpots((current) => current.map((spot, spotIndex) => spotIndex === index ? { ...spot, image: json.url } : spot));
    setStatus('Image added. Save photos to publish it.');
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="panel-label">Homepage</p>
          <h1>Photo strip</h1>
        </div>
        <div className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/destinations">Manage destinations</Link>
          <Link href="/admin/contacts">Contacts</Link>
          <button type="button" onClick={save}>Save photos</button>
        </div>
      </div>
      <section className="admin-panel site-logo-editor">
        <div>
          <p className="panel-label">Public branding</p>
          <h2>Travelogue logo</h2>
          <p>Used in the public header and homepage. Admin login artwork is separate.</p>
        </div>
        <div className="site-logo-controls">
          <div className="site-logo-preview"><img src={logo} alt="Current Travelogue logo" /></div>
          <label className="site-logo-url">
            Logo image URL
            <input value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="Paste an image URL" />
          </label>
          <label className="promo-upload-button">
            {logoUploading ? 'Uploading...' : 'Choose logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ''; }} />
          </label>
          <button type="button" className="details-btn" onClick={saveLogo}>Save logo</button>
          {logoStatus && <span className="site-logo-status">{logoStatus}</span>}
        </div>
      </section>
      <section className="admin-panel site-logo-editor">
        <div>
          <p className="panel-label">Homepage</p>
          <h2>Homepage hero video</h2>
        </div>
        <div className="site-logo-controls">
          <div className="site-logo-preview" style={{ width: 220, height: 124 }}>
            <video key={heroVideo} src={heroVideo} muted loop playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
          </div>
          <label className="site-logo-url">
            <span>Video URL (MP4 or WebM)</span>
            <input value={heroVideo} onChange={(event) => setHeroVideo(event.target.value)} placeholder="/videos/my-video.mp4 or https://..." />
          </label>
          <label className="promo-upload-button">
            {videoUploading ? 'Uploading...' : 'Upload video'}
            <input type="file" accept="video/mp4,video/webm" disabled={videoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadHeroVideo(file); event.currentTarget.value = ''; }} />
          </label>
          <button type="button" className="details-btn" onClick={() => saveHeroVideo()}>Save video</button>
          <button type="button" className="details-btn" onClick={() => saveHeroVideo(DEFAULT_SITE_BRANDING.hero_video)}>Reset to default</button>
          {videoStatus && <span className="site-logo-status">{videoStatus}</span>}
        </div>
      </section>
      <section className="admin-panel homepage-copy-editor">
        <div>
          <p className="panel-label">Homepage content</p>
          <p>This text appears beneath the main homepage image in English. Other languages continue using their translations.</p>
        </div>
        <label>
          Homepage description
          <textarea maxLength={500} rows={3} value={heroDescription} onChange={(event) => setHeroDescription(event.target.value)} placeholder="Describe the destinations visitors can explore" />
        </label>
        <div className="homepage-copy-footer">
          <span>{heroDescription.length}/500</span>
          <button type="button" className="details-btn" onClick={saveHeroDescription}>Save homepage text</button>
          {heroStatus && <span className="site-logo-status">{heroStatus}</span>}
        </div>
      </section>
      <section className="admin-panel homepage-culture-editor">
        <div>
          <p className="panel-label">Homepage section</p>
          <h2>Tourism &amp; Culture</h2>
          <p>Leave a field blank to keep the current translated text. These custom values are shown in English.</p>
        </div>
        <div className="homepage-culture-grid">
          <label>Section heading<input value={cultureContent.tourism_heading} onChange={(event) => setCultureContent((current) => ({ ...current, tourism_heading: event.target.value }))} /></label>
          <label>Introduction<textarea rows={2} value={cultureContent.tourism_description} onChange={(event) => setCultureContent((current) => ({ ...current, tourism_description: event.target.value }))} /></label>
          <label>Mission heading<input value={cultureContent.mission_heading} onChange={(event) => setCultureContent((current) => ({ ...current, mission_heading: event.target.value }))} /></label>
          <label>Mission text<textarea rows={3} value={cultureContent.mission_text} onChange={(event) => setCultureContent((current) => ({ ...current, mission_text: event.target.value }))} /></label>
          <label>Key programs heading<input value={cultureContent.key_programs_heading} onChange={(event) => setCultureContent((current) => ({ ...current, key_programs_heading: event.target.value }))} /></label>
          <label>Key programs (one per line)<textarea rows={4} value={cultureContent.key_programs} onChange={(event) => setCultureContent((current) => ({ ...current, key_programs: event.target.value }))} /></label>
          <label>Contact heading<input value={cultureContent.contact_heading} onChange={(event) => setCultureContent((current) => ({ ...current, contact_heading: event.target.value }))} /></label>
          <label>General contact email<input type="email" value={cultureContent.contact_email} onChange={(event) => setCultureContent((current) => ({ ...current, contact_email: event.target.value }))} /></label>
          <label>General contact phone<input value={cultureContent.contact_phone} onChange={(event) => setCultureContent((current) => ({ ...current, contact_phone: event.target.value }))} /></label>
        </div>
        <div style={{ marginTop: 20 }}>
          <h3>Show or hide parts</h3>
          <p>Untick to remove from the homepage right away. Tick again to bring it back.</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {CULTURE_BUILT_INS.map((key) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={!cultureHidden.includes(key)} onChange={() => toggleBuiltIn(key)} />
                {key === 'mission' ? 'Mission' : key === 'programs' ? 'Key programs' : 'Contact'}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <h3>Extra categories</h3>
          <p>Add anything extra, like a DOT office. Archive hides it; Delete removes it. Both apply to the homepage immediately.</p>
          {cultureBlocks.map((block) => (
            <div key={block.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12, opacity: block.archived ? 0.6 : 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <input style={{ flex: 1, minWidth: 160 }} placeholder="Title (e.g. DOT Regional Office)" value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                {block.archived && <strong>Archived</strong>}
                <button type="button" className="details-btn" onClick={() => toggleArchive(block)}>{block.archived ? 'Restore' : 'Archive'}</button>
                <button type="button" className="details-btn" onClick={() => removeBlock(block)}>Delete</button>
              </div>
              <textarea rows={2} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Description" value={block.body} onChange={(event) => updateBlock(block.id, { body: event.target.value })} />
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 8 }}>
                <input placeholder="Address (optional)" value={block.address} onChange={(event) => updateBlock(block.id, { address: event.target.value })} />
                <input placeholder="Phone (optional)" value={block.phone} onChange={(event) => updateBlock(block.id, { phone: event.target.value })} />
                <input type="email" placeholder="Email (optional)" value={block.email} onChange={(event) => updateBlock(block.id, { email: event.target.value })} />
              </div>
            </div>
          ))}
          <button type="button" className="details-btn" onClick={() => setCultureBlocks((current) => [...current, { id: `block-${Date.now()}`, kind: 'text', title: '', body: '', address: '', phone: '', email: '', archived: false }])}>+ Add a category</button>
          <p style={{ marginTop: 8 }}>After typing, click “Save Tourism &amp; Culture” below.</p>
        </div>
        <div className="homepage-copy-footer">
          <button type="button" className="details-btn" onClick={saveCultureContent}>Save Tourism &amp; Culture</button>
          {cultureStatus && <span className="site-logo-status">{cultureStatus}</span>}
        </div>
      </section>
      <section className="admin-panel promo-editor-panel">
        <p className="promo-editor-help">Add, remove, or replace the destination photos shown in the moving strip.</p>
        <div className="promo-editor-list">
          {promoSpots.map((spot, index) => (
            <div className="promo-editor-row" key={`${index}-${spot.title}`}>
              <input aria-label={`Photo ${index + 1} title`} value={spot.title} placeholder="Place name" onChange={(event) => setPromoSpots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} />
              <div className="promo-image-input" onDragOver={(event) => event.preventDefault()} onPaste={(event) => { const file = event.clipboardData.files[0]; if (file) { event.preventDefault(); upload(index, file); } }} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) upload(index, file); }}>
                <input aria-label={`Photo ${index + 1} URL`} value={spot.image} placeholder="Paste an image URL or drop an image here" onChange={(event) => setPromoSpots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, image: event.target.value } : item))} />
                <label className="promo-upload-button">
                  {uploadingIndex === index ? 'Uploading...' : 'Choose image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(index, file); event.currentTarget.value = ''; }} />
                </label>
              </div>
              <button type="button" className="details-btn danger-button" onClick={() => setPromoSpots((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
            </div>
          ))}
        </div>
        <div className="promo-editor-footer">
          <button type="button" className="details-btn" onClick={() => setPromoSpots((current) => [...current, { title: '', image: '' }])}>Add photo</button>
          {status && <span>{status}</span>}
        </div>
      </section>
    </main>
  );
}
