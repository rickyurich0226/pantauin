import { createHmac, timingSafeEqual } from 'crypto'

export function unsubToken(userId: string): string {
  return createHmac('sha256', process.env.NEXTAUTH_SECRET || 'pantau').update('unsub:' + userId).digest('hex').slice(0, 32)
}
export function unsubUrl(userId: string): string {
  return 'https://pantau.in/api/track/unsubscribe?u=' + encodeURIComponent(userId) + '&t=' + unsubToken(userId)
}
export function verifyUnsub(u: string | null, t: string | null): boolean {
  if (!u || !t) return false
  const a = Buffer.from(unsubToken(u)); const b = Buffer.from(String(t))
  return a.length === b.length && timingSafeEqual(a, b)
}

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function host(url: string | null): string {
  if (!url) return ''
  try { const h = new URL(url).hostname.replace(/^www\./, ''); return h === 'news.google.com' ? 'Google News' : h } catch { return '' }
}
function relTime(d: Date | null): string {
  if (!d) return ''
  const h = (Date.now() - new Date(d).getTime()) / 3600000
  if (h < 1) return 'baru saja'
  if (h < 24) return 'terbit ' + Math.floor(h) + ' jam lalu'
  if (h < 48) return 'terbit kemarin'
  return 'terbit ' + Math.floor(h / 24) + ' hari lalu'
}

export type DigestItem = { id: string; title: string; url: string | null; score: number; watchName: string; category: string; publishedAt: Date | null }

export function buildDigestEmail(p: { userName: string; userId: string; items: DigestItem[]; total: number; isFree: boolean }): string {
  const groups: { name: string; category: string; items: DigestItem[] }[] = []
  for (const it of p.items) {
    let g = groups.find(x => x.name === it.watchName)
    if (!g) { g = { name: it.watchName, category: it.category, items: [] }; groups.push(g) }
    g.items.push(it)
  }
  const when = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const rest = p.total - p.items.length
  const first = esc((p.userName || '').split(' ')[0] || 'Kak')
  const chip = (c: string) => {
    const orange = ['TENDER', 'KONSTRUKSI'].indexOf(c) >= 0
    return '<span style="padding:3px 10px;border-radius:100px;background:' + (orange ? '#FDF1E3' : '#E6F0FB') + ';color:' + (orange ? '#9A4B0B' : '#1560BD') + ';font-size:11px;font-weight:800;letter-spacing:.4px">' + esc(c) + '</span>'
  }
  const itemHtml = (it: DigestItem, last: boolean) => {
    const strong = it.score >= 0.6
    const meta = [host(it.url), relTime(it.publishedAt)].filter(Boolean).join(' &middot; ')
    return '<tr><td style="padding:14px 0;' + (last ? '' : 'border-bottom:1px solid #E4EAF2;') + '">'
      + '<a href="' + esc(it.url || 'https://pantau.in/dashboard/notifications') + '" style="font-size:15px;font-weight:700;line-height:1.4;color:#0F2A4A;text-decoration:none">' + esc(it.title) + '</a>'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px"><tr><td style="font-size:13px;color:#4B5E7A">' + meta + '</td>'
      + '<td align="right"><span style="padding:2px 8px;border-radius:6px;background:' + (strong ? '#E3F3EE' : '#EEF2F7') + ';color:' + (strong ? '#0B6B5F' : '#3B4D68') + ';font-size:12px;font-weight:700;white-space:nowrap">' + (strong ? 'Sangat relevan' : 'Relevan') + '</span></td></tr></table>'
      + '</td></tr>'
  }
  const groupHtml = groups.map(g =>
    '<tr><td style="padding:20px 32px 4px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-bottom:8px;border-bottom:2px solid #0F2A4A">'
    + chip(g.category) + ' <strong style="font-size:16px;color:#0F2A4A;margin-left:6px">' + esc(g.name) + '</strong></td>'
    + '<td align="right" style="padding-bottom:8px;border-bottom:2px solid #0F2A4A;font-size:13px;color:#4B5E7A">' + g.items.length + ' peluang</td></tr>'
    + g.items.map((it, i) => itemHtml(it, i === g.items.length - 1)).join('')
    + '</table></td></tr>'
  ).join('')
  const pixels = p.items.map(it => '<img src="https://pantau.in/api/track/open/' + esc(it.id) + '" width="1" height="1" style="display:none" alt="">').join('')
  const upsell = p.isFree
    ? '<tr><td style="padding:0 32px 28px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;border:1px solid #DCE4F0;border-radius:12px"><tr><td style="padding:18px 20px"><strong style="font-size:14px;color:#0F2A4A">Mau lebih cepat dari pesaing?</strong><br><span style="font-size:13px;line-height:1.5;color:#3B4D68">Paket Pro mengirim peluang langsung ke WhatsApp begitu ditemukan.</span></td><td align="right" style="padding:18px 20px"><a href="https://pantau.in/dashboard/upgrade" style="font-size:14px;font-weight:700;color:#1560BD;white-space:nowrap">Lihat paket Pro</a></td></tr></table></td></tr>'
    : ''
  return '<!DOCTYPE html><html><body style="margin:0;padding:32px 0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;color:#0F2A4A">'
    + '<span style="display:none;max-height:0;overflow:hidden">' + esc(p.items.slice(0, 2).map(i => i.title).join(' · ')) + '</span>'
    + '<table width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #DCE4F0">'
    + '<tr><td style="padding:28px 32px;background:#0F2A4A"><div style="font-size:24px;font-weight:800;color:#FFFFFF">pantau<span style="color:#5EEAD4">.in</span></div><div style="font-size:14px;color:#C7D2E3;margin-top:6px">Ringkasan peluang &middot; ' + esc(when) + ' WIB</div></td></tr>'
    + '<tr><td style="padding:28px 32px 8px"><div style="font-size:18px;font-weight:700">Hai ' + first + ',</div><div style="font-size:15px;line-height:1.6;color:#3B4D68;margin-top:6px">Ada <strong style="color:#0F2A4A">' + p.total + ' peluang baru</strong> yang cocok dengan pantauanmu sejak ringkasan terakhir.</div></td></tr>'
    + groupHtml
    + '<tr><td style="padding:16px 32px 28px;text-align:center">' + (rest > 0 ? '<div style="font-size:14px;color:#4B5E7A;margin-bottom:10px">+' + rest + ' peluang lainnya menunggu di dashboard</div>' : '')
    + '<a href="https://pantau.in/dashboard/notifications" style="display:block;padding:14px;border-radius:10px;background:#1560BD;color:#FFFFFF;text-align:center;font-size:15px;font-weight:700;text-decoration:none">Lihat semua peluang</a></td></tr>'
    + upsell
    + '<tr><td style="padding:20px 32px 28px;border-top:1px solid #E4EAF2;text-align:center;font-size:13px;line-height:1.6;color:#4B5E7A">Kamu menerima ringkasan ini 3 kali sehari (07.00, 12.00, 17.00 WIB).<br>'
    + '<a href="https://pantau.in/dashboard/settings" style="color:#1560BD">Atur notifikasi</a> &nbsp;&middot;&nbsp; <a href="' + unsubUrl(p.userId) + '" style="color:#1560BD">Berhenti berlangganan</a><br><span style="font-size:12px">&copy; 2026 Pantau.in</span></td></tr>'
    + '</table>' + pixels + '</body></html>'
}
