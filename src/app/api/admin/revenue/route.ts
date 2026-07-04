import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

// Real revenue data for Super Admin — replaces the template's hardcoded
// demo numbers (fake "Rp 48,2M", fake "Siti R." transactions, etc.) with
// actual figures computed from the Transaction table, so policy/pricing
// decisions are based on what's really happening.
export async function GET() {
  const s = await getServerSession(authOptions)
  if (!['ADMIN', 'SUPER_ADMIN'].includes((s?.user as any)?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [totalRevenueAgg, mrrAgg, successTx, planCounts, recentTx] = await Promise.all([
    prisma.transaction.aggregate({ where: { status: 'SUCCESS' }, _sum: { total: true } }),
    prisma.transaction.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: startOfMonth } }, _sum: { total: true } }),
    prisma.transaction.findMany({ where: { status: 'SUCCESS', paidAt: { gte: twelveMonthsAgo } }, select: { total: true, paidAt: true } }),
    prisma.user.groupBy({ by: ['plan'], _count: { plan: true } }),
    prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { name: true } } } }),
  ])

  // Bucket successful transactions into the last 12 calendar months
  const monthly: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthly[`${d.getFullYear()}-${d.getMonth()}`] = 0
  }
  for (const tx of successTx) {
    if (!tx.paidAt) continue
    const key = `${tx.paidAt.getFullYear()}-${tx.paidAt.getMonth()}`
    if (key in monthly) monthly[key] += tx.total
  }

  const totalUsers = planCounts.reduce((a, p) => a + p._count.plan, 0) || 1
  const planDistribution = planCounts.map(p => ({ plan: p.plan, count: p._count.plan, pct: Math.round((p._count.plan / totalUsers) * 1000) / 10 }))

  return NextResponse.json({
    totalRevenue: totalRevenueAgg._sum.total ?? 0,
    mrr: mrrAgg._sum.total ?? 0,
    monthlyTrend: Object.values(monthly),
    planDistribution,
    recentTransactions: recentTx.map(t => ({ name: t.user?.name ?? '—', plan: `${t.plan}${t.billing === 'YEARLY' ? ' Tahunan' : ''}`, amount: t.total, status: t.status })),
  })
}
