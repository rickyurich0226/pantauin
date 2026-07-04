import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  try {
    const body=await req.json()
    const msg=body.message
    if(!msg?.text?.startsWith('/start')||!msg.chat?.id) return NextResponse.json({ok:true})
    const chatId=String(msg.chat.id)
    const token=process.env.TELEGRAM_BOT_TOKEN
    if(token){await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:`✅ Chat ID kamu: *${chatId}*\n\nCopy dan paste ke Pantau.in → Pengaturan → Telegram Chat ID\n\n_Pantau.in — Internet Dipantau, Peluang Dikirim ke WA Kamu_`,parse_mode:'Markdown'})})}
    return NextResponse.json({ok:true})
  } catch(e){return NextResponse.json({ok:false})}
}
export async function GET(req: NextRequest) {
  const url=new URL(req.url); const token=url.searchParams.get('hub.verify_token')
  return token===process.env.TELEGRAM_BOT_TOKEN?new Response(url.searchParams.get('hub.challenge')||'ok'):NextResponse.json({error:'Forbidden'},{status:403})
}
