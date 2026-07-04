import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const disableSchema = z.object({
  password: z.string().min(1, 'Password wajib diisi untuk menonaktifkan 2FA'),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }

  const parsed = validateBody(disableSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const validPassword = await bcrypt.compare(parsed.data.password, user.password)
  if (!validPassword) {
    return NextResponse.json({ error: 'Password salah' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorSecretPending: null,
      twoFactorRecoveryCodes: [],
    } as any,
  })

  await prisma.auditLog.create({
    data: { userId, userEmail: user.email, action: '2FA_DISABLED' },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
