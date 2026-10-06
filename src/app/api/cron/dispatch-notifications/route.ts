import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dispatchWithFallback } from '@/lib/notifier'
import { requireCronSecret } from '@/lib/cronAuth'

// Wajib: tanpa ini, Next.js mencoba pre-render route ini sebagai halaman statis
// saat `npm run build`, yang akan query database di tahap build — gagal karena
// DATABASE_URL belum tersedia saat itu (baru di-mount saat container runtime).
export const dynamic = 'force-dynamic'

/**
 * Dispatcher utama. Untuk setiap notifikasi QUEUED, kirim via channel yang
 * ditentukan dengan fallback otomatis WhatsApp -> Email jika gagal (spec section 2).
 * Dedup sudah ditangani di titik pembuatan notifikasi (lib/dedup.ts), bukan di sini.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied
  const queued = await prisma.notification.findMany({
    // Email dikirim lewat digest 3x sehari (cron email-digest). EMAIL_DIGEST=off = kembali ke instan.
    where: (process.env.EMAIL_DIGEST === 'off' ? { status: 'QUEUED' } : { status: 'QUEUED', channel: { not: 'EMAIL' } }) as any,
    include: { watch: { select: { category: true, channels: true } } },
    orderBy: { updatedAt: 'asc' },
    take: 300,
  })

  let sent = 0, failed = 0, skipped = 0, fallbackUsed = 0, deferred = 0

  for (const notif of queued) {
    const watchInfo = (notif as typeof notif & { watch: { category: string; channels: string[] } | null }).watch
    const result = await dispatchWithFallback({
      id: notif.id,
      userId: notif.userId,
      title: notif.title,
      body: notif.body,
      sourceUrl: notif.sourceUrl,
      matchScore: notif.matchScore,
      channel: notif.channel,
      attemptNumber: notif.attemptNumber ?? 1,
      watch: watchInfo,
      watchChannels: watchInfo?.channels,
    })
    if (result.sent) sent++
    else { const u = await prisma.notification.findUnique({ where: { id: notif.id }, select: { status: true } }); if (u?.status === 'SKIPPED') skipped++; else if (u?.status === 'QUEUED') deferred++; else failed++ }
    if ((result as any).viaFallback) fallbackUsed++
  }

  return NextResponse.json({ success: true, sent, failed, skipped, deferred, fallbackUsed, total: queued.length })
}
