import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  // Ambil kategori dari watch user yang ada
  const userWatches = await prisma.watchQuery.findMany({
    where: { userId: user.id, isActive: true },
    select: { category: true }
  })
  const categories = userWatches.map((w: any) => w.category)

  // Ambil item terbaru dari kategori yang TIDAK dipantau user
  // supaya terasa relevan tapi "terlewat"
  const allCats = ['TENDER','PROPERTI','BISNIS','INVESTASI','KENDARAAN','LOWONGAN','BEASISWA','BANTUAN']
  const otherCats = allCats.filter(c => !categories.includes(c))
  const targetCats = otherCats.length > 0 ? otherCats : allCats

  const items = await prisma.listingItem.findMany({
    where: {
      category: { in: targetCats as any },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    select: { title: true, category: true, price: true, location: true },
    orderBy: { createdAt: 'desc' },
    take: 4
  })

  return NextResponse.json({ items })
}
