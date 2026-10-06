import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireCronSecret } from '@/lib/cronAuth'
import { sendEmail } from '@/lib/notifier'
import { buildDigestEmail, unsubUrl, DigestItem } from '@/lib/email-digest'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Digest email: dijalankan cron 07.00, 12.00, 17.00 WIB.
//   ?test=1 -> kirim contoh ke SUPERADMIN_EMAIL dari notifikasi terbarunya, tanpa mengubah status apa pun.
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied
  const MAX_ITEMS = Number(process.env.DIGEST_MAX_ITEMS || 10)
  const MAX_AGE_MS = Number(process.env.MAX_ITEM_AGE_DAYS || 3) * 24 * 60 * 60 * 1000
  const isTest = req.nextUrl.searchParams.get('test') === '1'

  let queued: any[]
  if (isTest) {
    const adminEmail = process.env.SUPERADMIN_EMAIL
    const admin = adminEmail ? await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }) : null
    if (!admin) return NextResponse.json({ error: 'SUPERADMIN_EMAIL tidak cocok dengan user mana pun' }, { status: 400 })
    queued = await prisma.notification.findMany({ where: { userId: admin.id }, include: { watch: { select: { name: true, category: true } } }, orderBy: { sentAt: 'desc' }, take: 12 })
  } else {
    queued = await prisma.notification.findMany({ where: { status: 'QUEUED', channel: 'EMAIL' } as any, include: { watch: { select: { name: true, category: true } } } })
  }
  if (!queued.length) return NextResponse.json({ success: true, users: 0, sent: 0, notifications: 0, test: isTest })

  const srcIds = queued.map(n => n.sourceId).filter(Boolean) as string[]
  const listings = srcIds.length ? await prisma.listingItem.findMany({ where: { id: { in: srcIds } }, select: { id: true, publishedAt: true } }) : []
  const pubMap: Record<string, Date | null> = {}
  listings.forEach((l: any) => { pubMap[l.id] = l.publishedAt })

  const byUser: Record<string, any[]> = {}
  queued.forEach(n => { (byUser[n.userId] = byUser[n.userId] || []).push(n) })
  const users = await db.user.findMany({ where: { id: { in: Object.keys(byUser) } }, select: { id: true, name: true, email: true, plan: true, notifEnabled: true, emailDigestOff: true } })

  let sent = 0, failed = 0, skippedUsers = 0, staleSkipped = 0
  for (const u of users) {
    const all = byUser[u.id] || []
    const ids = all.map((n: any) => n.id)
    if (!isTest && (!u.notifEnabled || u.emailDigestOff)) {
      await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { status: 'SKIPPED', failedReason: 'Digest email dimatikan user' } as any })
      skippedUsers++; continue
    }
    const fresh: any[] = []; const staleIds: string[] = []
    all.forEach((n: any) => {
      const pub = n.sourceId ? pubMap[n.sourceId] : null
      if (!isTest && pub && Date.now() - new Date(pub).getTime() > MAX_AGE_MS) staleIds.push(n.id); else fresh.push(n)
    })
    if (staleIds.length) {
      await prisma.notification.updateMany({ where: { id: { in: staleIds } }, data: { status: 'SKIPPED', failedReason: 'Basi saat digest (> batas umur)' } as any })
      staleSkipped += staleIds.length
    }
    if (!fresh.length) continue
    fresh.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0))
    const top: DigestItem[] = fresh.slice(0, MAX_ITEMS).map((n: any) => ({
      id: n.id, title: n.title, url: n.sourceUrl, score: n.matchScore || 0,
      watchName: (n.watch && n.watch.name) || 'Pantauan kamu', category: (n.watch && n.watch.category) || 'PELUANG',
      publishedAt: n.sourceId ? pubMap[n.sourceId] || null : null,
    }))
    const names: string[] = []
    top.forEach(t => { if (names.indexOf(t.watchName) < 0) names.push(t.watchName) })
    const subject = (isTest ? '[TES] ' : '') + fresh.length + ' peluang baru: ' + names.slice(0, 2).join(', ') + (names.length > 2 ? ' dan lainnya' : '')
    const html = buildDigestEmail({ userName: u.name, userId: u.id, items: top, total: fresh.length, isFree: u.plan === 'FREE' })
    const ok = await sendEmail(u.email, subject, html, { 'List-Unsubscribe': '<' + unsubUrl(u.id) + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
    if (ok) {
      if (!isTest) await prisma.notification.updateMany({ where: { id: { in: fresh.map((n: any) => n.id) } }, data: { status: 'SENT' } as any })
      sent++
    } else failed++
  }
  if (!isTest) {
    // Antrean email yang gagal terus > 2 hari tidak ditahan selamanya
    await prisma.notification.updateMany({ where: { status: 'QUEUED', channel: 'EMAIL', sentAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } } as any, data: { status: 'FAILED', failedReason: 'Digest gagal > 2 hari' } as any })
  }
  return NextResponse.json({ success: true, test: isTest, users: users.length, sent, failed, skippedUsers, staleSkipped, notifications: queued.length })
}
