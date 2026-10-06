// Laporan event penting ke Telegram superadmin (user baru, perubahan status).
// Pakai TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (chat superadmin, default 901470999).
export async function notifySuperadmin(text: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID || '901470999'
    if (!token) { console.warn('[SuperadminNotify] TELEGRAM_BOT_TOKEN belum diset'); return }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!res.ok) console.error('[SuperadminNotify] gagal:', res.status, await res.text().catch(() => ''))
  } catch (err) {
    console.error('[SuperadminNotify] error:', err)
  }
}

export function waktuWIB(d: Date = new Date()): string {
  return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'
}
