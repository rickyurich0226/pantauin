import { createHash } from 'crypto'
/* eslint-disable @typescript-eslint/no-var-requires */
const midtransClient = require('midtrans-client')
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION==='true',
  serverKey: process.env.MIDTRANS_SERVER_KEY||'',
  clientKey: process.env.MIDTRANS_CLIENT_KEY||'',
})
export const TAX_RATE = 0.11
export const PLAN_PRICES: Record<string,{monthly:number;yearly:number}> = {
  PRO:{monthly:49000,yearly:470000}, BUSINESS:{monthly:149000,yearly:1430000},
}
export async function createMidtransTransaction(p:{orderId:string;amount:number;customerName:string;customerEmail:string;itemName:string}) {
  const tax=Math.round(p.amount*TAX_RATE), total=p.amount+tax
  const tx = await snap.createTransaction({
    transaction_details:{order_id:p.orderId,gross_amount:total},
    item_details:[{id:'plan',price:p.amount,quantity:1,name:p.itemName},{id:'tax',price:tax,quantity:1,name:'PPN 11%'}],
    customer_details:{first_name:p.customerName,email:p.customerEmail},
    credit_card:{secure:true},
    callbacks:{finish:`${process.env.NEXTAUTH_URL}/dashboard?payment=success`,error:`${process.env.NEXTAUTH_URL}/dashboard?payment=error`,pending:`${process.env.NEXTAUTH_URL}/dashboard?payment=pending`},
  })
  return {token:tx.token,redirectUrl:tx.redirect_url,tax,total}
}
export async function verifyMidtransNotification(body:any) {
  // Lapis 1: signature SHA512 (order_id + status_code + gross_amount + serverKey), tanpa jaringan
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  const { order_id, status_code, gross_amount, signature_key } = body || {}
  if (!order_id || !status_code || !gross_amount || !signature_key) throw new Error('Notifikasi tidak lengkap')
  const expected = createHash('sha512').update(String(order_id) + String(status_code) + String(gross_amount) + serverKey).digest('hex')
  if (expected !== String(signature_key)) throw new Error('Signature tidak valid')
  // Lapis 2: konfirmasi status langsung ke API Midtrans (timeout 8 detik)
  const base = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000)
  let s: any
  try {
    const res = await fetch(base + '/v2/' + encodeURIComponent(String(order_id)) + '/status', {
      headers: { Accept: 'application/json', Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64') },
      signal: ctrl.signal, cache: 'no-store',
    })
    s = await res.json()
  } finally { clearTimeout(timer) }
  if (!s?.transaction_status || String(s.order_id) !== String(order_id)) throw new Error('Status Midtrans tidak valid: ' + (s?.status_code || '-'))
  const { transaction_status, fraud_status } = s
  let status:'SUCCESS'|'FAILED'|'PENDING'|'EXPIRED' = 'PENDING'
  if((transaction_status==='capture'&&fraud_status==='accept')||transaction_status==='settlement') status='SUCCESS'
  else if(['cancel','deny'].includes(transaction_status)) status='FAILED'
  else if(transaction_status==='expire') status='EXPIRED'
  return {orderId:String(order_id),status}
}
export default snap
