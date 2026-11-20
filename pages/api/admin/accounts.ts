import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';
import getSupabaseAdmin from '../../../lib/supabaseAdmin';
import { clearAdminSessionCookie, isAdminAccountDisabled, setAdminSessionCookie, verifyAdmin } from '../../../lib/auth';
import { logAudit } from '../../../lib/audit';

const HEAD_ADMIN_EMAIL = 'dot.admin@dotadmin.ph';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentAdmin = await verifyAdmin(req);
  if (!currentAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAdmin = getSupabaseAdmin();
  const isHeadAdmin = currentAdmin.email.toLowerCase() === HEAD_ADMIN_EMAIL;

  if (req.method === 'GET') {
    let accounts: { id: string; email: string; created_at: string; last_sign_in_at: string | null; disabled: boolean; manageable: boolean }[] = [];
    if (isHeadAdmin && supabaseAdmin) {
      const users: User[] = [];
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
          disabled: isAdminAccountDisabled(user),
          manageable: user.app_metadata?.role === 'admin' && user.email?.toLowerCase() !== HEAD_ADMIN_EMAIL,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return res.json({
      email: currentAdmin.email,
      canChangePassword: Boolean(currentAdmin.id && supabaseAdmin),
      canManageAccounts: isHeadAdmin,
      canRecoverAccounts: Boolean(isHeadAdmin && currentAdmin.id && currentAdmin.emailConfirmed && supabaseAdmin),
      accounts,
    });
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'delete' || req.body?.action === 'restore') {
      if (!isHeadAdmin || !currentAdmin.id || !currentAdmin.emailConfirmed) {
        return res.status(403).json({ error: 'Only the head administrator signed in with a verified Supabase Auth account can delete or recover accounts.' });
      }
      if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase Auth admin credentials are required.' });
      const accountId = req.body?.accountId;
      if (typeof accountId !== 'string' || !accountId.trim()) return res.status(400).json({ error: 'Account ID is required.' });

      const { data: target, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(accountId);
      if (lookupError) return res.status(400).json({ error: lookupError.message });
      const user = target.user;
      if (!user) return res.status(404).json({ error: 'Account not found.' });
      if (user.id === currentAdmin.id || user.email?.toLowerCase() === HEAD_ADMIN_EMAIL || user.app_metadata?.role !== 'admin') {
        return res.status(403).json({ error: 'Only sub-admin accounts can be deleted or recovered.' });
      }
      const disabled = req.body.action === 'delete';
      if (isAdminAccountDisabled(user) === disabled) {
        return res.status(409).json({ error: disabled ? 'This account is already deleted.' : 'This account is not deleted.' });
      }
      if (disabled && user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
        return res.status(409).json({ error: 'This account is also the environment fallback account and cannot be disabled here.' });
      }
      if (disabled && user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
        return res.status(409).json({ error: 'This account is already banned in Supabase Auth.' });
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...user.app_metadata, admin_access_disabled: disabled },
        ban_duration: disabled ? '876000h' : 'none',
      });
      if (updateError) return res.status(500).json({ error: updateError.message });
      await logAudit({
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
        action: disabled ? 'delete' : 'restore',
        entityType: 'admin account',
        entityId: user.id,
        details: { description: `${disabled ? 'Deleted' : 'Recovered'} admin account ${user.email || user.id}.` },
      });
      return res.json({ ok: true });
    }

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
    if (email === HEAD_ADMIN_EMAIL) return res.status(400).json({ error: 'The head administrator account must be configured in Supabase Auth.' });
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
