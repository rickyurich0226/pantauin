import { NextResponse } from 'next/server'
import { runMatchingForNewItems } from '@/lib/matching'

export const dynamic = 'force-dynamic'

// Called by the host crontab (protected by x-cron-secret). Matches newly
// ingested listing items against active WatchQueries and queues notifications.
export async function GET() {
  const result = await runMatchingForNewItems(100)
  return NextResponse.json({ success: true, ...result })
}
