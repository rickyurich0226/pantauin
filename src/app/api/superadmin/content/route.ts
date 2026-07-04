import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
export const dynamic = 'force-dynamic'

const CONFIG_PATH = join(process.cwd(), 'data', 'site-config.json')
const DEFAULT = {
  site_name:'Pantau.in', site_tagline:'Internet Dipantau. Peluang Dikirim ke WA Kamu.',
  contact_email:'pantau.inofficial@gmail.com', contact_wa:'https://wa.me/6287890144122',
  contact_wa_label:'@pantauin', telegram_channel:'https://t.me/pantauin',
  footer_fitur:['Monitoring AI Real-time','Notifikasi Multi Channel','AI Semantic Matching','Dashboard Analytics','API Access'],
  footer_harga:['Plan Gratis','Plan Pro — Rp 49K/bln','Plan Business — Rp 149K/bln','Perbandingan Plan'],
  footer_developer:['API Docs','Changelog','Status Page','SDK & Library'],
  footer_legal:['Syarat & Ketentuan','Kebijakan Privasi','FAQ','Pusat Bantuan'],
  free_max_watches:3, free_max_notifs:30, match_threshold:0.72,
  maintenance_mode:false, allow_registration:true,
}
function readCfg(){try{if(existsSync(CONFIG_PATH))return JSON.parse(readFileSync(CONFIG_PATH,'utf-8'))}catch{}return DEFAULT}
function writeCfg(d:any){try{mkdirSync(join(process.cwd(),'data'),{recursive:true});writeFileSync(CONFIG_PATH,JSON.stringify(d,null,2));return true}catch{return false}}

export async function GET() { return NextResponse.json(readCfg()) }
export async function PUT(req: NextRequest) {
  const s=await getServerSession(authOptions)
  if((s?.user as any)?.role!=='SUPER_ADMIN') return NextResponse.json({error:'Forbidden'},{status:403})
  const body=await req.json(); const updated={...readCfg(),...body}
  if(!writeCfg(updated)) return NextResponse.json({error:'Gagal menyimpan'},{status:500})
  return NextResponse.json({success:true,config:updated})
}
