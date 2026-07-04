import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dispatchWithFallback } from '@/lib/notifier'

// Wajib: tanpa ini, Next.js mencoba pre-render route ini sebagai halaman statis
// saat `npm run build`, yang akan query database di tahap build — gagal karena
// DATABASE_URL belum tersedia saat itu (baru di-mount saat container runtime).
export const dynamic = 'force-dynamic'

/**
 * Dispatcher utama. Untuk setiap notifikasi QUEUED, kirim via channel yang
 * ditentukan dengan fallback otomatis WhatsApp -> Email jika gagal (spec section 2).
 * Dedup sudah ditangani di titik pembuatan notifikasi (lib/dedup.ts), bukan di sini.
 */
export async function GET() {
  const queued = await prisma.notification.findMany({
    where: { status: 'QUEUED' },
    include: { watch: { select: { category: true } } },
    take: 100,
  })

  let sent = 0, failed = 0, fallbackUsed = 0

  for (const notif of queued) {
    const watchInfo = (notif as typeof notif & { watch: { category: string } | null }).watch
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
    })
    if (result.sent) sent++
    else failed++
    if ((result as any).viaFallback) fallbackUsed++
  }

  return NextResponse.json({ success: true, sent, failed, fallbackUsed, total: queued.length })
}
