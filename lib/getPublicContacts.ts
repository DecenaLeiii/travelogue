import fs from 'fs';
import path from 'path';
import { DEFAULT_PUBLIC_CONTACTS, PublicContact } from './publicContacts';

export function getPublicContacts(): PublicContact[] {
  try {
    const filePath = path.join(process.cwd(), 'db', 'public_contacts.json');
    if (!fs.existsSync(filePath)) return DEFAULT_PUBLIC_CONTACTS;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : DEFAULT_PUBLIC_CONTACTS;
  } catch {
    return DEFAULT_PUBLIC_CONTACTS;
  }
}
