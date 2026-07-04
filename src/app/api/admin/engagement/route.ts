import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!['ADMIN', 'SUPER_ADMIN'].includes((s?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    usersWithWatch,
    usersLoggedIn7d,
    totalNotifs7d,
    totalNotifsAll,
    feedbackRelevant,
    feedbackNotRelevant,
    feedbackNone,
    topWatchesByNotif,
    recentNotRelevant,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.watchQuery.findMany({ select: { userId: true }, distinct: ['userId'] }).then(r => r.length),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.notification.count({ where: { sentAt: { gte: sevenDaysAgo } } }),
    prisma.notification.count(),
    prisma.notification.count({ where: { feedback: 'RELEVANT' } }),
    prisma.notification.count({ where: { feedback: 'NOT_RELEVANT' } }),
    prisma.notification.count({ where: { OR: [{ feedback: null }, { feedback: '' }] } }),
    prisma.watchQuery.findMany({
      select: { id: true, name: true, queryText: true, category: true, userId: true,
        _count: { select: { } } },
      take: 0,
    }),
    prisma.notification.findMany({
      where: { feedback: 'NOT_RELEVANT' },
      select: {
        title: true, matchScore: true, sentAt: true,
        watch: { select: { queryText: true, category: true, name: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 15,
    }),
  ])

  const usersWithoutWatch = totalUsers - usersWithWatch
  const feedbackTotal = feedbackRelevant + feedbackNotRelevant
  const relevanceRate = feedbackTotal > 0 ? Math.round((feedbackRelevant / feedbackTotal) * 100) : null
  const feedbackRate = totalNotifsAll > 0 ? Math.round((feedbackTotal / totalNotifsAll) * 1000) / 10 : 0
  const watchActivationRate = totalUsers > 0 ? Math.round((usersWithWatch / totalUsers) * 100) : 0

  return NextResponse.json({
    totalUsers,
    usersWithWatch,
    usersWithoutWatch,
    watchActivationRate,
    usersLoggedIn7d,
    totalNotifs7d,
    totalNotifsAll,
    feedback: {
      relevant: feedbackRelevant,
      notRelevant: feedbackNotRelevant,
      none: feedbackNone,
      total: feedbackTotal,
      relevanceRate,
      feedbackRate,
    },
    recentNotRelevant,
  })
}
