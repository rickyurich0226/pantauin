import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { queryText, category } = await req.json()
  if (!queryText || !category) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Simple keyword matching untuk preview
  const words = queryText.toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 5)

  if (words.length === 0) return NextResponse.json({ count: 0, items: [] })

  // Cari artikel yang cocok di DB
  const items = await prisma.listingItem.findMany({
    where: {
      category: category as any,
      OR: words.map((w: string) => ({
        title: { contains: w, mode: 'insensitive' as any }
      }))
    },
    select: { title: true, url: true, publishedAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const total = await prisma.listingItem.count({
    where: {
      category: category as any,
      OR: words.map((w: string) => ({
        title: { contains: w, mode: 'insensitive' as any }
      }))
    }
  })

  return NextResponse.json({ count: total, items, keywords: words })
}
