import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { loginSchema, validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * Dipanggil oleh halaman login SEBELUM signIn() NextAuth, untuk menentukan
 * apakah perlu menampilkan input kode 2FA. Mengecek password ASLI di sini
 * (bukan cuma cek "apakah email punya 2FA") supaya penyerang tidak bisa
 * enumerasi akun mana yang pakai 2FA tanpa tahu password yang benar dulu.
 *
 * Response:
 *   { ok: true, requires2FA: false }                 -> langsung signIn() tanpa totpToken
 *   { ok: true, requires2FA: true }                   -> tampilkan input kode, lalu signIn() dengan totpToken
 *   { ok: false, error: '...' }                       -> email/password salah, atau rate limited
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Body tidak valid' }, { status: 400 }) }

  const parsed = validateBody(loginSchema, body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
  const { email, password } = parsed.data
  const recaptchaToken = body.recaptchaToken ?? ''

  const rl = rateLimit({ key: `login-check:${ip}:${email}`, ...RATE_LIMITS.LOGIN })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 })
  }

  const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'login')
  if (!recaptchaResult.success && !recaptchaResult.skipped) {
    return NextResponse.json({ ok: false, error: 'Verifikasi keamanan gagal. Muat ulang halaman dan coba lagi.' }, { status: 400 })
  }

  // Pesan error generik untuk email tidak ditemukan / password salah / akun nonaktif,
  // agar tidak membocorkan informasi mana yang salah (mencegah user enumeration).
  const genericError = { ok: false as const, error: 'Email atau password salah' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) return NextResponse.json(genericError, { status: 401 })

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) return NextResponse.json(genericError, { status: 401 })

  const requires2FA = !!((user as any).twoFactorEnabled && (user as any).twoFactorSecret)

  return NextResponse.json({ ok: true, requires2FA })
}
