import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const s = await getServerSession(authOptions)
  return (s?.user as any)?.role === 'SUPER_ADMIN' ? s : null
}

// Super Admin controls exactly which RSS/JSON-API sources Pantau.in monitors
// per category — this is the real "kebijakan" control panel for what gets
// watched, replacing any notion of unrestricted scraping.
//
// Paginated + filterable: ScraperJob sudah tembus ratusan baris, fetch-all
// tanpa batas (dulu di sini) berat di-query dan di-render, apalagi tab ini
// auto-refresh tiap 30 detik. `select` juga dipersempit — kolom `config`
// (JSON) tidak pernah ditampilkan di tabel, jadi tidak perlu ikut ditarik.
export async function GET(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50))
  const category = searchParams.get('category')?.trim() || undefined
  const status = searchParams.get('status')?.trim() || undefined // 'active' | 'error' | 'inactive'
  const search = searchParams.get('search')?.trim() || undefined

  const where: any = {}
  if (category) where.category = category
  if (search) where.source = { contains: search, mode: 'insensitive' }
  if (status === 'error') where.status = 'error'
  else if (status === 'active') { where.isActive = true; where.status = { not: 'error' } }
  else if (status === 'inactive') where.isActive = false

  const [sources, total, activeCount, errorCount, itemsAgg] = await Promise.all([
    prisma.scraperJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, source: true, category: true, url: true, type: true,
        isActive: true, intervalMinutes: true, status: true, lastRunAt: true,
        itemsFound: true, errorCount: true, lastError: true, createdAt: true,
      },
    }),
    prisma.scraperJob.count({ where }),
    prisma.scraperJob.count({ where: { ...where, isActive: true, status: { not: 'error' } } }),
    prisma.scraperJob.count({ where: { ...where, status: 'error' } }),
    prisma.scraperJob.aggregate({ where, _sum: { itemsFound: true } }),
  ])

  return NextResponse.json({
    sources,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: { total, active: activeCount, error: errorCount, totalItems: itemsAgg._sum.itemsFound || 0 },
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { source, category, url, type, intervalMinutes, config } = body
  const validCategories = ['TENDER', 'PROPERTI', 'KENDARAAN', 'BISNIS', 'INVESTASI', 'LOWONGAN', 'BEASISWA', 'BANTUAN']
  if (!source?.trim() || !url?.trim()) return NextResponse.json({ error: 'Nama dan URL wajib' }, { status: 400 })
  if (!validCategories.includes(category)) return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
  if (!['RSS', 'JSON_API'].includes(type)) return NextResponse.json({ error: 'Tipe harus RSS atau JSON_API' }, { status: 400 })
  try { new URL(url) } catch { return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 }) }
  const created = await prisma.scraperJob.create({
    data: { source: source.trim().slice(0, 150), category, url: url.trim(), type, intervalMinutes: intervalMinutes || 30, config: config ?? {} },
  })
  return NextResponse.json({ success: true, source: created }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, isActive, source, url, intervalMinutes } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
  const data: any = {}
  if (typeof isActive === 'boolean') data.isActive = isActive
  if (source?.trim()) data.source = source.trim().slice(0, 150)
  if (url?.trim()) data.url = url.trim()
  if (intervalMinutes) data.intervalMinutes = intervalMinutes
  const updated = await prisma.scraperJob.update({ where: { id }, data })
  return NextResponse.json({ success: true, source: updated })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
  await prisma.scraperJob.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
