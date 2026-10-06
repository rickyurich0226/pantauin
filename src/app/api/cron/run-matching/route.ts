import { NextRequest, NextResponse } from 'next/server'
import { runMatchingForNewItems } from '@/lib/matching'
import prisma from '@/lib/prisma'
import { requireCronSecret } from '@/lib/cronAuth'

export const dynamic = 'force-dynamic'

// Called by the host crontab. Matches newly ingested listing items against
// active WatchQueries and queues notifications.
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied
  const result = await runMatchingForNewItems(500)
  await prisma.watchQuery.updateMany({ where: { isActive: true }, data: { lastRunAt: new Date() } })
  return NextResponse.json({ success: true, ...result })
}
