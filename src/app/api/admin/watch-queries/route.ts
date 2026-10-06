import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

async function adminAuth() {
  const s = await getServerSession(authOptions)
  return ['ADMIN', 'SUPER_ADMIN'].includes((s?.user as any)?.role) ? s : null
}

const BROAD_THRESHOLD = 500

export async function GET(req: NextRequest) {
  const s = await adminAuth()
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const category = url.searchParams.get('category')
  const status = url.searchParams.get('status')
  const limit = Number(url.searchParams.get('limit') || 100)

  const watches = await prisma.watchQuery.findMany({
    where: {
      ...(q && {
        OR: [
          { queryText: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }),
      ...(category && category !== 'ALL' && { category: category as any }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true, plan: true } },
      notifications: { orderBy: { sentAt: 'desc' }, take: 1, select: { sentAt: true } },
      _count: { select: { notifications: true } },
    },
  })

  const watchIds = watches.map((w) => w.id)

  const statusGroups = watchIds.length
    ? await prisma.notification.groupBy({
        by: ['watchId', 'status'],
        where: { watchId: { in: watchIds } },
        _count: true,
      })
    : []

  const readGroups = watchIds.length
    ? await prisma.notification.groupBy({
        by: ['watchId', 'isRead'],
        where: { watchId: { in: watchIds } },
        _count: true,
      })
    : []

  const statusMap: Record<string, Record<string, number>> = {}
  for (const g of statusGroups) {
    const wid = g.watchId as string
    if (!statusMap[wid]) statusMap[wid] = {}
    statusMap[wid][g.status] = g._count
  }

  const readMap: Record<string, number> = {}
  for (const g of readGroups) {
    const wid = g.watchId as string
    if (g.isRead) readMap[wid] = g._count
  }

  const now = Date.now()
  const result = watches
    .map((w) => {
      const totalMatches = w._count.notifications
      const lastMatchAt = w.notifications[0]?.sentAt || null
      const ageDays = Math.floor((now - new Date(w.createdAt).getTime()) / 86400000)
      const isStale = w.isActive && totalMatches === 0 && ageDays >= 3
      const isBroad = totalMatches >= BROAD_THRESHOLD
      const sMap = statusMap[w.id] || {}
      return {
        id: w.id,
        name: w.name,
        category: w.category,
        queryText: w.queryText,
        channels: w.channels,
        frequency: w.frequency,
        isActive: w.isActive,
        createdAt: w.createdAt,
        lastRunAt: w.lastRunAt,
        totalMatches,
        sent: sMap.SENT || 0,
        failed: sMap.FAILED || 0,
        queued: sMap.QUEUED || 0,
        read: readMap[w.id] || 0,
        lastMatchAt,
        ageDays,
        isStale,
        isBroad,
        user: w.user,
      }
    })
    .filter((w) => (status === 'no_match' ? w.isStale : true))
    .filter((w) => (status === 'broad' ? w.isBroad : true))

  const summary = {
    total: watches.length,
    active: watches.filter((w) => w.isActive).length,
    noMatchYet: result.filter((w) => w.isStale).length,
    broadKeyword: result.filter((w) => w.isBroad).length,
  }

  return NextResponse.json({ watches: result, summary })
}
