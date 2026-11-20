import type { NextApiRequest } from 'next';
import type { User } from '@supabase/supabase-js';
import getSupabaseAdmin from './supabaseAdmin';

export type AdminUser = {
  id: string | null;
  email: string;
  emailConfirmed?: boolean;
};

type ReqWithCookies = NextApiRequest | { headers: { cookie?: string } };

export function isAdminAccountDisabled(user: User): boolean {
  return user.app_metadata?.admin_access_disabled === true;
}

function getCookie(req: ReqWithCookies, name: string): string | null {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function verifyAdmin(req: ReqWithCookies): Promise<AdminUser | null> {
  const accessToken = getCookie(req, 'sb-access-token');
  const supabaseAdmin = getSupabaseAdmin();

  if (accessToken && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!error && data.user?.email) {
      if (isAdminAccountDisabled(data.user)) return null;
      return { id: data.user.id, email: data.user.email, emailConfirmed: Boolean(data.user.email_confirmed_at) };
    }
    return null;
  }

  const legacy = getCookie(req, 'admin_token');
  if (legacy === '1' && process.env.ADMIN_EMAIL) {
    return { id: null, email: process.env.ADMIN_EMAIL };
  }

  return null;
}

export function isAdminAuthenticated(req: ReqWithCookies): boolean {
  const cookie = req.headers.cookie || '';
  return cookie.includes('sb-access-token=') || cookie.includes('admin_token=1');
}

export function setAdminSessionCookie(
  res: { setHeader: (k: string, v: string | string[]) => void },
  accessToken: string,
  refreshToken?: string
) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookies = [
    `sb-access-token=${accessToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`,
    `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
  ];
  if (refreshToken) {
    cookies.push(`sb-refresh-token=${refreshToken}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax${secure}`);
  }
  res.setHeader('Set-Cookie', cookies);
}

export function clearAdminSessionCookie(res: { setHeader: (k: string, v: string | string[]) => void }) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `sb-access-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    `sb-refresh-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
  ]);
}
