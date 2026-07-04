import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail, sendWhatsApp, sendTelegram, buildAlertEmail, buildAlertMessage } from '@/lib/notifier'
import { decryptPII } from '@/lib/crypto'
import { rateLimit } from '@/lib/ratelimit'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id

  // Rate limit: max 3 test per menit
  const rl = rateLimit({ key: `test-notif:${userId}`, limit: 3, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak test. Tunggu 1 menit.' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const { watchId } = body
  if (!watchId) return NextResponse.json({ error: 'watchId wajib' }, { status: 400 })

  const [watch, user] = await Promise.all([
    prisma.watchQuery.findFirst({ where: { id: watchId, userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, whatsapp: true, telegramId: true, plan: true, notifChannels: true } })
  ])

  if (!watch) return NextResponse.json({ error: 'Watch tidak ditemukan' }, { status: 404 })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const isPro = user.plan !== 'FREE'
  const results: Record<string, boolean> = {}

  // Test Email — semua plan
  const emailHtml = buildAlertEmail({
    userName: user.name ?? 'User',
    title: `[TEST] Pantauan "${watch.name}" berfungsi! 🎉`,
    score: 95,
    url: 'https://pantau.in/dashboard',
    category: watch.category,
  })
  results.email = await sendEmail(
    user.email!,
    `[TEST] Notifikasi Pantau.in — ${watch.name}`,
    emailHtml
  )

  // Test WhatsApp — Pro only
  if (isPro && user.notifChannels.includes('WHATSAPP' as any)) {
    const waNumber = user.whatsapp ? decryptPII(user.whatsapp) : ''
    if (waNumber) {
      const msg = buildAlertMessage({
        title: `[TEST] Pantauan "${watch.name}" berfungsi! 🎉`,
        score: 95,
        url: 'https://pantau.in/dashboard',
      })
      results.whatsapp = await sendWhatsApp(waNumber, msg)
    } else {
      results.whatsapp_error = false
    }
  }

  // Test Telegram — Pro only
  if (isPro && user.notifChannels.includes('TELEGRAM' as any)) {
    if (user.telegramId) {
      const msg = buildAlertMessage({
        title: `[TEST] Pantauan "${watch.name}" berfungsi! 🎉`,
        score: 95,
        url: 'https://pantau.in/dashboard',
      })
      results.telegram = await sendTelegram(decryptPII(user.telegramId), msg)
    }
  }

  const anySuccess = Object.values(results).some(v => v === true)
  if (!anySuccess) return NextResponse.json({ error: 'Gagal mengirim notifikasi. Cek konfigurasi channel di Pengaturan.' }, { status: 500 })

  return NextResponse.json({ success: true, results })
}
