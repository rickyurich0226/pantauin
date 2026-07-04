import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [sources, itemCount, lastJob] = await Promise.all([
      prisma.scraperJob.count({ where: { isActive: true } }),
      prisma.listingItem.count(),
      prisma.scraperJob.findFirst({
        where: { isActive: true, lastRunAt: { not: null } },
        orderBy: { lastRunAt: 'desc' },
        select: { lastRunAt: true }
      })
    ])
    let lastFetch = ''
    if (lastJob?.lastRunAt) {
      const diff = Math.floor((Date.now() - new Date(lastJob.lastRunAt).getTime()) / 60000)
      if (diff < 1) lastFetch = 'baru saja'
      else if (diff < 60) lastFetch = `${diff} menit lalu`
      else if (diff < 1440) lastFetch = `${Math.floor(diff/60)} jam lalu`
      else lastFetch = `${Math.floor(diff/1440)} hari lalu`
    }
    return NextResponse.json({ sources, totalScanned: itemCount, lastFetch })
  } catch {
    return NextResponse.json({ sources: 0, totalScanned: 0, lastFetch: '' })
  }
}
