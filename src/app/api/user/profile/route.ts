import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/ratelimit'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { normalizeWaNumber } from '@/lib/whatsapp-otp'
import { sendEmail } from '@/lib/notifier'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: (s.user as any).id },
    select: { businessType: true, businessDesc: true, businessCity: true, businessBudget: true, profileComplete: true, name: true,
      phone: true, whatsapp: true, telegramId: true, whatsappVerified: true }
  })
  if (!user) return NextResponse.json(user)
  return NextResponse.json({
    ...user,
    phone: user.phone ? decryptPII(user.phone) : null,
    whatsapp: user.whatsapp ? decryptPII(user.whatsapp) : null,
  })
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { businessType, businessDesc, businessCity, businessBudget } = await req.json()
  const user = await prisma.user.update({
    where: { id: (s.user as any).id },
    data: { businessType, businessDesc, businessCity, businessBudget, profileComplete: true }
  })
  return NextResponse.json({ success: true, profileComplete: user.profileComplete })
}

// Dipakai halaman Pengaturan untuk 2 hal: simpan profil, atau ganti password.
export async function PUT(req: NextRequest) {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id as string
  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()

  // ---- Mode ganti password ----
  if (body.currentPassword !== undefined || body.newPassword !== undefined) {
    if (!rateLimit({ key: 'pw-change:' + userId, limit: 5, windowMs: 15 * 60 * 1000 }).allowed) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }, { status: 429 })
    }
    const cur = String(body.currentPassword || '')
    const nw = String(body.newPassword || '')
    if (!cur || !nw) return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 })
    if (nw.length < 8) return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 })
    if (nw === cur) return NextResponse.json({ error: 'Password baru harus berbeda dari password lama' }, { status: 400 })
    const ok = user.password ? await bcrypt.compare(cur, user.password) : false
    if (!ok) return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })
    await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(nw, 12) } })
    await prisma.auditLog.create({ data: { userId, userEmail: user.email, action: 'PASSWORD_CHANGED', ipAddress: ip } }).catch(() => {})
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' })
    sendEmail(user.email, 'Password akun Pantau.in kamu diubah',
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0D1B2A">'
      + '<h2 style="margin:0 0 12px">Password kamu baru saja diubah</h2>'
      + '<p style="line-height:1.6">Password akun Pantau.in kamu diubah pada <strong>' + waktu + ' WIB</strong>.</p>'
      + '<p style="line-height:1.6">Kalau ini bukan kamu, segera reset password lewat <a href="https://pantau.in/forgot-password">halaman lupa password</a> dan hubungi kami.</p>'
      + '</div>').catch(() => {})
    return NextResponse.json({ success: true })
  }

  // ---- Mode simpan profil (kolom kosong TIDAK menghapus data) ----
  const data: any = {}
  const digits = (v: any) => String(v || '').replace(/[^0-9]/g, '').replace(/^0/, '62')
  if (typeof body.name === 'string' && body.name.trim()) {
    const nm = body.name.trim()
    if (nm.length < 2 || nm.length > 100) return NextResponse.json({ error: 'Nama 2 sampai 100 karakter' }, { status: 400 })
    if (nm !== user.name) data.name = nm
  }
  if (typeof body.phone === 'string' && body.phone.trim()) {
    if (digits(body.phone).length < 9) return NextResponse.json({ error: 'Nomor telepon tidak valid' }, { status: 400 })
    const oldP = user.phone ? decryptPII(user.phone) : ''
    if (digits(body.phone) !== digits(oldP)) data.phone = encryptPII(body.phone.trim())
  }
  let waChanged = false
  if (typeof body.whatsapp === 'string' && body.whatsapp.trim()) {
    const n = normalizeWaNumber(body.whatsapp)
    if (!n) return NextResponse.json({ error: 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890' }, { status: 400 })
    const oldW = user.whatsapp ? normalizeWaNumber(decryptPII(user.whatsapp)) : null
    if (n !== oldW) {
      data.whatsapp = encryptPII(body.whatsapp.trim()); data.whatsappVerified = false; waChanged = true
      // Nomor WA baru ditambahkan pertama kali oleh user Pro -> otomatis aktifkan
      // WhatsApp sebagai channel notifikasi, supaya nomor yang disimpan nggak nganggur
      // (user sering cuma isi nomor di tab Profil tanpa sadar harus centang channel
      // terpisah di tab Notifikasi). Tidak dipaksakan ke user FREE (channel ini gated
      // Pro), dan tidak menimpa pilihan user yang sudah pernah punya nomor WA sebelumnya
      // (supaya tidak override kalau mereka sengaja matikan channel WA).
      if (!user.whatsapp && (user as any).plan !== 'FREE' && !user.notifChannels.includes('WHATSAPP' as any)) {
        data.notifChannels = [...user.notifChannels, 'WHATSAPP']
      }
    }
  }
  if (typeof body.telegramId === 'string' && body.telegramId.trim()) {
    const t = body.telegramId.trim()
    if (!/^-?[0-9]{5,20}$/.test(t)) return NextResponse.json({ error: 'Telegram Chat ID harus berupa angka (dapatkan dari bot dengan /start)' }, { status: 400 })
    if (t !== user.telegramId) data.telegramId = t
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ success: true, changed: false })
  await prisma.user.update({ where: { id: userId }, data })
  await prisma.auditLog.create({ data: { userId, userEmail: user.email, action: 'PROFILE_UPDATED', detail: Object.keys(data).join(','), ipAddress: ip } }).catch(() => {})
  return NextResponse.json({ success: true, changed: true, waNeedsVerify: waChanged })
}
