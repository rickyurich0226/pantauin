import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function GET() {
  const now=new Date()
  const expired=await prisma.user.findMany({where:{plan:{not:'FREE'},planExpiresAt:{lt:now},isActive:true}})
  let downgraded=0
  for(const u of expired){await prisma.user.update({where:{id:u.id},data:{plan:'FREE',planExpiresAt:null}}); downgraded++}
  return NextResponse.json({success:true,downgraded,checked:expired.length,timestamp:now.toISOString()})
}
