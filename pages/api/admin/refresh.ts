import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { clearAdminSessionCookie, isAdminAccountDisabled, setAdminSessionCookie } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const match = (req.headers.cookie || '').match(/(?:^|;\s*)sb-refresh-token=([^;]*)/);
  const supabaseAdmin = getSupabaseAdmin();
  if (!match || !supabaseAdmin) return res.status(401).json({ error: 'No session to refresh' });

  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: decodeURIComponent(match[1]) });
  if (error || !data.session) return res.status(401).json({ error: 'Session expired' });
  if (isAdminAccountDisabled(data.session.user)) {
    clearAdminSessionCookie(res);
    return res.status(401).json({ error: 'This admin account has been deleted.' });
  }

  setAdminSessionCookie(res, data.session.access_token, data.session.refresh_token);
  return res.json({ ok: true });
}
