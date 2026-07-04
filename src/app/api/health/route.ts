import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s=Date.now()
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({status:'healthy',version:'1.0.0',timestamp:new Date().toISOString(),checks:{database:{status:'ok',latencyMs:Date.now()-s}}}) }
  catch { return NextResponse.json({status:'unhealthy',checks:{database:{status:'error'}}},{status:503}) }
}
