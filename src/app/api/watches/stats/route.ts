import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id

  const watches = await prisma.watchQuery.findMany({
    where: { userId },
    select: { id: true }
  })
  const watchIds = watches.map(w => w.id)

  const [notifCounts, lastMatches, sourceStatus] = await Promise.all([
    prisma.notification.groupBy({
      by: ['watchId'],
      where: { watchId: { in: watchIds }, status: { in: ['SENT', 'QUEUED'] } },
      _count: { id: true }
    }),
    prisma.notification.groupBy({
      by: ['watchId'],
      where: { watchId: { in: watchIds } },
      _max: { sentAt: true }
    }),
    prisma.scraperJob.findMany({
      where: { isActive: true },
      select: { source: true, lastRunAt: true, status: true, errorCount: true, itemsFound: true },
      orderBy: { lastRunAt: 'desc' },
      take: 1000
    })
  ])

  const stats: Record<string, any> = {}
  for (const w of watches) {
    const nc = notifCounts.find(n => n.watchId === w.id)
    const lm = lastMatches.find(n => n.watchId === w.id)
    stats[w.id] = {
      notifCount: nc?._count?.id ?? 0,
      lastMatchAt: lm?._max?.sentAt ?? null
    }
  }

  const now = Date.now()
  const sources = sourceStatus.map(job => ({
    source: job.source,
    status: job.status,
    errorCount: job.errorCount,
    itemsFound: job.itemsFound,
    lastRunAt: job.lastRunAt,
    freshness: job.lastRunAt
      ? Math.floor((now - new Date(job.lastRunAt).getTime()) / 60000)
      : null
  }))

  const healthySources = sources.filter(job => job.status === 'idle' && (job.freshness ?? 999) < 30).length
  const totalSources = sources.length

  return NextResponse.json({ stats, sources, healthySources, totalSources })
}
