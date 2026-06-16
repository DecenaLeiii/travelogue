import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Set a simple HttpOnly cookie to identify admin session (prototype)
    res.setHeader('Set-Cookie', `admin_token=1; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
}
