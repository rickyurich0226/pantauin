import { sendEmailCritical } from '@/lib/notifier'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/ratelimit'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit({ key: `forgot-pw:${ip}`, limit: 3, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak request' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ success: true }) }

  const { email } = body
  if (!email || typeof email !== 'string') return NextResponse.json({ success: true })

  // Always return success — jangan reveal apakah email terdaftar (security)
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) return NextResponse.json({ success: true })

  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 jam

  // Simpan token di DB — pakai AuditLog sebagai storage sementara
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userEmail: user.email!,
      action: 'PASSWORD_RESET_REQUEST',
      detail: JSON.stringify({ token, expires: expires.toISOString() }),
      ipAddress: ip,
    }
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  try {
    await sendEmailCritical(user.email!, '🔐 Reset Password Pantau.in', `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#0D1B2A">Reset Password</h2>
        <p style="color:#5A7090">Hei <strong>${user.name}</strong>, kami menerima permintaan reset password untuk akun kamu.</p>
        <p style="color:#5A7090">Klik tombol di bawah untuk membuat password baru. Link ini berlaku selama <strong>1 jam</strong>.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${resetUrl}" style="background:#1560BD;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
            Reset Password →
          </a>
        </div>
        <p style="color:#9EB3C8;font-size:12px">Jika kamu tidak meminta reset password, abaikan email ini. Password kamu tidak akan berubah.</p>
        <p style="color:#9EB3C8;font-size:12px">Link: ${resetUrl}</p>
      </div>`,)
  } catch (err) {
    console.error('[ForgotPassword] Email error:', err)
  }

  return NextResponse.json({ success: true })
}
