import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit'
import { watchQuerySchema, validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

async function auth() { const s = await getServerSession(authOptions); return s?.user ? s : null }

export async function GET() {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const watches = await prisma.watchQuery.findMany({ where: { userId: (s.user as any).id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(watches)
}

export async function POST(req: NextRequest) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit({ key: `watch-create:${userId}`, ...RATE_LIMITS.WATCH_CREATE })
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const isPro = user.plan !== 'FREE'
  if (!isPro) {
    const c = await prisma.watchQuery.count({ where: { userId } })
    if (c >= 3) return NextResponse.json({ error: 'Batas 3 watch queries plan Gratis. Upgrade ke Pro!' }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }

  const parsed = validateBody(watchQuerySchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { name, category, queryText, mustInclude, exclude, filters, frequency } = parsed.data

  const mergedFilters = {
    ...(filters ?? {}),
    ...(mustInclude ? { mustInclude } : {}),
    ...(exclude ? { exclude } : {}),
  }

  const watch = await prisma.watchQuery.create({
    data: {
      userId, name, category, queryText,
      filters: mergedFilters,
      channels: { set: isPro ? ['EMAIL', 'WHATSAPP', 'TELEGRAM'] : ['EMAIL'] },
      frequency: isPro ? (frequency ?? 'REALTIME') : 'DAILY',
    },
  })
  // Trigger matching langsung setelah watch dibuat (tanpa nunggu cron)
  try {
    fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3001'}/api/cron/run-matching`, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
    }).catch(() => {})
  } catch {}
  return NextResponse.json(watch, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const { id, isActive, name } = body
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
  const userId = (s.user as any).id
  const watch = await prisma.watchQuery.findFirst({ where: { id, userId } })
  if (!watch) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  const { queryText, frequency, filters } = body
  const updateData: any = {}
  if (typeof isActive === 'boolean') updateData.isActive = isActive
  if (name) updateData.name = String(name).trim().slice(0, 100)
  if (queryText) updateData.queryText = String(queryText).trim().slice(0, 500)
  if (frequency && ['REALTIME','HOURLY','DAILY'].includes(frequency)) updateData.frequency = frequency
  if (filters && typeof filters === 'object') {
    const safe: any = {}
    if (filters.location) safe.location = String(filters.location).slice(0, 100)
    if (filters.priceMin) safe.priceMin = Number(filters.priceMin)
    if (filters.priceMax) safe.priceMax = Number(filters.priceMax)
    if (filters.mustInclude) safe.mustInclude = String(filters.mustInclude).slice(0, 200)
    if (filters.exclude) safe.exclude = String(filters.exclude).slice(0, 200)
    updateData.filters = safe
  }
  const updated = await prisma.watchQuery.update({
    where: { id },
    data: updateData,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const { id } = body; if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
  const r = await prisma.watchQuery.deleteMany({ where: { id, userId: (s.user as any).id } })
  if (r.count === 0) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ success: true })
}
