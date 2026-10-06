import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/notifier'
import { getDripEmail } from '@/lib/drip-emails'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const now = new Date()
  const results = { sent: 0, skipped: 0, errors: 0 }
  const freeUsers = await prisma.user.findMany({
    where: { plan: 'FREE' },
    select: { id: true, email: true, name: true, createdAt: true }
  })
  for (const user of freeUsers) {
    const days = Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / 86400000)
    const sent = await prisma.auditLog.findMany({ where: { userId: user.id, action: { startsWith: 'DRIP_EMAIL_' } }, select: { action: true } })
    const sentSet = new Set(sent.map((l: any) => l.action))
    const SCHEDULE = [
      { day: 1, key: 'DRIP_EMAIL_DAY1' },
      { day: 3, key: 'DRIP_EMAIL_DAY3' },
      { day: 7, key: 'DRIP_EMAIL_DAY7' },
      { day: 14, key: 'DRIP_EMAIL_DAY14' },
      { day: 30, key: 'DRIP_EMAIL_DAY30' },
      { day: 45, key: 'DRIP_EMAIL_DAY45' },
      { day: 60, key: 'DRIP_EMAIL_DAY60' },
    ]
    for (const drip of SCHEDULE) {
      const alreadySent = sentSet.has(drip.key)
      const notYet = days >= drip.day && !alreadySent
      if (notYet) {
        const watchCount = await prisma.watchQuery.count({ where: { userId: user.id, isActive: true } })
        const hasWatch = watchCount > 0
        const mail = getDripEmail(drip.key, { name: user.name || 'Kamu', email: user.email ?? '', hasWatch, daysSinceRegister: days })
        if (!mail.subject) { results.skipped++; break }
        try {
          // Buat AuditLog dulu (sebelum kirim) supaya ID-nya bisa disisip
          // sebagai tracking pixel ke dalam HTML email itu sendiri.
          const log = await prisma.auditLog.create({ data: { userId: user.id, userEmail: user.email ?? "", action: drip.key } })
          const trackingPixel = `<img src="${process.env.NEXTAUTH_URL ?? 'https://pantau.in'}/api/track/email-open/${log.id}" width="1" height="1" style="display:none" alt="" />`
          const htmlWithTracking = mail.html.replace('</body></html>', trackingPixel + '</body></html>')
          const ok = await sendEmail(user.email ?? '', mail.subject, htmlWithTracking)
          if (ok) {
            results.sent++
          } else {
            await prisma.auditLog.delete({ where: { id: log.id } }).catch(() => {})
            results.errors++
          }
        } catch { results.errors++ }
        break
      }
    }
  }
  return NextResponse.json({ success: true, ...results, totalFreeUsers: freeUsers.length })
}
