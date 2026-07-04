import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id

  const now = new Date()
  const days7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const days30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [notifLast7Days, totalNotifs, activeWatches, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, sentAt: { gte: days7ago } },
      select: { sentAt: true, status: true, channel: true },
      orderBy: { sentAt: 'asc' },
    }),
    prisma.notification.count({ where: { userId, sentAt: { gte: days30ago } } }),
    prisma.watchQuery.count({ where: { userId, isActive: true } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  // Build daily chart data untuk 7 hari terakhir
  const chartData: { date: string; count: number; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
    const count = notifLast7Days.filter(n => n.sentAt.toISOString().split('T')[0] === dateStr).length
    chartData.push({ date: dateStr, count, label })
  }

  // Channel breakdown
  const channelBreakdown = notifLast7Days.reduce((acc: Record<string,number>, n) => {
    acc[n.channel] = (acc[n.channel] ?? 0) + 1
    return acc
  }, {})

  const totalLast7 = notifLast7Days.length
  const sentLast7 = notifLast7Days.filter(n => n.status === 'SENT').length

  return NextResponse.json({
    chartData,
    totalLast7,
    totalLast30: totalNotifs,
    sentLast7,
    activeWatches,
    unreadCount,
    channelBreakdown,
    successRate: totalLast7 > 0 ? Math.round((sentLast7 / totalLast7) * 100) : 0,
  })
}
