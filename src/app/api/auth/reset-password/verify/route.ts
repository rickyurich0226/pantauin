import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ valid: false }) }
  const { token } = body
  if (!token) return NextResponse.json({ valid: false })

  const logs = await prisma.auditLog.findMany({
    where: { action: 'PASSWORD_RESET_REQUEST' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  for (const log of logs) {
    try {
      const data = JSON.parse(log.detail ?? '{}')
      if (data.token === token) {
        const expires = new Date(data.expires)
        if (expires > new Date()) return NextResponse.json({ valid: true })
        return NextResponse.json({ valid: false, reason: 'expired' })
      }
    } catch {}
  }
  return NextResponse.json({ valid: false })
}
