import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit'
import { registerSchema, validateBody } from '@/lib/validation'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { sendEmail, sendWhatsApp } from '@/lib/notifier'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit({ key: `register:${ip}`, ...RATE_LIMITS.REGISTER })
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }

  const recaptchaResult = await verifyRecaptcha(body.recaptchaToken ?? '', 'register')
  if (!recaptchaResult.success && !recaptchaResult.skipped) {
    return NextResponse.json({ error: 'Verifikasi keamanan gagal. Muat ulang halaman dan coba lagi.' }, { status: 400 })
  }

  const parsed = validateBody(registerSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { name, email, password, phone } = parsed.data
  const refCode = typeof body.refCode === 'string' ? body.refCode.toUpperCase().trim() : null

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)
    const p = prisma as any
    const user = await p.user.create({
      data: {
        name, email, password: hashed,
        phone: phone || null,
        registrationIp: String(ip).split(',')[0].trim(),
        notifChannels: { set: ['EMAIL'] },
        referredBy: refCode || null,
      },
      select: { id: true, name: true, email: true, plan: true },
    })

    if (refCode) {
      const referrer = await p.user.findFirst({ where: { referralCode: refCode } })
      if (referrer) {
        // +7 hari Pro untuk referrer
        const referrerExpiry = referrer.planExpiresAt && referrer.planExpiresAt > new Date()
          ? new Date(referrer.planExpiresAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await p.user.update({
          where: { id: referrer.id },
          data: {
            referralCount: { increment: 1 },
            plan: 'PRO',
            planExpiresAt: referrerExpiry,
          }
        })
        // +7 hari Pro untuk referee (user baru)
        const refereeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await p.user.update({
          where: { id: user.id },
          data: { plan: 'PRO', planExpiresAt: refereeExpiry }
        })
        await prisma.auditLog.create({
          data: { userId: user.id, userEmail: user.email, action: 'REFERRAL_BONUS', detail: `Referred by ${referrer.email}, both get +7 days Pro`, ipAddress: String(ip).split(',')[0].trim() }
        }).catch(() => {})
      }
    }

    await prisma.auditLog.create({
      data: { userId: user.id, userEmail: user.email, action: 'USER_REGISTERED', ipAddress: String(ip).split(',')[0].trim() },
    }).catch(() => {})

    // Welcome notification (fire & forget)
    const firstName = name.split(' ')[0]
    const welcomeHtml = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">'
      + '<div style="background:linear-gradient(135deg,#0D1B2A,#1560BD,#0F6E56);padding:32px;text-align:center;border-radius:16px 16px 0 0;">'
      + '<div style="font-size:40px;margin-bottom:8px;">🎉</div>'
      + '<h1 style="color:white;font-size:24px;margin:0;">Selamat datang, ' + firstName + '!</h1>'
      + '<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Akun Pantau.in kamu sudah aktif!</p>'
      + '</div>'
      + '<div style="background:white;padding:28px;border:1px solid #DDE5EF;">'
      + '<p style="font-size:15px;color:#0D1B2A;line-height:1.7;">Hei <strong>' + firstName + '</strong> 👋<br><br>'
      + 'Kamu baru saja bergabung dengan ribuan pengusaha yang sudah memanfaatkan <strong>Pantau.in</strong> untuk tidak melewatkan satu pun peluang bisnis!</p>'
      + '<div style="background:#F0F4F9;border-radius:12px;padding:16px;margin:20px 0;">'
      + '<p style="margin:0 0 8px;font-size:14px;"><strong>🚀 Mulai dalam 3 langkah:</strong></p>'
      + '<p style="margin:0 0 6px;font-size:14px;">1️⃣ Buat pantauan — tulis apa yang kamu cari</p>'
      + '<p style="margin:0 0 6px;font-size:14px;">2️⃣ Pilih kategori: Tender, Properti, Bisnis, dll</p>'
      + '<p style="margin:0;font-size:14px;">3️⃣ Duduk santai — kami yang pantau, kamu yang action! 💪</p>'
      + '</div>'
      + '<a href="https://pantau.in/dashboard/watches" style="display:block;background:linear-gradient(135deg,#1560BD,#0F6E56);color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-size:15px;font-weight:700;">✨ Buat Pantauan Pertamamu →</a>'
      + '</div>'
      + '<div style="background:#F8FAFC;padding:16px;text-align:center;border-radius:0 0 16px 16px;border:1px solid #DDE5EF;border-top:none;">'
      + '<p style="font-size:12px;color:#9EB3C8;margin:0;">© 2026 Pantau.in · <a href="https://pantau.in" style="color:#9EB3C8;">pantau.in</a></p>'
      + '</div></div>'

    sendEmail(email, '🎉 Selamat datang di Pantau.in, ' + firstName + '!', welcomeHtml).catch(() => {})

    if (phone) {
      const waPhone = phone.replace(/^0/, '62').replace(/[^0-9]/g, '')
      const lines = [
        '*🎉 Selamat datang di Pantau.in, ' + firstName + '!*',
        '',
        'Akun kamu sudah aktif dan siap memantau peluang bisnis 24/7! 🚀',
        '',
        'Yang bisa kamu pantau:',
        '📋 Tender & Pengadaan Pemerintah',
        '🏠 Properti Murah',
        '🚗 Kendaraan',
        '💼 Peluang Bisnis',
        '👔 Lowongan Kerja',
        '🎓 Beasiswa',
        '',
        '*Yuk buat pantauan pertamamu:*',
        '👉 https://pantau.in/dashboard/watches',
        '',
        'Butuh bantuan? Balas pesan ini ya! 😊',
        '',
        '_Tim Pantau.in_'
      ]
      sendWhatsApp(waPhone, lines.join('\n')).catch(() => {})
    }

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('[Register]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
