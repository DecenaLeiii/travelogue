import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../../lib/i18n';
import DestinationForm, { DestinationFormData } from '../../../components/DestinationForm';

export default function NewDestination() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { t } = useTranslation();
  const save = async (data: DestinationFormData) => {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/destinations', {
      method: 'POST',
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
    await res.json();
    router.push('/admin/destinations');
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>{t('createNewDestination')}</h1>
        <Link href="/admin/destinations">← {t('back')}</Link>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <DestinationForm onSubmit={save} saving={saving} />
    </main>
  );
}
