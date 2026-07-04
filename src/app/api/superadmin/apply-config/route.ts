import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const s=await getServerSession(authOptions)
  if((s?.user as any)?.role!=='SUPER_ADMIN') return NextResponse.json({error:'Forbidden'},{status:403})
  const body=await req.json()
  const {openai_key,wa_phone_id,wa_token,telegram_token,midtrans_server_key,midtrans_client_key,midtrans_is_production,smtp_host,smtp_port,smtp_user,smtp_pass,recaptcha_site_key,recaptcha_secret_key}=body
  const envPath=join(process.cwd(),'.env')
  const envLocalPath=join(process.cwd(),'.env.local')
  let content=existsSync(envLocalPath)?readFileSync(envLocalPath,'utf-8'):existsSync(envPath)?readFileSync(envPath,'utf-8'):''
  const setEnv=(c:string,k:string,v:string)=>{if(!v)return c;const r=new RegExp(`^${k}=.*$`,'m');const l=`${k}="${v}"`;return r.test(c)?c.replace(r,l):c+`\n${l}`}
  if(openai_key) content=setEnv(content,'OPENAI_API_KEY',openai_key)
  if(wa_phone_id) content=setEnv(content,'WA_PHONE_NUMBER_ID',wa_phone_id)
  if(wa_token) content=setEnv(content,'WA_ACCESS_TOKEN',wa_token)
  if(telegram_token) content=setEnv(content,'TELEGRAM_BOT_TOKEN',telegram_token)
  if(midtrans_server_key) content=setEnv(content,'MIDTRANS_SERVER_KEY',midtrans_server_key)
  if(midtrans_client_key){content=setEnv(content,'MIDTRANS_CLIENT_KEY',midtrans_client_key);content=setEnv(content,'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY',midtrans_client_key)}
  if(midtrans_is_production!==undefined) content=setEnv(content,'MIDTRANS_IS_PRODUCTION',midtrans_is_production?'true':'false')
  if(smtp_host) content=setEnv(content,'SMTP_HOST',smtp_host)
  if(smtp_port) content=setEnv(content,'SMTP_PORT',smtp_port)
  if(smtp_user) content=setEnv(content,'SMTP_USER',smtp_user)
  if(smtp_pass) content=setEnv(content,'SMTP_PASS',smtp_pass)
  if(recaptcha_site_key){content=setEnv(content,'RECAPTCHA_SITE_KEY',recaptcha_site_key);content=setEnv(content,'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',recaptcha_site_key)}
  if(recaptcha_secret_key) content=setEnv(content,'RECAPTCHA_SECRET_KEY',recaptcha_secret_key)
  try {
    writeFileSync(envLocalPath,content); writeFileSync(envPath,content)
    // Docker deployment: there's no pm2 here. .env lives on a mounted volume, so we
    // gracefully exit after responding — docker-compose's `restart: unless-stopped`
    // policy brings the container straight back up reading the new values.
    setTimeout(()=>process.exit(0), 800)
    return NextResponse.json({success:true,message:'Konfigurasi disimpan. Server akan restart otomatis (~5-10 detik).'})
  } catch(e:any){return NextResponse.json({error:'Gagal menulis .env: '+e.message},{status:500})}
}
