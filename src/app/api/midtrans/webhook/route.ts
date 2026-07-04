import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyMidtransNotification } from '@/lib/midtrans'
import nodemailer from 'nodemailer'
export const dynamic = 'force-dynamic'

const PLAN_DURATION: Record<string, number> = {
  PRO_MONTHLY: 30, PRO_YEARLY: 365,
  BUSINESS_MONTHLY: 30, BUSINESS_YEARLY: 365,
}

async function sendPlanActivationEmail(email: string, name: string, plan: string, billing: string, expiresAt: Date) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    const planLabel = plan === 'PRO' ? 'Pro' : 'Business'
    const billingLabel = billing === 'YEARLY' ? 'Tahunan' : 'Bulanan'
    const expStr = expiresAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    await transporter.sendMail({
      from: '"pantau.in" <' + process.env.SMTP_USER + '>',
      to: email,
      subject: '🎉 Plan ' + planLabel + ' kamu sudah aktif!',
      html: '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">' +
        '<div style="text-align:center;margin-bottom:24px"><span style="font-size:48px">🎉</span></div>' +
        '<h2 style="text-align:center;color:#0D1B2A;margin-bottom:8px">Selamat, ' + (name || 'Pengguna') + '!</h2>' +
        '<p style="text-align:center;color:#5A7090;margin-bottom:24px">Plan <strong>' + planLabel + ' (' + billingLabel + ')</strong> kamu sudah aktif.</p>' +
        '<div style="background:#F8FAFC;border-radius:12px;padding:20px;margin-bottom:24px">' +
        '<p style="margin:0 0 8px;font-size:14px;color:#5A7090">Aktif hingga:</p>' +
        '<p style="margin:0;font-size:20px;font-weight:700;color:#0F6E56">' + expStr + '</p></div>' +
        '<div style="text-align:center"><a href="' + (process.env.NEXTAUTH_URL || 'https://pantau.in') + '/dashboard" ' +
        'style="background:#1560BD;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Buka Dashboard →</a></div>' +
        '<p style="text-align:center;font-size:12px;color:#9EB3C8;margin-top:24px">pantau.in — Monitor peluang otomatis</p></div>',
    })
    console.log('[Webhook] Email aktivasi terkirim ke', email)
  } catch (err) {
    console.error('[Webhook] Gagal kirim email aktivasi:', err)
  }
}

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  // Verify notification via midtrans-client (handles signature check)
  let notification: { orderId: string; status: 'SUCCESS'|'FAILED'|'PENDING'|'EXPIRED' }
  try {
    notification = await verifyMidtransNotification(body)
  } catch (err) {
    console.error('[Webhook] Signature/verification failed:', err)
    return NextResponse.json({ error: 'Invalid notification' }, { status: 403 })
  }

  const { orderId, status } = notification

  // Find transaction
  const tx = await prisma.transaction.findUnique({ where: { orderId } })
  if (!tx) {
    console.error('[Webhook] Transaction not found:', orderId)
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  // Update transaction status
  await prisma.transaction.update({
    where: { orderId },
    data: {
      status: status as any,
      paidAt: status === 'SUCCESS' ? new Date() : null,
    }
  })

  if (status === 'SUCCESS') {
    // Parse plan & billing dari orderId: PANTAUIN-{PLAN}-{BILLING}-{userId6}-{timestamp}
    const parts = orderId.split('-')
    const plan = parts[1]   // PRO or BUSINESS
    const billing = parts[2] // MONTHLY or YEARLY

    const durationKey = `${plan}_${billing}`
    const days = PLAN_DURATION[durationKey] ?? 30
    const planExpiry = new Date()
    planExpiry.setDate(planExpiry.getDate() + days)

    await prisma.user.update({
      where: { id: tx.userId },
      data: { plan: plan as any, planExpiresAt: planExpiry }
    })

    console.log(`[Webhook] Plan ${plan} activated for user ${tx.userId} until ${planExpiry}`)

    const user = await prisma.user.findUnique({
      where: { id: tx.userId },
      select: { email: true, name: true }
    })
    if (user?.email) {
      await sendPlanActivationEmail(user.email, user.name || '', plan, billing, planExpiry)
    }
  }

  return NextResponse.json({ success: true })
}
