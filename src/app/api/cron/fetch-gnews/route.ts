import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchGoogleNewsForWatch } from '@/lib/ingest'

import { requireCronSecret } from '@/lib/cronAuth'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied

  // Get all active watches
  const watches = await prisma.watchQuery.findMany({
    where: { isActive: true },
    select: { id: true, queryText: true, category: true },
  })

  if (!watches.length) {
    return NextResponse.json({ ok: true, processed: 0, created: 0 })
  }

  let totalCreated = 0
  let processed = 0

  // Process in batches of 10 to avoid overwhelming Google
  for (let i = 0; i < watches.length; i += 10) {
    const batch = watches.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map(w => fetchGoogleNewsForWatch(w))
    )
    results.forEach(r => {
      if (r.status === 'fulfilled') totalCreated += r.value
      processed++
    })
    // Small delay between batches
    if (i + 10 < watches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    created: totalCreated,
    timestamp: new Date().toISOString(),
  })
}
