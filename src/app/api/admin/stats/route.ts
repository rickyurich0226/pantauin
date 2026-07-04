import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getDedupMetrics } from '@/lib/dedup'
import { getWhatsAppFailureRate } from '@/lib/notifier'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!['ADMIN', 'SUPER_ADMIN'].includes((s?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [totalUsers, activeUsers, paidUsers, totalWatches, totalNotifs, dedupMetrics, waFailure] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { plan: { not: 'FREE' } } }),
    prisma.watchQuery.count({ where: { isActive: true } }),
    prisma.notification.count(),
    getDedupMetrics(7),
    getWhatsAppFailureRate(),
  ])

  return NextResponse.json({
    totalUsers, activeUsers, paidUsers, totalWatches, totalNotifs,
    activeScrapers: 48,
    dedupMetrics,        // { sent, duplicate, failed, total, duplicateRate }
    waFailureAlert: waFailure, // { rate, shouldAlert, total, failed }
  })
}
