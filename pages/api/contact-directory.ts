import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../lib/auth';
import { DEFAULT_PUBLIC_CONTACTS, PublicContact } from '../../lib/publicContacts';
import { getPublicContacts } from '../../lib/getPublicContacts';

const CONTACTS_PATH = path.join(process.cwd(), 'db', 'public_contacts.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.json({ contacts: getPublicContacts() });
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  if (!Array.isArray(req.body?.contacts)) return res.status(400).json({ error: 'contacts must be an array' });
  const contacts: PublicContact[] = req.body.contacts
    .map((contact: Partial<PublicContact>) => ({
      region: String(contact.region || '').trim(),
      contact: String(contact.contact || '').trim(),
      title: String(contact.title || '').trim(),
      address: String(contact.address || '').trim(),
      phone: String(contact.phone || '').trim(),
      tourist: String(contact.tourist || '').trim(),
      airport: String(contact.airport || '').trim(),
      fax: String(contact.fax || '').trim(),
      email: String(contact.email || '').trim(),
      website: String(contact.website || '').trim(),
    }))
    .filter((contact: PublicContact) => contact.region);

  if (!contacts.length) return res.status(400).json({ error: 'Add at least one contact with a region or office name.' });
  fs.writeFileSync(CONTACTS_PATH, JSON.stringify(contacts, null, 2));
  return res.json({ contacts, defaultsAvailable: DEFAULT_PUBLIC_CONTACTS.length });
}
