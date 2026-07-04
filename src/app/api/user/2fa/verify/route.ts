import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { verifyTotpToken, decryptTotpSecret, generateRecoveryCodes } from '@/lib/totp'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const verifySchema = z.object({
  token: z.string().trim().regex(/^[0-9]{6}$/, 'Kode harus 6 digit angka'),
})

/**
 * Langkah 2: user memasukkan kode 6 digit dari aplikasi authenticator untuk
 * konfirmasi setup berhasil. Jika valid, secret dipindah dari "pending" ke aktif,
 * dan 8 recovery codes di-generate (ditampilkan SEKALI SAJA ke user, hash disimpan).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }

  const parsed = validateBody(verifySchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const pendingSecret = (user as any)?.twoFactorSecretPending
  if (!user || !pendingSecret) {
    return NextResponse.json({ error: 'Tidak ada setup 2FA yang sedang berlangsung. Mulai ulang dari awal.' }, { status: 400 })
  }

  const decryptedSecret = decryptTotpSecret(pendingSecret)
  const isValid = verifyTotpToken(parsed.data.token, decryptedSecret)

  if (!isValid) {
    return NextResponse.json({ error: 'Kode salah. Pastikan waktu di HP kamu akurat dan coba lagi.' }, { status: 400 })
  }

  const recoveryCodes = generateRecoveryCodes(8)
  const hashedCodes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)))

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: pendingSecret,
      twoFactorSecretPending: null,
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: hashedCodes,
    } as any,
  })

  await prisma.auditLog.create({
    data: { userId, userEmail: user.email, action: '2FA_ENABLED' },
  }).catch(() => {})

  // Recovery codes plaintext hanya dikirim SEKALI di response ini, tidak pernah lagi setelahnya.
  return NextResponse.json({ success: true, recoveryCodes })
}
