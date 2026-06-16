import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear cookie
  res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
}
