import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/ratelimit'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { sendWhatsApp } from '@/lib/notifier'
import { normalizeWaNumber, maskWa, generateOtp, hashOtp, otpMessage, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, OTP_MAX_SENDS_PER_HOUR } from '@/lib/whatsapp-otp'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions)
  const userId = (s?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Silakan login dulu' }, { status: 401 })
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  if (!rateLimit({ key: 'wa-otp-send:' + ip, limit: 10, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 })
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { whatsapp: true, phone: true } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  const stored = user.whatsapp || user.phone
  const raw = body && body.phone ? String(body.phone) : (stored ? decryptPII(stored) : '')
  const target = normalizeWaNumber(raw)
  if (!target) return NextResponse.json({ error: 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890' }, { status: 400 })

  const now = Date.now()
  const existing = await db.whatsappOtp.findUnique({ where: { userId } })
  if (existing && existing.lockedUntil && existing.lockedUntil.getTime() > now) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan salah. Coba lagi beberapa menit lagi.', retryAfter: Math.ceil((existing.lockedUntil.getTime() - now) / 1000) }, { status: 429 })
  }
  if (existing && now - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000)
    return NextResponse.json({ error: 'Kode baru saja dikirim. Tunggu sebentar sebelum kirim ulang.', retryAfter, maskedPhone: maskWa(target), pending: true }, { status: 429 })
  }
  const windowFresh = !!existing && now - existing.windowStart.getTime() < 60 * 60 * 1000
  const sendCount = windowFresh ? existing.sendCount : 0
  if (sendCount >= OTP_MAX_SENDS_PER_HOUR) {
    const retryAfter = Math.ceil((existing.windowStart.getTime() + 60 * 60 * 1000 - now) / 1000)
    return NextResponse.json({ error: 'Batas kirim kode tercapai (3x per jam). Coba lagi nanti.', retryAfter }, { status: 429 })
  }

  const code = generateOtp()
  const data = {
    phone: encryptPII(target), codeHash: hashOtp(code, userId), expiresAt: new Date(now + OTP_TTL_MS),
    attempts: 0, sendCount: sendCount + 1, windowStart: windowFresh ? existing.windowStart : new Date(now),
    lastSentAt: new Date(now), lockedUntil: null,
  }
  await db.whatsappOtp.upsert({ where: { userId }, create: { userId, ...data }, update: data })
  const ok = await sendWhatsApp(target, otpMessage(code))
  if (!ok) return NextResponse.json({ error: 'Gagal mengirim WhatsApp. Pastikan nomor aktif di WhatsApp.' }, { status: 502 })
  return NextResponse.json({ ok: true, maskedPhone: maskWa(target), resendIn: OTP_RESEND_COOLDOWN_MS / 1000, expiresIn: OTP_TTL_MS / 1000 })
}
