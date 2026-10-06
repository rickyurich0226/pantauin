import { NextRequest, NextResponse } from 'next/server'

/**
 * Defense-in-depth: middleware.ts sudah cek x-cron-secret untuk semua path
 * /api/cron/*, tapi kalau middleware suatu saat berubah/misconfigured, route
 * ini tetap harus punya pengecekan sendiri sebagai lapisan kedua.
 * Pakai di awal setiap route cron: const denied = requireCronSecret(req); if (denied) return denied
 */
export function requireCronSecret(req: NextRequest): NextResponse | null {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
