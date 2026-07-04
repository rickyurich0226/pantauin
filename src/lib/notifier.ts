/* eslint-disable @typescript-eslint/no-var-requires */
const nodemailer = require('nodemailer')
import prisma from './prisma'
import { decryptPII } from './crypto'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[Email] Not configured, skipping')
      return false
    }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Pantau.in <noreply@pantau.in>',
      to, subject, html,
    })
    return true
  } catch (e) { console.error('[Email]', e); return false }
}

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    if (!process.env.WA_PHONE_NUMBER_ID || !process.env.WA_ACCESS_TOKEN) {
      console.log('[WA] Not configured, skipping')
      return false
    }
    if (!phone) return false
    const normalized = phone.replace(/^0/, '62').replace(/[^0-9]/g, '')
    const res = await fetch(`https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: normalized, type: 'text', text: { preview_url: true, body: message } }),
    })
    return res.ok
  } catch (e) { console.error('[WA]', e); return false }
}

export async function sendTelegram(chatId: string, message: string): Promise<boolean> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) { console.log('[TG] Not configured'); return false }
    if (!chatId) return false
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    })
    return res.ok
  } catch (e) { console.error('[TG]', e); return false }
}

export function buildAlertMessage(p: { title: string; score: number; price?: number; location?: string; url?: string }): string {
  return `🔍 *Peluang Baru — Pantau.in*\n\n*${p.title}*${p.location ? '\n📍 ' + p.location : ''}${p.price ? '\n💰 Rp ' + p.price.toLocaleString('id-ID') : ''}\n\n🎯 Relevansi AI: *${p.score}%*${p.url ? '\n\n🔗 ' + p.url : ''}\n\n_Pantau.in — Internet Dipantau, Peluang Dikirim ke WA Kamu_`
}

export function buildAlertEmail(p: { userName: string; title: string; score: number; price?: number; location?: string; url?: string; category?: string; viaFallback?: boolean }): string {
  const fallbackNote = p.viaFallback
    ? `<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400E">⚠️ Notifikasi ini dikirim via Email karena WhatsApp gagal terkirim.</div>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#F0F4F9;padding:40px 0;margin:0"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#0D1B2A,#1560BD);padding:28px 32px"><div style="color:#fff;font-size:22px;font-weight:800">pantau<span style="color:#0F6E56">.in</span></div><div style="color:rgba(255,255,255,0.75);font-size:14px;margin-top:4px">Peluang Baru Ditemukan! 🎯</div></div><div style="padding:28px 32px">${fallbackNote}<p style="color:#5A7090">Hei <strong>${p.userName}</strong>,</p><div style="background:#F8FAFC;border:1px solid #DDE5EF;border-radius:12px;padding:20px;margin:16px 0">${p.category ? `<div style="font-size:11px;font-weight:700;background:#E8F0FB;color:#1560BD;padding:3px 10px;border-radius:100px;display:inline-block;margin-bottom:10px;text-transform:uppercase">${p.category}</div><br>` : ''}<h2 style="color:#0D1B2A;font-size:16px;margin:0 0 8px">${p.title}</h2>${p.location ? `<p style="color:#5A7090;margin:0 0 4px;font-size:14px">📍 ${p.location}</p>` : ''}${p.price ? `<p style="font-weight:700;margin:0 0 8px">💰 Rp ${p.price.toLocaleString('id-ID')}</p>` : ''}<span style="background:#E1F5EE;color:#0F6E56;padding:3px 10px;border-radius:100px;font-size:12px;font-weight:700">🎯 AI ${p.score}% relevan</span></div>${p.url ? `<a href="${p.url}" style="display:block;background:#1560BD;color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:700">Lihat Peluang →</a>` : ''}</div><div style="padding:16px 32px;border-top:1px solid #DDE5EF;text-align:center"><p style="font-size:12px;color:#9EB3C8;margin:0">© 2025 Pantau.in</p></div></div></body></html>`
}

/**
 * Dispatch satu notifikasi dengan fallback WhatsApp → Email (spec section 2).
 *
 * Alur:
 * 1. Coba channel utama sesuai notifChannels[0] / notifPreference user.
 * 2. Jika gagal (timeout/API error/nomor invalid) → buat entry fallback ke Email,
 *    fallbackFromId menunjuk ke notification yang gagal.
 * 3. Maksimal 1x fallback per notifikasi (tidak retry berulang ke channel sama).
 */
export async function dispatchWithFallback(notification: {
  id: string
  userId: string
  title: string
  body: string
  sourceUrl: string | null
  matchScore: number
  channel: string
  attemptNumber: number
  watch?: { category: string } | null
}) {
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { name: true, email: true, whatsapp: true, telegramId: true, notifEnabled: true, quietStart: true, quietEnd: true },
  })
  if (!user || !user.notifEnabled) {
    await prisma.notification.update({ where: { id: notification.id }, data: { status: 'SKIPPED' } })
    return { sent: false, channel: notification.channel }
  }
  // Cek quiet hours
  if (user.quietStart && user.quietEnd) {
    const now = new Date()
    const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const hhmm = wib.getHours() * 60 + wib.getMinutes()
    const [sh, sm] = (user.quietStart as string).split(':').map(Number)
    const [eh, em] = (user.quietEnd as string).split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    const isQuiet = start > end ? (hhmm >= start || hhmm < end) : (hhmm >= start && hhmm < end)
    if (isQuiet) {
      await prisma.notification.update({ where: { id: notification.id }, data: { status: 'SKIPPED' } })
      return { sent: false, channel: notification.channel }
    }
  }

  let success = false

  if (notification.channel === 'EMAIL') {
    const html = buildAlertEmail({
      userName: user.name, title: notification.title,
      score: Math.round(notification.matchScore * 100),
      url: notification.sourceUrl ?? undefined,
      category: notification.watch?.category,
    })
    success = await sendEmail(user.email, '🔍 Peluang Baru — ' + notification.title, html)
  } else if (notification.channel === 'WHATSAPP') {
    const waNumber = user.whatsapp ? decryptPII(user.whatsapp) : ''
    if (waNumber) {
      const msg = buildAlertMessage({ title: notification.title, score: Math.round(notification.matchScore * 100), url: notification.sourceUrl ?? undefined })
      success = await sendWhatsApp(waNumber, msg)
    }
  } else if (notification.channel === 'TELEGRAM') {
    if (user.telegramId) {
      const msg = buildAlertMessage({ title: notification.title, score: Math.round(notification.matchScore * 100), url: notification.sourceUrl ?? undefined })
      success = await sendTelegram(decryptPII(user.telegramId), msg)
    }
  }

  if (success) {
    await prisma.notification.update({ where: { id: notification.id }, data: { status: 'SENT' } })
    return { sent: true, channel: notification.channel }
  }

  // Gagal — cek apakah ini eligible untuk fallback ke Email
  const isFallbackEligible = notification.channel === 'WHATSAPP' && notification.attemptNumber === 1
  await prisma.notification.update({
    where: { id: notification.id },
    data: { status: 'FAILED', failedReason: `Gagal kirim via ${notification.channel}` },
  })

  if (isFallbackEligible) {
    const html = buildAlertEmail({
      userName: user.name, title: notification.title,
      score: Math.round(notification.matchScore * 100),
      url: notification.sourceUrl ?? undefined,
      category: notification.watch?.category,
      viaFallback: true,
    })
    const fallbackOk = await sendEmail(user.email, '🔍 Peluang Baru — ' + notification.title, html)
    await prisma.notification.create({
      data: {
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        sourceUrl: notification.sourceUrl,
        channel: 'EMAIL',
        status: fallbackOk ? 'SENT' : 'FAILED',
        matchScore: notification.matchScore,
        attemptNumber: 2,
        fallbackFromId: notification.id,
        failedReason: fallbackOk ? null : 'Fallback email juga gagal',
      },
    })
    return { sent: fallbackOk, channel: 'EMAIL', viaFallback: true }
  }

  return { sent: false, channel: notification.channel }
}

/**
 * Agregasi harian: jika gagal rate WhatsApp > 15% dalam 1 hari, kemungkinan
 * nomor WA bisnis kena rate-limit/block oleh provider. Dipanggil dari cron harian,
 * hasil dipakai untuk alert admin (lihat /api/admin/stats).
 */
export async function getWhatsAppFailureRate(): Promise<{ rate: number; shouldAlert: boolean; total: number; failed: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [total, failed] = await Promise.all([
    prisma.notification.count({ where: { channel: 'WHATSAPP', sentAt: { gte: since } } }),
    prisma.notification.count({ where: { channel: 'WHATSAPP', status: 'FAILED', sentAt: { gte: since } } }),
  ])
  const rate = total > 0 ? Math.round((failed / total) * 1000) / 10 : 0
  return { rate, shouldAlert: rate > 15 && total >= 5, total, failed }
}
