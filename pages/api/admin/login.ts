import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { isAdminAccountDisabled, setAdminSessionCookie } from '../../../lib/auth';
import { logAudit } from '../../../lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      if (isAdminAccountDisabled(data.session.user)) {
        return res.status(403).json({ error: 'This admin account has been deleted. Contact the head administrator to recover it.' });
      }
      setAdminSessionCookie(res, data.session.access_token, data.session.refresh_token);
      await logAudit({
        adminEmail: email,
        action: 'login',
        entityType: 'admin',
        details: { method: 'supabase_auth' },
      });
      return res.json({ ok: true, method: 'supabase' });
    }
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `sb-access-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
      `sb-refresh-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
      `admin_token=1; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`,
    ]);
    await logAudit({
      adminEmail: email,
      action: 'login',
      entityType: 'admin',
      details: { method: 'env_fallback' },
    });
    return res.json({ ok: true, method: 'env' });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
}
