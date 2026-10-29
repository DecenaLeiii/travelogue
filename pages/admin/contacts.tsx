import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { DEFAULT_PUBLIC_CONTACTS, PublicContact } from '../../lib/publicContacts';

const FIELDS: { key: keyof PublicContact; label: string }[] = [
  { key: 'region', label: 'Region or office name' },
  { key: 'contact', label: 'Contact person' },
  { key: 'title', label: 'Title' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'tourist', label: 'Tourist information' },
  { key: 'airport', label: 'Airport office' },
  { key: 'fax', label: 'Fax' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
];

export default function AdminContacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState<PublicContact[]>(DEFAULT_PUBLIC_CONTACTS);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contact-directory')
      .then(async (response) => {
        if (response.status === 401) return router.push('/admin/login');
        if (!response.ok) throw new Error('Unable to load contacts.');
        const result = await response.json();
        setContacts(Array.isArray(result.contacts) ? result.contacts : DEFAULT_PUBLIC_CONTACTS);
      })
      .catch(() => setStatus('Could not load saved contacts. Showing the original directory.'))
      .finally(() => setLoading(false));
  }, [router]);

  const updateContact = (index: number, key: keyof PublicContact, value: string) => {
    setContacts((current) => current.map((contact, itemIndex) => itemIndex === index ? { ...contact, [key]: value } : contact));
  };

  const save = async () => {
    setStatus('Saving contact directory...');
    const response = await fetch('/api/contact-directory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    });
    const result = await response.json();
    setStatus(response.ok ? 'Contact directory saved and published.' : result.error || 'Unable to save contacts.');
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="panel-label">Public Travelogue content</p>
          <h1>Contact directory</h1>
        </div>
        <div className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/destinations">Manage destinations</Link>
          <Link href="/admin/photo-strip">Homepage media</Link>
          <button type="button" onClick={save} disabled={loading}>Save contacts</button>
        </div>
      </div>
      <p className="contacts-editor-intro">Changes appear on the public Contact page and are used by the Smart Assistant when answering contact questions.</p>
      <div className="contacts-editor-list">
        {contacts.map((contact, index) => (
          <section className="admin-panel contact-editor-card" key={`contact-${index}`}>
            <div className="contact-editor-heading">
              <div>
                <p className="panel-label">Office {index + 1}</p>
                <h2>{contact.region || 'New office'}</h2>
              </div>
              <button type="button" className="details-btn danger-button" onClick={() => setContacts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove office</button>
            </div>
            <div className="contact-editor-grid">
              {FIELDS.map((field) => (
                <label key={field.key} className={field.key === 'address' ? 'wide' : ''}>
                  {field.label}{field.key === 'region' ? ' *' : ''}
                  {field.key === 'address' ? (
                    <textarea rows={2} value={contact[field.key] || ''} onChange={(event) => updateContact(index, field.key, event.target.value)} />
                  ) : (
                    <input value={contact[field.key] || ''} onChange={(event) => updateContact(index, field.key, event.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="contacts-editor-footer">
        <button type="button" className="details-btn" onClick={() => setContacts((current) => [...current, { region: '', contact: '', title: '', address: '', phone: '', tourist: '', airport: '', fax: '', email: '', website: '' }])}>Add office</button>
        <button type="button" onClick={save} disabled={loading}>Save contacts</button>
        {status && <span>{status}</span>}
      </div>
    </main>
  );
}
