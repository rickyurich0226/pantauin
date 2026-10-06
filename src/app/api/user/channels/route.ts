import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { encryptPII, decryptPII } from '@/lib/crypto'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s=await getServerSession(authOptions); if(!s?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const user=await prisma.user.findUnique({where:{id:(s.user as any).id},select:{notifChannels:true,notifEnabled:true,whatsapp:true,telegramId:true,quietStart:true,quietEnd:true}})
  return NextResponse.json(user ? { ...user, whatsapp: user.whatsapp ? decryptPII(user.whatsapp) : null } : user)
}
export async function PUT(req: NextRequest) {
  const s=await getServerSession(authOptions); if(!s?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId=(s.user as any).id; const user=await prisma.user.findUnique({where:{id:userId}})
  if(!user) return NextResponse.json({error:'User tidak ditemukan'},{status:404})
  const isPro=user.plan!=='FREE'
  const {notifChannels,notifEnabled,whatsapp,telegramId,quietStart,quietEnd}=await req.json()
  const allowed=isPro?['EMAIL','WHATSAPP','TELEGRAM','PUSH']:['EMAIL']
  const filtered=(notifChannels||['EMAIL']).filter((c:string)=>allowed.includes(c))
  // Nomor/Telegram kosong di form TIDAK menghapus data. Nomor berubah = wajib verifikasi ulang.
  const waDigits=(v:any)=>String(v||'').replace(/[^0-9]/g,'').replace(/^0/,'62')
  const oldWa=user.whatsapp?decryptPII(user.whatsapp):''
  const waChanged=!!whatsapp&&waDigits(whatsapp)!==waDigits(oldWa)
  const waData=waChanged?{whatsapp:encryptPII(String(whatsapp)),whatsappVerified:false}:{}
  const tgData=typeof telegramId==='string'&&telegramId.trim()?{telegramId:telegramId.trim()}:{}
  const updated=await prisma.user.update({where:{id:userId},data:{notifChannels:{set:filtered.length?filtered:['EMAIL']},notifEnabled:notifEnabled??true,...waData,...tgData,quietStart:quietStart||'22:00',quietEnd:quietEnd||'07:00'}})
  return NextResponse.json({success:true,notifChannels:updated.notifChannels})
}
