import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!['ADMIN', 'SUPER_ADMIN'].includes((s?.user as any)?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json({ logs })
}
