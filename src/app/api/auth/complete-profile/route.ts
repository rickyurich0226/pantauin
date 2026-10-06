import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { encryptPII } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone, whatsapp } = await req.json()
  if (!phone || !whatsapp) return NextResponse.json({ error: 'No HP dan WhatsApp wajib diisi' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: encryptPII(phone),
      whatsapp: encryptPII(whatsapp),
      needsProfile: false,
      whatsappVerified: false,
    }
  })

  return NextResponse.json({ ok: true })
}
