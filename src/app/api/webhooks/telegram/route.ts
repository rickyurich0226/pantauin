import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

async function sendMsg(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

export async function POST(req: NextRequest) {
  const whSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (whSecret && req.headers.get('x-telegram-bot-api-secret-token') !== whSecret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  try {
    const body = await req.json()
    const msg = body.message
    if (!msg?.text || !msg.chat?.id) return NextResponse.json({ ok: true })
    const chatId = String(msg.chat.id)
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return NextResponse.json({ ok: true })
    const text: string = msg.text.trim()

    // /start - kirim chat ID
    if (text.startsWith('/start')) {
      await sendMsg(token, chatId, `✅ Chat ID kamu: *${chatId}*\n\nCopy dan paste ke Pantau.in → Pengaturan → Telegram Chat ID\n\n_Pantau.in — Internet Dipantau, Peluang Dikirim ke WA Kamu_`)
      return NextResponse.json({ ok: true })
    }

    // Cari user berdasarkan telegramId untuk command lain
    const user = await prisma.user.findFirst({ where: { telegramId: chatId } })
    if (!user) {
      if (text.startsWith('/status') || text.startsWith('/pantauan') || text.startsWith('/cari')) {
        await sendMsg(token, chatId, `⚠️ Chat ID kamu belum terhubung ke akun Pantau.in.\n\nKetik /start dulu untuk dapat Chat ID, lalu masukkan ke Pengaturan → Telegram Chat ID di dashboard.`)
      }
      return NextResponse.json({ ok: true })
    }

    // /status - ringkasan akun
    if (text.startsWith('/status')) {
      const [activeWatches, unreadCount] = await Promise.all([
        prisma.watchQuery.count({ where: { userId: user.id, isActive: true } }),
        prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      ])
      const planLabel = user.plan === 'FREE' ? 'FREE' : `PRO${user.planExpiresAt ? ' (aktif s/d ' + new Date(user.planExpiresAt).toLocaleDateString('id-ID') + ')' : ''}`
      await sendMsg(token, chatId, `📊 *Status Akun Pantau.in*\n\n👤 Plan: ${planLabel}\n🔍 Pantauan aktif: ${activeWatches}\n🔔 Notifikasi belum dibaca: ${unreadCount}\n\nKetik /pantauan untuk lihat daftar pantauan.`)
      return NextResponse.json({ ok: true })
    }

    // /pantauan - list watch query aktif
    if (text.startsWith('/pantauan')) {
      const watches = await prisma.watchQuery.findMany({
        where: { userId: user.id, isActive: true },
        select: { name: true, category: true, queryText: true, _count: { select: { notifications: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      if (watches.length === 0) {
        await sendMsg(token, chatId, `📭 Kamu belum punya pantauan aktif.\n\nBuat di dashboard Pantau.in → Pantauan → Buat Baru.`)
      } else {
        const list = watches.map((w, i) => `${i + 1}. *${w.name}* (${w.category})\n   "${w.queryText}" — ${w._count.notifications} notif`).join('\n\n')
        await sendMsg(token, chatId, `🔍 *Pantauan Aktif Kamu (${watches.length})*\n\n${list}`)
      }
      return NextResponse.json({ ok: true })
    }

    // /cari [keyword] - quick search listing terbaru
    if (text.startsWith('/cari')) {
      const keyword = text.replace('/cari', '').trim()
      if (!keyword) {
        await sendMsg(token, chatId, `⚠️ Format: /cari [keyword]\n\nContoh: /cari rumah dijual jakarta`)
        return NextResponse.json({ ok: true })
      }
      const words = keyword.split(/\s+/).filter(w => w.length > 0)
      const items = await prisma.listingItem.findMany({
        where: { AND: words.map(w => ({ title: { contains: w, mode: 'insensitive' as const } })) },
        select: { title: true, url: true, location: true, publishedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      if (items.length === 0) {
        await sendMsg(token, chatId, `😕 Tidak ada hasil untuk "${keyword}".\n\nCoba kata kunci lain atau buat pantauan otomatis di dashboard.`)
      } else {
        const list = items.map((it, i) => `${i + 1}. ${it.title}${it.location ? ' — ' + it.location : ''}${it.url ? '\n   ' + it.url : ''}`).join('\n\n')
        await sendMsg(token, chatId, `🔎 *Hasil untuk "${keyword}"*\n\n${list}\n\n_Buat pantauan otomatis biar dapat update real-time._`)
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false })
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get('hub.verify_token')
  return token === process.env.TELEGRAM_BOT_TOKEN ? new Response(url.searchParams.get('hub.challenge') || 'ok') : NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
