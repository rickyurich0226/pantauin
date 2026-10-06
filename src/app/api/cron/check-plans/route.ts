import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireCronSecret } from '@/lib/cronAuth'
import { notifySuperadmin, waktuWIB } from '@/lib/superadmin-notify'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied
  const now=new Date()
  const expired=await prisma.user.findMany({where:{plan:{not:'FREE'},planExpiresAt:{lt:now},isActive:true}})
  let downgraded=0
  for(const u of expired){await prisma.user.update({where:{id:u.id},data:{plan:'FREE',planExpiresAt:null}}); downgraded++; notifySuperadmin('\u231B <b>Plan Expired (Auto-downgrade)</b>\n\n\uD83D\uDC64 ' + u.name + ' (' + u.email + ')\n' + u.plan + ' \u2192 \uD83C\uDD93 FREE\n\uD83D\uDD50 ' + waktuWIB()).catch(()=>{})}
  const pendingExpired = (await prisma.transaction.updateMany({ where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - 2*24*60*60*1000) } }, data: { status: 'EXPIRED' } })).count
  return NextResponse.json({success:true,downgraded,pendingExpired,checked:expired.length,timestamp:now.toISOString()})
}
