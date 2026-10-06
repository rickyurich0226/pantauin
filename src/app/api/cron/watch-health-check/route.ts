import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/notifier'
import { buildNoMatchNudgeEmail, diagnoseNoMatch } from '@/lib/watch-nudges'
import { requireCronSecret } from '@/lib/cronAuth'
export const dynamic = 'force-dynamic'

async function sendTelegramReport(msg: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID || '901470999'
    if (!token) return
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
    })
  } catch {}
}

/**
 * Cron harian: cari watch aktif berumur >= 3 hari yang BELUM PERNAH punya
 * notifikasi status SENT sama sekali, lalu kirim email diagnosis + saran ke
 * user pemiliknya. Supaya user tidak mengira sistem berhenti bekerja padahal
 * memang belum ada peluang yang cocok dengan keyword mereka.
 * Anti-duplikat: 1x per watch, ditandai lewat AuditLog action unik per watchId.
 * Sekaligus kirim laporan ringkas ke Telegram supaya admin tahu siapa saja
 * yang baru dapat email ini dan diagnosis/rekomendasi apa yang dikasih.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const results = { checked: 0, sent: 0, skippedHasMatch: 0, skippedAlreadyNudged: 0, errors: 0 }
  const nudgedList: { userName: string; email: string; watchName: string; queryText: string; days: number; reason: string; suggestion: string }[] = []

  const candidates = await prisma.watchQuery.findMany({
    where: { isActive: true, createdAt: { lte: threeDaysAgo } },
    include: { user: { select: { id: true, name: true, email: true, notifEnabled: true } } },
  })

  for (const watch of candidates) {
    results.checked++
    const action = `NO_MATCH_NUDGE:${watch.id}`
    const already = await prisma.auditLog.findFirst({ where: { userId: watch.userId, action } })
    if (already) { results.skippedAlreadyNudged++; continue }

    const everSent = await prisma.notification.count({ where: { watchId: watch.id, status: 'SENT' } })
    if (everSent > 0) { results.skippedHasMatch++; continue }

    if (!watch.user?.email || !watch.user.notifEnabled) continue

    const daysSinceCreated = Math.floor((Date.now() - new Date(watch.createdAt).getTime()) / 86400000)
    const { subject, html } = buildNoMatchNudgeEmail({
      userName: watch.user.name || 'Pengguna',
      watchName: watch.name,
      queryText: watch.queryText,
      daysSinceCreated,
    })

    try {
      const ok = await sendEmail(watch.user.email, subject, html)
      if (ok) {
        await prisma.auditLog.create({ data: { userId: watch.userId, userEmail: watch.user.email, action, detail: `Watch: ${watch.name}` } })
        results.sent++
        const { reason, suggestion } = diagnoseNoMatch(watch.queryText)
        nudgedList.push({
          userName: watch.user.name || watch.user.email,
          email: watch.user.email,
          watchName: watch.name,
          queryText: watch.queryText,
          days: daysSinceCreated,
          reason, suggestion,
        })
      } else {
        results.errors++
      }
    } catch {
      results.errors++
    }
  }

  if (nudgedList.length > 0) {
    let msg = `📬 <b>Watch Health Check — ${nudgedList.length} email nudge terkirim</b>\n${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    for (const n of nudgedList) {
      msg += `👤 <b>${n.userName}</b> (${n.email})\n`
      msg += `📌 Watch: "${n.watchName}" — "${n.queryText}" (${n.days} hari, 0 match)\n`
      msg += `➜ Diagnosis: ${n.reason}\n`
      msg += `➜ Saran yang dikirim: ${n.suggestion}\n\n`
    }
    await sendTelegramReport(msg.trim())
  }

  return NextResponse.json({ success: true, ...results, nudged: nudgedList.map(n => ({ email: n.email, watchName: n.watchName })) })
}
