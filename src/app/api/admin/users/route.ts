import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { decryptPII } from '@/lib/crypto'
export const dynamic = 'force-dynamic'
async function adminAuth() { const s=await getServerSession(authOptions); return ['ADMIN','SUPER_ADMIN'].includes((s?.user as any)?.role)?s:null }
export async function GET(req: NextRequest) {
  const s=await adminAuth(); if(!s) return NextResponse.json({error:'Forbidden'},{status:403})
  const url=new URL(req.url); const q=url.searchParams.get('q')||''; const plan=url.searchParams.get('plan'); const limit=Number(url.searchParams.get('limit')||50)
  const users=await prisma.user.findMany({where:{...(q&&{OR:[{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]}),...(plan&&plan!=='ALL'&&{plan:plan as any})},orderBy:{createdAt:'desc'},take:limit,select:{id:true,name:true,email:true,role:true,plan:true,isActive:true,createdAt:true,updatedAt:true,notifChannels:true,phone:true,registrationIp:true,lastLoginAt:true,lastLoginIp:true,_count:{select:{notifications:{where:{status:'SENT'}},watches:true}}}})
  const decrypted = users.map((u:any)=>({...u,phone:u.phone?decryptPII(u.phone):null,whatsapp:u.whatsapp?decryptPII(u.whatsapp):null}))
  return NextResponse.json({users:decrypted,total:users.length})
}
export async function PUT(req: NextRequest) {
  const s=await adminAuth(); if(!s) return NextResponse.json({error:'Forbidden'},{status:403})
  const {userId,action,value}=await req.json(); if(!userId||!action) return NextResponse.json({error:'userId dan action wajib'},{status:400})
  const target=await prisma.user.findUnique({where:{id:userId}})
  if(!target) return NextResponse.json({error:'User tidak ditemukan'},{status:404})
  if(target.role==='SUPER_ADMIN') return NextResponse.json({error:'Super Admin tidak bisa dimodifikasi'},{status:403})
  if(action==='TOGGLE_ACTIVE') await prisma.user.update({where:{id:userId},data:{isActive:!target.isActive}})
  else if(action==='CHANGE_PLAN'&&['FREE','PRO','BUSINESS'].includes(value)) await prisma.user.update({where:{id:userId},data:{plan:value}})
  else if(action==='CHANGE_ROLE'&&['USER','ADMIN','SUPER_ADMIN'].includes(value)) await prisma.user.update({where:{id:userId},data:{role:value}})
  else return NextResponse.json({error:'Action tidak valid'},{status:400})
  try{await prisma.auditLog.create({data:{userId:(s.user as any).id,userEmail:s.user?.email??'',action:`ADMIN_${action}`,detail:`User ${target.email}: ${action}=${value}`}})}catch{}
  return NextResponse.json({success:true})
}
