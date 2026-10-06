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

export async function sendEmail(to: string, subject: string, html: string, headers?: Record<string, string>, allowSmtpFallback = false): Promise<boolean> {
  // Coba Resend API dulu (lebih reliable, tidak ada daily limit ketat)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pantau.in <noreply@pantau.in>',
          to,
          subject,
          html,
          ...(headers ? { headers } : {}),
        }),
      })
      if (res.ok) return true
      const err = await res.json()
      console.error('[Resend]', err)
    } catch (e) { console.error('[Resend]', e) }
  }
  // Cadangan Gmail SMTP gagal verifikasi SPF/DKIM untuk @pantau.in dan merusak reputasi domain.
  // Hanya dipakai untuk email kritis (reset password) lewat sendEmailCritical.
  if (!allowSmtpFallback) return false
  // Fallback ke SMTP Gmail
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

export async function sendWhatsApp(phone: string, message: string, _templateParams?: { title: string; url?: string }): Promise<boolean> {
  try {
    const apiKey = process.env.HABISIN_API_KEY
    const sender = process.env.HABISIN_SENDER
    if (!apiKey || !sender) {
      console.log('[WA] Not configured, skipping')
      return false
    }
    if (!phone) return false
    const digits = phone.replace(/[^0-9]/g, '')
    const target = digits.startsWith('62') ? digits
      : digits.startsWith('0') ? '62' + digits.slice(1)
      : digits.startsWith('8') ? '62' + digits
      : digits
    if (target.length < 10) return false

    const endpoint = process.env.HABISIN_ENDPOINT || 'https://habis.in/send-message'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, sender, number: target, message, footer: 'pantau.in' }),
    })
    const text = await res.text().catch(() => '')
    let ok = false
    try { ok = res.ok && JSON.parse(text)?.status === true } catch { ok = false }
    if (!ok) console.error('[WA] HABISIN error:', res.status, text.slice(0, 300))
    return ok
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

function feedbackSig(id: string, value: string): string {
  const crypto = require('crypto')
  const secret = process.env.NEXTAUTH_SECRET || ''
  return crypto.createHmac('sha256', secret).update(id + ':' + value).digest('hex').slice(0, 16)
}

function feedbackLink(id: string, value: 'RELEVANT' | 'NOT_RELEVANT'): string {
  return `https://pantau.in/api/n/${id}/fb?v=${value}&sig=${feedbackSig(id, value)}`
}

export function buildAlertMessage(p: { title: string; score: number; price?: number; location?: string; url?: string; notificationId?: string }): string {
  const fb = p.notificationId
    ? `\n\nRelevan? ✅ ${feedbackLink(p.notificationId, 'RELEVANT')}\n❌ ${feedbackLink(p.notificationId, 'NOT_RELEVANT')}`
    : ''
  return `🔍 *Peluang Baru — Pantau.in*\n\n*${p.title}*${p.location ? '\n📍 ' + p.location : ''}${p.price ? '\n💰 Rp ' + p.price.toLocaleString('id-ID') : ''}\n\n🎯 Relevansi AI: *${p.score}%*${p.url ? '\n\n🔗 ' + p.url : ''}${fb}\n\n_Pantau.in — Internet Dipantau, Peluang Dikirim ke WA Kamu_`
}

// Deteksi urgency dari judul artikel
function getUrgencyTag(title: string): { label: string; color: string; bg: string } | null {
  const t = title.toLowerCase()
  const urgent = ['terakhir','deadline','hari ini','besok','segera','terbatas','batas akhir','closing','last day','urgent']
  const hot = ['baru dibuka','baru saja','baru rilis','fresh','terbaru','just opened','new']
  if (urgent.some(w => t.includes(w))) return { label: '🔴 Segera Bertindak', color: '#DC2626', bg: '#FEF2F2' }
  if (hot.some(w => t.includes(w))) return { label: '🟡 Baru Dibuka', color: '#D97706', bg: '#FEF3C7' }
  return null
}

// Convert score 0-1 ke label relevansi
function getRelevanceLabel(score: number): { label: string; stars: string; color: string } {
  if (score >= 0.7) return { label: 'Sangat Relevan', stars: '★★★★★', color: '#0F6E56' }
  if (score >= 0.5) return { label: 'Relevan', stars: '★★★★☆', color: '#1560BD' }
  if (score >= 0.3) return { label: 'Cukup Relevan', stars: '★★★☆☆', color: '#5A7090' }
  if (score >= 0.15) return { label: 'Mungkin Relevan', stars: '★★☆☆☆', color: '#9EB3C8' }
  return { label: 'Info', stars: '★☆☆☆☆', color: '#9EB3C8' }
}

export function buildAlertEmail(p: { userName: string; title: string; score: number; price?: number; location?: string; url?: string; category?: string; viaFallback?: boolean; notificationId?: string }): string {
  const urgency = getUrgencyTag(p.title)
  const relevance = getRelevanceLabel(p.score)
  const fallbackNote = p.viaFallback
    ? `<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400E">⚠️ Notifikasi ini dikirim via Email karena WhatsApp gagal terkirim.</div>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#F0F4F9;padding:40px 0;margin:0"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#0D1B2A,#1560BD);padding:28px 32px"><div style="color:#fff;font-size:22px;font-weight:800">pantau<span style="color:#0F6E56">.in</span></div><div style="color:rgba(255,255,255,0.75);font-size:14px;margin-top:4px">Peluang Baru Ditemukan! 🎯</div></div><div style="padding:28px 32px">${fallbackNote}<p style="color:#5A7090">Hei <strong>${p.userName}</strong>,</p><div style="background:#F8FAFC;border:1px solid #DDE5EF;border-radius:12px;padding:20px;margin:16px 0">${p.category ? `<div style="font-size:11px;font-weight:700;background:#E8F0FB;color:#1560BD;padding:3px 10px;border-radius:100px;display:inline-block;margin-bottom:10px;text-transform:uppercase">${p.category}</div><br>` : ''}<h2 style="color:#0D1B2A;font-size:16px;margin:0 0 8px">${p.title}</h2>${p.location ? `<p style="color:#5A7090;margin:0 0 4px;font-size:14px">📍 ${p.location}</p>` : ''}${p.price ? `<p style="font-weight:700;margin:0 0 8px">💰 Rp ${p.price.toLocaleString('id-ID')}</p>` : ''}${urgency ? `<span style="background:${urgency.bg};color:${urgency.color};padding:3px 10px;border-radius:100px;font-size:12px;font-weight:700;margin-right:6px">${urgency.label}</span>` : ""}<span style="background:#E1F5EE;color:${relevance.color};padding:3px 10px;border-radius:100px;font-size:12px;font-weight:700">${relevance.stars} ${relevance.label}</span></div>${p.url ? `<a href="${p.url}" style="display:block;background:#1560BD;color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:700">Lihat Peluang →</a>` : ''}${p.notificationId ? `<div style="margin-top:14px;text-align:center;font-size:12px;color:#9EB3C8">Notifikasi ini relevan?<br><a href="${feedbackLink(p.notificationId, 'RELEVANT')}" style="display:inline-block;margin-top:6px;margin-right:8px;color:#0F6E56;text-decoration:none;font-weight:700;border:1px solid #0F6E56;border-radius:100px;padding:5px 14px;font-size:12px">👍 Relevan</a><a href="${feedbackLink(p.notificationId, 'NOT_RELEVANT')}" style="display:inline-block;margin-top:6px;color:#DC2626;text-decoration:none;font-weight:700;border:1px solid #DC2626;border-radius:100px;padding:5px 14px;font-size:12px">👎 Tidak Relevan</a></div>` : ''}</div><div style="padding:16px 32px;border-top:1px solid #DDE5EF;text-align:center"><p style="font-size:12px;color:#9EB3C8;margin:0">© 2026 Pantau.in</p></div></div>${p.notificationId ? `<img src="https://pantau.in/api/track/open/${p.notificationId}" width="1" height="1" style="display:none" alt="" />` : ''}</body></html>`
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
  watchChannels?: string[]
}) {
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { name: true, email: true, whatsapp: true, phone: true, telegramId: true, notifEnabled: true, quietStart: true, quietEnd: true },
  })
  if (!user || !user.notifEnabled) {
    await prisma.notification.update({ where: { id: notification.id }, data: { status: 'SKIPPED', failedReason: 'User nonaktif / notifikasi dimatikan' } })
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
      // Quiet hours: TUNDA (tetap QUEUED), dikirim setelah jam tenang selesai
      await prisma.notification.update({ where: { id: notification.id }, data: { failedReason: 'Ditunda: quiet hours' } })
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
      notificationId: notification.id,
    })
    success = await sendEmail(user.email, '🔍 Peluang Baru — ' + notification.title, html)
  } else if (notification.channel === 'WHATSAPP') {
    const waNumber = (user.whatsapp || user.phone) ? decryptPII((user.whatsapp || user.phone) as string) : ''
    if (waNumber) {
      const msg = buildAlertMessage({ title: notification.title, score: Math.round(notification.matchScore * 100), url: notification.sourceUrl ?? undefined, notificationId: notification.id })
      success = await sendWhatsApp(waNumber, msg, { title: notification.title, url: notification.sourceUrl ?? undefined })
    }
  } else if (notification.channel === 'TELEGRAM') {
    if (user.telegramId) {
      const msg = buildAlertMessage({ title: notification.title, score: Math.round(notification.matchScore * 100), url: notification.sourceUrl ?? undefined, notificationId: notification.id })
      success = await sendTelegram(decryptPII(user.telegramId), msg)
    }
  }

  if (success) {
    await prisma.notification.update({ where: { id: notification.id }, data: { status: 'SENT' } })
    return { sent: true, channel: notification.channel }
  }

  // Gagal — cek apakah ini eligible untuk fallback ke Email.
  // PENTING: kalau user SUDAH pilih EMAIL sebagai salah satu channel watch ini,
  // mereka sudah dapat notifikasi EMAIL dari row terpisah (lihat matching.ts multi-
  // channel loop) — jangan bikin fallback email KEDUA, itu jadi duplikat.
  const emailAlreadyExplicit = notification.watchChannels?.includes('EMAIL') ?? false
  const isFallbackEligible = notification.channel === 'WHATSAPP' && notification.attemptNumber === 1 && !emailAlreadyExplicit
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

// Email kritis (reset password): boleh memakai cadangan SMTP bila Resend gagal
export async function sendEmailCritical(to: string, subject: string, html: string): Promise<boolean> {
  return sendEmail(to, subject, html, undefined, true)
}
