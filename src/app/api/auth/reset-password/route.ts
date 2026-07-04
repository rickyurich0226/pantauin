import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/ratelimit'
import bcrypt from 'bcryptjs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit({ key: `reset-pw:${ip}`, limit: 5, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak request' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }

  const { token, password } = body
  if (!token || !password) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
  if (password.length > 128) return NextResponse.json({ error: 'Password terlalu panjang' }, { status: 400 })

  // Cari token di AuditLog
  const logs = await prisma.auditLog.findMany({
    where: { action: 'PASSWORD_RESET_REQUEST' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  let userId: string | null = null
  let logId: string | null = null

  for (const log of logs) {
    try {
      const data = JSON.parse(log.detail ?? '{}')
      if (data.token === token) {
        const expires = new Date(data.expires)
        if (expires < new Date()) return NextResponse.json({ error: 'Link sudah kadaluarsa. Minta link baru.' }, { status: 400 })
        userId = log.userId ?? null
        logId = log.id
        break
      }
    } catch {}
  }

  if (!userId) return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })

  // Hash password baru
  const hashed = await bcrypt.hash(password, 12)

  // Update password
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

  // Invalidate token — hapus log entry
  if (logId) {
    await prisma.auditLog.update({
      where: { id: logId },
      data: { detail: JSON.stringify({ token: 'USED', expires: new Date().toISOString() }) }
    })
  }

  // Audit log reset success
  await prisma.auditLog.create({
    data: { userId, userEmail: '', action: 'PASSWORD_RESET_SUCCESS', ipAddress: ip }
  })

  return NextResponse.json({ success: true })
}
