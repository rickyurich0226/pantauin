import prisma from './prisma'
import { buildContentHash } from './crypto'

const DEDUP_WINDOW_HOURS = 24

/**
 * Cek apakah notifikasi dengan contentHash yang sama sudah pernah dikirim
 * ke user ini di channel yang sama dalam window waktu tertentu.
 * Mencegah notifikasi ganda untuk listing identik dari sumber berbeda
 * (mis. properti yang sama muncul di OLX dan Rumah123).
 */
export async function isDuplicateNotification(params: {
  userId: string
  contentHash: string
  channel: string
}): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000)
  const existing = await prisma.notification.findFirst({
    where: {
      userId: params.userId,
      contentHash: params.contentHash,
      channel: params.channel as any,
      sentAt: { gte: since },
      status: { in: ['SENT', 'QUEUED'] },
    },
    select: { id: true },
  })
  return !!existing
}

/**
 * Buat notifikasi baru dengan pengecekan dedup. Mengembalikan null jika duplikat
 * (di-skip), atau objek Notification jika berhasil dibuat.
 */
export async function createNotificationDeduped(params: {
  userId: string
  watchId?: string | null
  title: string
  body: string
  sourceUrl?: string | null
  sourceId?: string | null
  channel: string
  matchScore?: number
  price?: number | null
  location?: string | null
  category?: string | null
}) {
  const contentHash = buildContentHash({ title: params.title, price: params.price, location: params.location, sourceUrl: params.sourceUrl, category: params.category })

  // Dedup judul 7 hari: artikel yang sama dari beberapa feed (URL beda) tidak dikirim ulang
  const sameTitle = await prisma.notification.findFirst({
    where: { userId: params.userId, channel: params.channel as any, title: { equals: params.title, mode: 'insensitive' },
      sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: { in: ['SENT', 'QUEUED'] as any } },
    select: { id: true },
  })
  const isDup = !!sameTitle || await isDuplicateNotification({ userId: params.userId, contentHash, channel: params.channel })

  if (isDup) {
    // Catat sebagai SKIPPED_DUPLICATE untuk metrik kualitas data, tapi tidak dikirim
    // dan tidak dihitung dalam kuota notifikasi user.
    await prisma.notification.create({
      data: {
        userId: params.userId,
        watchId: params.watchId,
        title: params.title,
        body: params.body,
        sourceUrl: params.sourceUrl,
        sourceId: params.sourceId,
        channel: params.channel as any,
        status: 'SKIPPED_DUPLICATE' as any,
        matchScore: params.matchScore ?? 0,
        contentHash,
      },
    })
    return null
  }

  // @@unique([userId, contentHash, channel]) di schema menjadi pengaman terakhir
  // terhadap race condition jika dua worker memproses item yang sama bersamaan.
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: params.userId,
        watchId: params.watchId,
        title: params.title,
        body: params.body,
        sourceUrl: params.sourceUrl,
        sourceId: params.sourceId,
        channel: params.channel as any,
        status: 'QUEUED',
        matchScore: params.matchScore ?? 0,
        contentHash,
      },
    })
    return notif
  } catch (err: any) {
    // Unique constraint violation = race condition caught at DB level, treat as duplicate
    if (err?.code === 'P2002') return null
    throw err
  }
}

/**
 * Cleanup job: hapus Notification lebih dari 90 hari untuk menjaga ukuran tabel.
 * Dipanggil dari cron harian.
 */
export async function cleanupOldNotifications(): Promise<number> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const result = await prisma.notification.deleteMany({
    where: { sentAt: { lt: cutoff } },
  })
  return result.count
}

/**
 * Metrik kualitas data sumber: rasio SKIPPED_DUPLICATE vs SENT untuk dashboard admin.
 */
export async function getDedupMetrics(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const [sent, duplicate, failed] = await Promise.all([
    prisma.notification.count({ where: { sentAt: { gte: since }, status: 'SENT' } }),
    prisma.notification.count({ where: { sentAt: { gte: since }, status: 'SKIPPED_DUPLICATE' as any } }),
    prisma.notification.count({ where: { sentAt: { gte: since }, status: 'FAILED' } }),
  ])
  const total = sent + duplicate + failed
  return {
    sent, duplicate, failed, total,
    duplicateRate: total > 0 ? Math.round((duplicate / total) * 1000) / 10 : 0,
  }
}
