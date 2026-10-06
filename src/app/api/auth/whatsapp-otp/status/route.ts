import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { decryptPII } from '@/lib/crypto'
import { normalizeWaNumber, maskWa } from '@/lib/whatsapp-otp'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  const userId = (s?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { whatsapp: true, phone: true, whatsappVerified: true, plan: true } })
  if (!u) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  const stored = u.whatsapp || u.phone
  const n = stored ? normalizeWaNumber(decryptPII(stored)) : null
  return NextResponse.json({ verified: u.whatsappVerified, hasNumber: !!n, maskedPhone: n ? maskWa(n) : null, plan: u.plan })
}
