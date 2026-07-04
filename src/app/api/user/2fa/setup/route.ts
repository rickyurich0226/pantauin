import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateTotpSecret, buildOtpAuthUrl, encryptTotpSecret, generateRecoveryCodes } from '@/lib/totp'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * Langkah 1 dari setup 2FA: generate secret baru + URL untuk QR code.
 * Secret BELUM disimpan permanen di sini — baru disimpan setelah user
 * berhasil verifikasi 1 kode di endpoint /verify (memastikan mereka benar-benar
 * sudah scan QR dan setup aplikasi authenticator-nya dengan benar).
 * Secret sementara disimpan di kolom twoFactorSecretPending (belum aktif).
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if ((user as any).twoFactorEnabled) {
    return NextResponse.json({ error: '2FA sudah aktif. Nonaktifkan dulu sebelum setup ulang.' }, { status: 400 })
  }

  const secret = generateTotpSecret()
  const otpAuthUrl = buildOtpAuthUrl({ email: user.email, secret })
  const encryptedSecret = encryptTotpSecret(secret)

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecretPending: encryptedSecret } as any,
  })

  return NextResponse.json({
    otpAuthUrl,        // dipakai client untuk render QR code (qrcode.react atau sejenisnya)
    secret,             // ditampilkan sebagai teks manual entry jika user tidak bisa scan
  })
}
