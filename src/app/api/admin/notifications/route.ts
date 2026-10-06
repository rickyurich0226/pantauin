import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
async function adminAuth() {
  const s = await getServerSession(authOptions)
  return ['ADMIN', 'SUPER_ADMIN'].includes((s?.user as any)?.role) ? s : null
}
export async function GET(req: NextRequest) {
  const s = await adminAuth()
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const status = url.searchParams.get('status')
  const channel = url.searchParams.get('channel')
  const limit = Number(url.searchParams.get('limit') || 100)
  const where: any = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ],
    }),
    ...(status && status !== 'ALL' && { status: status as any }),
    ...(channel && channel !== 'ALL' && { channel: channel as any }),
  }
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true, plan: true } },
      watch: { select: { name: true, category: true } },
    },
  })
  const [totalSent, totalFailed, totalSkipped, totalQueued] = await Promise.all([
    prisma.notification.count({ where: { status: 'SENT' } }),
    prisma.notification.count({ where: { status: 'FAILED' } }),
    prisma.notification.count({ where: { status: { in: ['SKIPPED', 'SKIPPED_DUPLICATE'] } } }),
    prisma.notification.count({ where: { status: 'QUEUED' } }),
  ])
  return NextResponse.json({
    notifications,
    summary: { totalSent, totalFailed, totalSkipped, totalQueued },
  })
}
