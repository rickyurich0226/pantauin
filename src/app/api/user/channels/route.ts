import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s=await getServerSession(authOptions); if(!s?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const user=await prisma.user.findUnique({where:{id:(s.user as any).id},select:{notifChannels:true,notifEnabled:true,whatsapp:true,telegramId:true,quietStart:true,quietEnd:true}})
  return NextResponse.json(user)
}
export async function PUT(req: NextRequest) {
  const s=await getServerSession(authOptions); if(!s?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId=(s.user as any).id; const user=await prisma.user.findUnique({where:{id:userId}})
  if(!user) return NextResponse.json({error:'User tidak ditemukan'},{status:404})
  const isPro=user.plan!=='FREE'
  const {notifChannels,notifEnabled,whatsapp,telegramId,quietStart,quietEnd}=await req.json()
  const allowed=isPro?['EMAIL','WHATSAPP','TELEGRAM','PUSH']:['EMAIL']
  const filtered=(notifChannels||['EMAIL']).filter((c:string)=>allowed.includes(c))
  const updated=await prisma.user.update({where:{id:userId},data:{notifChannels:{set:filtered.length?filtered:['EMAIL']},notifEnabled:notifEnabled??true,whatsapp:whatsapp||null,telegramId:telegramId||null,quietStart:quietStart||'22:00',quietEnd:quietEnd||'07:00'}})
  return NextResponse.json({success:true,notifChannels:updated.notifChannels})
}
