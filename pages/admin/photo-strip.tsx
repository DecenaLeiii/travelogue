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
  const [heroVideos, setHeroVideos] = useState<string[]>(DEFAULT_SITE_BRANDING.hero_videos);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [heroMode, setHeroMode] = useState<'video' | 'slideshow'>('video');
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [slideUploading, setSlideUploading] = useState(false);
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
        if (Array.isArray(branding.hero_videos) && branding.hero_videos.length) setHeroVideos(branding.hero_videos);
        setHeroMode(branding.hero_mode === 'slideshow' ? 'slideshow' : 'video');
        setHeroImages(Array.isArray(branding.hero_images) ? branding.hero_images : []);
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

  const saveHeroVideos = async (videos: string[], active: string, message = 'Homepage videos saved.') => {
    setVideoStatus('Saving...');
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_video: active, hero_videos: videos }),
    });
    const result = await response.json();
    if (response.ok) {
      setHeroVideo(result.hero_video);
      setHeroVideos(result.hero_videos);
    }
    setVideoStatus(response.ok ? message : result.error || 'Unable to save videos.');
    return response.ok;
  };

  const addHeroVideo = async (url: string) => {
    const value = url.trim();
    if (!value) return;
    if (heroVideos.includes(value)) { setVideoStatus('That video is already in the list.'); return; }
    if (await saveHeroVideos([...heroVideos, value], heroVideo, 'Video added.')) setNewVideoUrl('');
  };

  const removeHeroVideo = (url: string) => {
    if (heroVideos.length <= 1) { setVideoStatus('Keep at least one video.'); return; }
    const next = heroVideos.filter((video) => video !== url);
    void saveHeroVideos(next, url === heroVideo ? next[0] : heroVideo, 'Video removed.');
  };

  const MAX_VIDEO_MB = 50;
  const MAX_VIDEO_SECONDS = 30;
  const MAX_SLIDES = 10;

  const videoDuration = (file: File) => new Promise<number>((resolve) => {
    const probe = document.createElement('video');
    const url = URL.createObjectURL(file);
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(probe.duration); };
    probe.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    probe.src = url;
  });

  const saveHeroDisplay = async (mode: 'video' | 'slideshow', images: string[], message: string) => {
    setVideoStatus('Saving...');
    const response = await fetch('/api/site-branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_mode: mode, hero_images: images }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setHeroMode(result.hero_mode);
      setHeroImages(result.hero_images);
    }
    setVideoStatus(response.ok ? message : result.error || 'Unable to save.');
    return response.ok;
  };

  // Photos are shrunk in the browser first so they stay well under the host's upload size limit.
  const shrinkImage = (file: File) => new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1920 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });

  const addSlides = async (files: File[]) => {
    const room = MAX_SLIDES - heroImages.length;
    if (room <= 0) { setVideoStatus(`You can add up to ${MAX_SLIDES} images.`); return; }
    setSlideUploading(true);
    try {
      const added: string[] = [];
      for (const file of files.filter((f) => f.type.startsWith('image/')).slice(0, room)) {
        setVideoStatus(`Uploading image ${added.length + 1}...`);
        const dataUrl = await shrinkImage(file);
        const response = await fetch('/api/admin/promo-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, category: 'promo-spots' }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Image upload failed.');
        added.push(result.url);
      }
      if (added.length) await saveHeroDisplay(heroMode, [...heroImages, ...added], `${added.length} image(s) added.`);
      else setVideoStatus('Choose PNG, JPG or WebP images.');
    } catch (error) {
      setVideoStatus(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setSlideUploading(false);
    }
  };

  const removeSlide = (url: string) => {
    const next = heroImages.filter((image) => image !== url);
    if (heroMode === 'slideshow' && !next.length) { setVideoStatus('Add another image or switch back to video before removing the last one.'); return; }
    void saveHeroDisplay(heroMode, next, 'Image removed.');
  };

  const uploadHeroVideo = async (file: File) => {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setVideoStatus(`Videos must be ${MAX_VIDEO_MB} MB or smaller.`); return; }
    const seconds = await videoDuration(file);
    if (seconds > MAX_VIDEO_SECONDS) { setVideoStatus(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter (this one is ${Math.round(seconds)}s).`); return; }
    setVideoUploading(true);
    setVideoStatus('Uploading video...');
    try {
      const prepare = await fetch('/api/admin/video-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      });
      const prepared = await prepare.json().catch(() => ({}));
      if (!prepare.ok) throw new Error(prepared.error || 'Unable to prepare upload.');
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('', file);
      const upload = await fetch(prepared.signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form });
      if (!upload.ok) {
        const detail = await upload.json().catch(() => ({}));
        throw new Error(detail.message || detail.error || 'Upload failed. Check the file size limit in your Supabase Storage settings.');
      }
      await addHeroVideo(prepared.publicUrl);
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
    let dataUrl: string;
    try {
      dataUrl = await shrinkImage(file);
    } catch (error) {
      setUploadingIndex(null);
      return setStatus(error instanceof Error ? error.message : 'Could not read that image.');
    }
    const response = await fetch('/api/admin/promo-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
    const json = await response.json().catch(() => ({}));
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
          <h2>Homepage video or slideshow</h2>
        </div>
        <div className="site-logo-controls" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="radio" name="hero-mode" checked={heroMode === 'video'} onChange={() => void saveHeroDisplay('video', heroImages, 'The homepage now plays a video.')} />
              Play a video
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="radio" name="hero-mode" checked={heroMode === 'slideshow'} onChange={() => void saveHeroDisplay('slideshow', heroImages, 'The homepage now shows an image slideshow.')} />
              Show an image slideshow
            </label>
          </div>
          <h3>Slideshow images ({heroImages.length}/{MAX_SLIDES})</h3>
          <p>Add 5 to 10 photos. They change every 5 seconds. Large photos are resized automatically.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {heroImages.map((image) => (
              <div key={image} style={{ width: 140 }}>
                <div className="site-logo-preview" style={{ width: 140, height: 80 }}>
                  <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                </div>
                <button type="button" className="details-btn danger-button" style={{ marginTop: 6, width: '100%' }} onClick={() => removeSlide(image)}>Remove</button>
              </div>
            ))}
          </div>
          <div>
            <label className="promo-upload-button">
              {slideUploading ? 'Uploading...' : 'Add images'}
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={slideUploading || heroImages.length >= MAX_SLIDES} onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length) void addSlides(files); event.currentTarget.value = ''; }} />
            </label>
          </div>
          <h3>Videos</h3>
          <p>Add as many videos as you like and choose which one plays when "Play a video" is selected. Uploads can be up to {MAX_VIDEO_MB} MB and {MAX_VIDEO_SECONDS} seconds.</p>
          {heroVideos.map((video) => (
            <div key={video} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="site-logo-preview" style={{ width: 160, height: 90 }}>
                <video src={video} muted loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 200, wordBreak: 'break-all' }}>
                <input type="radio" name="hero-video" checked={video === heroVideo} onChange={() => void saveHeroVideos(heroVideos, video, 'Now playing on the homepage.')} />
                <span>{video === heroVideo ? 'Playing now: ' : ''}{decodeURIComponent(video.split('/').pop() || video)}</span>
              </label>
              <button type="button" className="details-btn" disabled={heroVideos.length <= 1} onClick={() => removeHeroVideo(video)}>Remove</button>
            </div>
          ))}
          <label className="site-logo-url">
            <span>Add video URL (direct link to an MP4 or WebM file; YouTube, Facebook and Google Drive page links won't play)</span>
            <input value={newVideoUrl} onChange={(event) => setNewVideoUrl(event.target.value)} placeholder="/videos/my-video.mp4 or https://..." />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="details-btn" onClick={() => void addHeroVideo(newVideoUrl)}>Add video</button>
            <label className="promo-upload-button">
              {videoUploading ? 'Uploading...' : 'Upload video'}
              <input type="file" accept="video/mp4,video/webm" disabled={videoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadHeroVideo(file); event.currentTarget.value = ''; }} />
            </label>
            <button type="button" className="details-btn" onClick={() => void saveHeroVideos(heroVideos.includes(DEFAULT_SITE_BRANDING.hero_video) ? heroVideos : [...heroVideos, DEFAULT_SITE_BRANDING.hero_video], DEFAULT_SITE_BRANDING.hero_video, 'Default video restored.')}>Use default video</button>
          </div>
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
