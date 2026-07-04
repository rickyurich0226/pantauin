import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit'
import { createMidtransTransaction, PLAN_PRICES, TAX_RATE } from '@/lib/midtrans'
export const dynamic = 'force-dynamic'

async function auth() { const s = await getServerSession(authOptions); return s?.user ? s : null }

export async function POST(req: NextRequest) {
  const s = await auth()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id

  const rl = rateLimit({ key: `payment:${userId}`, limit: 5, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak request' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }

  const { plan, billing } = body
  if (!plan || !['PRO','BUSINESS'].includes(plan)) return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
  if (!billing || !['MONTHLY','YEARLY'].includes(billing)) return NextResponse.json({ error: 'Billing tidak valid' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const prices = PLAN_PRICES[plan]
  if (!prices) return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 400 })

  const amount = billing === 'YEARLY' ? prices.yearly : prices.monthly
  const tax = Math.round(amount * TAX_RATE)
  const total = amount + tax
  const orderId = `PANTAUIN-${plan}-${billing}-${userId.slice(-6)}-${Date.now()}`
  const itemName = `Pantau.in ${plan === 'PRO' ? 'Pro' : 'Business'} (${billing === 'YEARLY' ? 'Tahunan' : 'Bulanan'})`

  try {
    const mt = await createMidtransTransaction({
      orderId,
      amount,
      customerName: user.name ?? 'User',
      customerEmail: user.email ?? '',
      itemName,
    })

    // Simpan ke Transaction model
    await prisma.transaction.create({
      data: {
        userId,
        orderId,
        plan: plan as any,
        billing,
        amount,
        tax,
        total: mt.total,
        status: 'PENDING',
        snapToken: mt.token,
      }
    })

    return NextResponse.json({ token: mt.token, orderId })
  } catch (err: any) {
    console.error('[Payment] Error:', err)
    return NextResponse.json({ error: 'Gagal membuat transaksi. Coba lagi.' }, { status: 500 })
  }
}
