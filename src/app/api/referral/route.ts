import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
export const dynamic = 'force-dynamic'

function getReferralConfig() {
  try {
    const p = join(process.cwd(), 'data', 'site-config.json')
    if (existsSync(p)) {
      const cfg = JSON.parse(readFileSync(p, 'utf-8'))
      return {
        enabled: cfg.referral_enabled ?? true,
        referrerDays: cfg.referral_reward_referrer_days ?? 7,
        refereeDays: cfg.referral_reward_referee_days ?? 7,
        upgradeDays: cfg.referral_reward_on_upgrade_days ?? 30,
        discountPro: cfg.referral_discount_pro ?? 10,
        discountBiz: cfg.referral_discount_biz ?? 15,
      }
    }
  } catch {}
  return { enabled: true, referrerDays: 7, refereeDays: 7, upgradeDays: 30, discountPro: 10, discountBiz: 15 }
}

export async function GET() {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id

  const p = prisma as any
  let user = await p.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, referralCode: true, referralCount: true, plan: true, planExpiresAt: true }
  })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  // Generate referral code jika belum ada
  if (!user.referralCode) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    user = await p.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { id: true, name: true, referralCode: true, referralCount: true, plan: true, planExpiresAt: true }
    })
  }

  // Hitung referral stats
  const referrals = await p.user.findMany({
    where: { referredBy: user.referralCode ?? '' },
    select: { name: true, createdAt: true, plan: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const config = getReferralConfig()
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://pantau.in'

  return NextResponse.json({
    referralCode: user.referralCode,
    referralLink: `${baseUrl}/register?ref=${user.referralCode}`,
    referralCount: user.referralCount ?? 0,
    referrals: referrals.map((r: any) => ({
      name: (r.name?.split(' ')[0] ?? '?') + '***',
      joinedAt: r.createdAt,
      plan: r.plan,
    })),
    config,
  })
}
