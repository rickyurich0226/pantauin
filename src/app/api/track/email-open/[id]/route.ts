import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.auditLog.updateMany({
      where: { id: params.id, openedAt: null },
      data: { openedAt: new Date() },
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
