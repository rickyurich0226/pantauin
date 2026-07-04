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
  const s = await snap.transaction.notification(body)
  const {order_id,transaction_status,fraud_status} = s
  let status:'SUCCESS'|'FAILED'|'PENDING'|'EXPIRED' = 'PENDING'
  if((transaction_status==='capture'&&fraud_status==='accept')||transaction_status==='settlement') status='SUCCESS'
  else if(['cancel','deny'].includes(transaction_status)) status='FAILED'
  else if(transaction_status==='expire') status='EXPIRED'
  return {orderId:order_id,status}
}
export default snap
