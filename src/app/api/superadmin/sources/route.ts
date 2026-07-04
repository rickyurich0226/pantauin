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
export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sources = await prisma.scraperJob.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ sources })
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
