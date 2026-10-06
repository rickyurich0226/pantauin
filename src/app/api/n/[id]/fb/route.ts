import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

export function signFeedback(id: string, value: string): string {
  const secret = process.env.NEXTAUTH_SECRET || ''
  return crypto.createHmac('sha256', secret).update(id + ':' + value).digest('hex').slice(0, 16)
}

function page(title: string, message: string, ok: boolean) {
  return new NextResponse(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + title + '</title></head>' +
    '<body style="font-family:Inter,system-ui,sans-serif;background:#F0F4F9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">' +
    '<div style="background:#fff;border-radius:16px;padding:40px 32px;max-width:420px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06)">' +
    '<div style="font-size:40px;margin-bottom:12px">' + (ok ? '✅' : '⚠️') + '</div>' +
    '<h1 style="font-size:18px;color:#0D1B2A;margin:0 0 8px">' + title + '</h1>' +
    '<p style="color:#5A7090;font-size:14px;margin:0">' + message + '</p>' +
    '<a href="https://pantau.in" style="display:inline-block;margin-top:20px;color:#1560BD;font-size:13px;text-decoration:none;font-weight:600">Buka Pantau.in &rarr;</a>' +
    '</div></body></html>',
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const value = searchParams.get('v')
  const sig = searchParams.get('sig')
  if (!value || !sig || !['RELEVANT', 'NOT_RELEVANT'].includes(value)) {
    return page('Link tidak valid', 'Parameter feedback tidak lengkap atau salah.', false)
  }
  const expected = signFeedback(params.id, value)
  if (sig !== expected) {
    return page('Link tidak valid', 'Tanda tangan link tidak cocok. Link mungkin rusak atau kedaluwarsa.', false)
  }
  const notif = await prisma.notification.findUnique({ where: { id: params.id } })
  if (!notif) {
    return page('Notifikasi tidak ditemukan', 'Notifikasi ini mungkin sudah dihapus.', false)
  }
  await prisma.$executeRawUnsafe(
    'UPDATE "Notification" SET feedback = $1 WHERE id = $2',
    value, params.id
  )
  const label = value === 'RELEVANT' ? 'Relevan' : 'Tidak Relevan'
  return page(
    'Terima kasih!',
    'Masukan kamu (' + label + ') sudah kami catat dan akan membantu Pantau.in jadi lebih akurat.',
    true
  )
}
