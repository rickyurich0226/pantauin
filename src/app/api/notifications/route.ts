import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

async function auth() { const s = await getServerSession(authOptions); return s?.user ? s : null }

export async function GET(req: NextRequest) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      include: { watch: { select: { name: true, category: true } } },
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])
  return NextResponse.json({ notifications, unread })
}

export async function PUT(req: NextRequest) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const { id } = body
  if (id) {
    const notif = await prisma.notification.findFirst({ where: { id, userId } })
    if (!notif) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    await prisma.notification.update({ where: { id }, data: { isRead: true } })
  } else {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const { id } = body
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
  const r = await prisma.notification.deleteMany({ where: { id, userId } })
  if (r.count === 0) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ success: true })
}
