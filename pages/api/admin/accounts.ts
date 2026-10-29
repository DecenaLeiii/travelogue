import type { NextApiRequest, NextApiResponse } from 'next';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { clearAdminSessionCookie, setAdminSessionCookie, verifyAdmin } from '../../../lib/auth';
import { logAudit } from '../../../lib/audit';

const HEAD_ADMIN_EMAIL = 'dot.admin@dotadmin.ph';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentAdmin = await verifyAdmin(req);
  if (!currentAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  const isHeadAdmin = currentAdmin.email.toLowerCase() === HEAD_ADMIN_EMAIL;

  if (req.method === 'GET') {
    let accounts: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] = [];
    if (isHeadAdmin && supabaseAdmin) {
      const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
        if (error) return res.status(500).json({ error: error.message });
        users.push(...data.users);
        if (data.users.length < 100) break;
        page += 1;
      }
      accounts = users
        .map((user) => ({
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return res.json({
      email: currentAdmin.email,
      canChangePassword: Boolean(currentAdmin.id && supabaseAdmin),
      canManageAccounts: isHeadAdmin,
      accounts,
    });
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'change-password') {
      if (!currentAdmin.id || !supabaseAdmin) {
        return res.status(400).json({ error: 'This account is configured through environment settings and cannot be changed here.' });
      }
      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');
      if (!currentPassword) return res.status(400).json({ error: 'Enter your current password to confirm this change.' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

      const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({ email: currentAdmin.email, password: currentPassword });
      if (verifyError) return res.status(401).json({ error: 'Current password did not match.' });

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(currentAdmin.id, { password: newPassword });
      if (updateError) return res.status(400).json({ error: updateError.message });

      await logAudit({ adminId: currentAdmin.id, adminEmail: currentAdmin.email, action: 'update', entityType: 'admin account', details: { description: `${currentAdmin.email} changed their password.` } }).catch(() => undefined);
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({ email: currentAdmin.email, password: newPassword });
      if (sessionError || !sessionData.session) {
        clearAdminSessionCookie(res);
        return res.json({ ok: true, requiresLogin: true });
      }
      setAdminSessionCookie(res, sessionData.session.access_token, sessionData.session.refresh_token);
      return res.json({ ok: true, requiresLogin: false });
    }

    if (!isHeadAdmin) {
      return res.status(403).json({ error: 'Only the head administrator can create admin accounts.' });
    }
    if (!supabaseAdmin) return res.status(503).json({ error: 'Creating additional accounts requires Supabase Auth admin credentials.' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'admin' },
    });
    if (error) return res.status(400).json({ error: error.message });
    await logAudit({ adminId: currentAdmin.id, adminEmail: currentAdmin.email, action: 'create', entityType: 'admin account', entityId: data.user.id, details: { description: `Created admin account ${email}.` } }).catch(() => undefined);
    return res.status(201).json({ account: { id: data.user.id, email: data.user.email || email } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
