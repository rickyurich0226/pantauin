import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export const revalidate = 300 // cache 5 menit, biar gak query DB tiap load halaman

export async function GET() {
  try {
    const [activeSources, categories, notificationsSent] = await Promise.all([
      prisma.scraperJob.count({ where: { isActive: true } }),
      prisma.scraperJob.findMany({ where: { isActive: true }, select: { category: true }, distinct: ['category'] }),
      prisma.notification.count({ where: { status: 'SENT' } }),
    ])
    return NextResponse.json({
      activeSources,
      categoryCount: categories.length,
      notificationsSent,
    })
  } catch {
    return NextResponse.json({ activeSources: 0, categoryCount: 0, notificationsSent: 0 })
  }
}
