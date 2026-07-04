import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const url=new URL(req.url)
  if(url.searchParams.get('hub.verify_token')===process.env.WA_VERIFY_TOKEN)
    return new Response(url.searchParams.get('hub.challenge')||'ok')
  return NextResponse.json({error:'Forbidden'},{status:403})
}
export async function POST(req: NextRequest) {
  try { const body=await req.json(); console.log('[WA Webhook]',JSON.stringify(body).slice(0,200)); return NextResponse.json({success:true}) }
  catch { return NextResponse.json({error:'Invalid body'},{status:400}) }
}
