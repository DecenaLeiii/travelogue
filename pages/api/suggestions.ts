import type { NextApiRequest, NextApiResponse } from 'next'
import { getPublishedDestinations } from '../../lib/destinations'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const all = await getPublishedDestinations()
    const featured = all.filter((destination) => destination.featured)
    const pick = (featured.length ? featured : all).slice(0, 12)
    const out = pick.map((destination) => ({ name: destination.name, slug: destination.slug }))
    return res.status(200).json({ suggestions: out })
  } catch (err: any) {
    console.error('suggestions error', err)
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
