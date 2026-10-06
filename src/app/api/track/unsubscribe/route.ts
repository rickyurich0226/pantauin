import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyUnsub } from '@/lib/email-digest'

export const dynamic = 'force-dynamic'
const db = prisma as any

function page(title: string, body: string, form = '') {
  return new NextResponse('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title></head>'
    + '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F7FB;font-family:Arial,Helvetica,sans-serif;color:#0F2A4A;padding:16px">'
    + '<div style="max-width:420px;width:100%;background:#fff;border:1px solid #DDE5EF;border-radius:16px;padding:28px 24px"><div style="font-size:22px;font-weight:800;margin-bottom:16px">pantau<span style="color:#0F6E56">.in</span></div>'
    + '<h1 style="font-size:20px;margin:0 0 8px">' + title + '</h1><p style="font-size:15px;line-height:1.55;color:#4B5E7A;margin:0 0 20px">' + body + '</p>' + form + '</div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

// GET: halaman konfirmasi (tidak mengubah apa pun: aman dari scanner link email)
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u'); const t = req.nextUrl.searchParams.get('t')
  if (!verifyUnsub(u, t)) return page('Tautan tidak valid', 'Tautan berhenti berlangganan ini tidak valid atau sudah kedaluwarsa.')
  return page('Berhenti menerima ringkasan email?', 'Kamu tidak akan menerima ringkasan peluang lewat email lagi. Pantauan dan notifikasi WhatsApp (jika aktif) tetap berjalan.',
    '<form method="POST"><button type="submit" style="width:100%;height:48px;border:none;border-radius:10px;background:#1560BD;color:#fff;font-size:15px;font-weight:700;cursor:pointer">Ya, berhenti berlangganan</button></form>'
    + '<p style="text-align:center;margin:14px 0 0"><a href="https://pantau.in/dashboard" style="color:#1560BD;font-size:14px">Batal, kembali ke Pantau.in</a></p>')
}

// POST: dari tombol konfirmasi ATAU one-click unsubscribe Gmail (RFC 8058)
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u'); const t = req.nextUrl.searchParams.get('t')
  if (!verifyUnsub(u, t)) return page('Tautan tidak valid', 'Tautan berhenti berlangganan ini tidak valid.')
  await db.user.update({ where: { id: u as string }, data: { emailDigestOff: true } }).catch(() => {})
  await prisma.auditLog.create({ data: { userId: u as string, userEmail: '', action: 'EMAIL_DIGEST_UNSUBSCRIBED' } }).catch(() => {})
  return page('Berhasil berhenti berlangganan', 'Kamu tidak akan menerima ringkasan email lagi. Ingin mengaktifkannya kembali? Hubungi kami atau atur lewat halaman Pengaturan.')
}
