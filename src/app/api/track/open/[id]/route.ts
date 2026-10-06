import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

// 1x1 transparent GIF pixel, base64-encoded
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Catat waktu buka pertama kali saja (jangan timpa kalau sudah pernah tercatat)
  try {
    await prisma.notification.updateMany({
      where: { id: params.id, emailOpenedAt: null },
      data: { emailOpenedAt: new Date() },
    })
  } catch {
    // Jangan gagalkan response gambar hanya karena update DB gagal
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  })
}
