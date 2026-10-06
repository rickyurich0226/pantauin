import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireCronSecret } from '@/lib/cronAuth'
import { sendEmail, sendWhatsApp } from '@/lib/notifier'
import { decryptPII } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

// Pengingat perpanjangan plan H-3 dan H-1 (email + WhatsApp). Dedup via AuditLog.
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied
  const now = new Date()
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const users = await prisma.user.findMany({
    where: { plan: { not: 'FREE' }, isActive: true, planExpiresAt: { gt: now, lte: in3d } },
    select: { id: true, name: true, email: true, plan: true, planExpiresAt: true, whatsapp: true, phone: true, whatsappVerified: true },
  })
  let sent = 0, skipped = 0
  for (const u of users) {
    const exp = u.planExpiresAt as Date
    const stage = (exp.getTime() - now.getTime()) / 3600000 <= 36 ? 'H1' : 'H3'
    const action = 'PLAN_REMINDER_' + stage
    const already = await prisma.auditLog.findFirst({ where: { userId: u.id, action, createdAt: { gt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } } })
    if (already) { skipped++; continue }
    const first = (u.name || '').split(' ')[0] || 'Kak'
    const planLabel = u.plan === 'BUSINESS' ? 'Business' : 'Pro'
    const tgl = exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
    const wib = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const sisa = stage === 'H3' ? 'dalam 3 hari' : (wib(exp) === wib(now) ? 'hari ini' : 'besok')
    const url = 'https://pantau.in/upgrade'
    const html = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">'
      + '<h2 style="color:#0F2A4A">Plan ' + planLabel + ' kamu berakhir ' + sisa + '</h2>'
      + '<p>Halo ' + first + ', masa aktif Plan <strong>' + planLabel + '</strong> kamu berakhir pada <strong>' + tgl + '</strong>.</p>'
      + '<p>Setelah itu akun kembali ke Free: notifikasi WhatsApp &amp; Telegram berhenti, hanya email yang aktif.</p>'
      + '<p style="text-align:center;margin:28px 0"><a href="' + url + '" style="background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Perpanjang Sekarang</a></p>'
      + '<p style="color:#5A7090;font-size:13px">Perpanjang sebelum berakhir, sisa hari tetap terhitung.</p></div>'
    const okEmail = await sendEmail(u.email, 'Plan ' + planLabel + ' kamu berakhir ' + sisa, html)
    let okWa = false
    const waRaw = u.whatsapp || u.phone
    if (waRaw && u.whatsappVerified) {
      okWa = await sendWhatsApp(decryptPII(waRaw),
        '⏳ *Plan ' + planLabel + ' kamu berakhir ' + sisa + '*\n\nHalo ' + first + ', masa aktif Plan ' + planLabel
        + ' berakhir ' + tgl + '. Setelah itu notifikasi WhatsApp berhenti.\n\nPerpanjang sekarang (sisa hari tetap terhitung):\n' + url)
    }
    await prisma.auditLog.create({ data: { userId: u.id, userEmail: u.email, action, detail: 'email=' + okEmail + ' wa=' + okWa + ' exp=' + exp.toISOString() } })
    sent++
  }
  return NextResponse.json({ success: true, checked: users.length, sent, skipped })
}
