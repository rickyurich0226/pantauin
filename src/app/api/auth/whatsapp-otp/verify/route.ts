import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/ratelimit'
import { decryptPII } from '@/lib/crypto'
import { sendWhatsApp } from '@/lib/notifier'
import { maskWa, otpMatches, OTP_MAX_ATTEMPTS, OTP_LOCK_MS } from '@/lib/whatsapp-otp'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions)
  const userId = (s?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Silakan login dulu' }, { status: 401 })
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  if (!rateLimit({ key: 'wa-otp-verify:' + ip, limit: 30, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 })
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const code = String((body && body.code) || '').replace(/[^0-9]/g, '')
  if (code.length !== 6) return NextResponse.json({ error: 'Masukkan 6 digit kode' }, { status: 400 })

  const otp = await db.whatsappOtp.findUnique({ where: { userId } })
  if (!otp) return NextResponse.json({ error: 'Minta kode verifikasi dulu', expired: true }, { status: 400 })
  const now = Date.now()
  if (otp.lockedUntil && otp.lockedUntil.getTime() > now) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan salah. Coba lagi dalam 15 menit.', locked: true }, { status: 429 })
  }
  if (otp.expiresAt.getTime() <= now) {
    return NextResponse.json({ error: 'Kode sudah kedaluwarsa. Minta kode baru.', expired: true }, { status: 400 })
  }
  if (!otpMatches(code, userId, otp.codeHash)) {
    const attempts = otp.attempts + 1
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await db.whatsappOtp.update({ where: { userId }, data: { attempts, lockedUntil: new Date(now + OTP_LOCK_MS), expiresAt: new Date(now) } })
      return NextResponse.json({ error: 'Terlalu banyak percobaan salah. Coba lagi dalam 15 menit.', locked: true }, { status: 429 })
    }
    await db.whatsappOtp.update({ where: { userId }, data: { attempts } })
    return NextResponse.json({ error: 'Kode salah. Sisa ' + (OTP_MAX_ATTEMPTS - attempts) + ' percobaan.', remaining: OTP_MAX_ATTEMPTS - attempts }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true } })
  await prisma.user.update({ where: { id: userId }, data: { whatsapp: otp.phone, phone: (user && user.phone) || otp.phone, whatsappVerified: true, needsProfile: false } })
  await db.whatsappOtp.delete({ where: { userId } })
  await prisma.auditLog.create({ data: { userId, userEmail: (user && user.email) || '', action: 'WA_VERIFIED', ipAddress: ip } }).catch(() => {})

  const target = decryptPII(otp.phone)
  sendWhatsApp(target, '*Nomor WhatsApp kamu terverifikasi!*\n\nNomor ini siap menerima notifikasi peluang dari Pantau.in.\n\nBuat pantauan pertamamu:\nhttps://pantau.in/dashboard/watches\n\n_Tim Pantau.in_').catch(() => {})
  return NextResponse.json({ ok: true, maskedPhone: maskWa(target) })
}
