import React, { useEffect, useState } from 'react';
import { useTranslation } from '../lib/i18n';
import { DEFAULT_PUBLIC_CONTACTS, PublicContact } from '../lib/publicContacts';

export default function Contact() {
  const [offices, setOffices] = useState<PublicContact[]>(DEFAULT_PUBLIC_CONTACTS);
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/contact-directory')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.contacts)) setOffices(result.contacts);
      })
      .catch(() => {});
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: '#6b7280', fontSize: 14 }}>{t('homeBreadcrumb')}</div>
      <h1 style={{ fontSize: 34, marginTop: 8 }}>{t('officesAcrossNation')}</h1>

      <div className="contact-layout">
        <select
          className="contact-mobile-select"
          onChange={(e) => {
            const id = (e.target as HTMLSelectElement).value;
            if (!id) return;
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <option value="">{t('jumpToRegion')}</option>
          {offices.map((o) => {
            const id = o.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return (
              <option key={id} value={id}>
                {o.region}
              </option>
            );
          })}
        </select>

        <aside className="contact-sidebar">
          <h4>{t('jumpToRegion')}</h4>
          <ul>
            {offices.map((o) => {
              const id = o.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              return (
                <li key={id}>
                  <a href={`#${id}`}>{o.region}</a>
                </li>
              );
            })}
          </ul>
        </aside>

        <div>
          <div className="contact-content">
            {offices.map((o) => {
              const id = o.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              return (
                <div key={id} id={id} className="office-card">
                  <h3>{o.region}</h3>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>{o.contact}</div>
                  <div className="contact-meta">{o.title}</div>
                  <div style={{ marginBottom: 8 }}>{o.address}</div>
                  {o.phone && <div style={{ marginBottom: 4 }}>{t('phoneLabel')}: {o.phone}</div>}
                  {o.tourist && <div style={{ marginBottom: 4 }}>{t('touristInformationCenter')}: {o.tourist}</div>}
                  {o.airport && <div style={{ marginBottom: 4 }}>{t('airportLabel')}: {o.airport}</div>}
                  {o.fax && <div style={{ marginBottom: 4 }}>{t('faxLabel')}: {o.fax}</div>}
                  {o.website && <div style={{ marginBottom: 4 }}>{t('websiteLabel')}: {o.website}</div>}
                  <div style={{ marginTop: 8, color: '#111827', fontWeight: 700 }}>{t('emailLabel')}: {o.email}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
