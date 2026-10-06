import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalSources, activeSources,
    lastFetch, itemsToday, totalItems,
    lastMatch, notifsToday, notifsTotal,
    lastDispatch, activeUsers, activeWatches,
    dailyNotifs
  ] = await Promise.all([
    prisma.scraperJob.count(),
    prisma.scraperJob.count({ where: { isActive: true } }),
    prisma.scraperJob.findFirst({ where: { isActive: true }, orderBy: { lastRunAt: 'desc' }, select: { lastRunAt: true, source: true, itemsFound: true } }),
    prisma.listingItem.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.listingItem.count(),
    prisma.listingItem.findFirst({ where: { matchedAt: { not: null } }, orderBy: { matchedAt: 'desc' }, select: { matchedAt: true } }),
    prisma.notification.count({ where: { sentAt: { gte: oneDayAgo } } }),
    prisma.notification.count(),
    prisma.notification.findFirst({ orderBy: { sentAt: 'desc' }, select: { sentAt: true } }),
    prisma.user.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
    prisma.watchQuery.count({ where: { isActive: true } }),
    prisma.$queryRaw`
      SELECT DATE("sentAt") as date, COUNT(*)::int as count
      FROM "Notification"
      WHERE "sentAt" >= ${sevenDaysAgo}
      GROUP BY DATE("sentAt")
      ORDER BY date ASC
    `,
  ])

  const fetchAge = lastFetch?.lastRunAt ? Math.floor((now.getTime() - new Date(lastFetch.lastRunAt).getTime()) / 60000) : 999
  const matchAge = lastMatch?.matchedAt ? Math.floor((now.getTime() - new Date(lastMatch.matchedAt).getTime()) / 60000) : 999
  const dispatchAge = lastDispatch?.sentAt ? Math.floor((now.getTime() - new Date(lastDispatch.sentAt).getTime()) / 60000) : 999

  return NextResponse.json({
    fetch: { lastRunAt: lastFetch?.lastRunAt, ageMinutes: fetchAge, status: fetchAge < 10 ? 'ok' : fetchAge < 30 ? 'warning' : 'error', itemsToday, totalItems, activeSources, totalSources },
    matching: { lastMatchAt: lastMatch?.matchedAt, ageMinutes: matchAge, status: matchAge < 60 ? 'ok' : matchAge < 180 ? 'warning' : 'error' },
    dispatch: { lastSentAt: lastDispatch?.sentAt, ageMinutes: dispatchAge, status: dispatchAge < 30 ? 'ok' : dispatchAge < 120 ? 'warning' : 'error', notifsToday, notifsTotal },
    users: { activeUsers, activeWatches },
    dailyNotifs,
  })
}
