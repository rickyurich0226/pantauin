import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { profileUpdateSchema, validateBody } from '@/lib/validation'
import { encryptPII, decryptPII } from '@/lib/crypto'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: (s.user as any).id },
    select: {
      id: true, name: true, email: true, phone: true,
      whatsapp: true, telegramId: true, role: true, plan: true,
      notifChannels: true, notifEnabled: true, createdAt: true, planExpiresAt: true,
      twoFactorEnabled: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json({
    ...user,
    phone: user.phone ? decryptPII(user.phone) : null,
    whatsapp: user.whatsapp ? decryptPII(user.whatsapp) : null,
    telegramId: user.telegramId ? decryptPII(user.telegramId) : null,
  })
}
export async function PUT(req: NextRequest) {
  const s = await getServerSession(authOptions)
  if (!s?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (s.user as any).id
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const parsed = validateBody(profileUpdateSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { name, phone, whatsapp, telegramId, currentPassword, newPassword } = parsed.data
  const data: any = {}
  if (name) data.name = name
  if (phone !== undefined) data.phone = phone ? encryptPII(phone) : null
  if (whatsapp !== undefined) data.whatsapp = whatsapp ? encryptPII(whatsapp) : null
  if (telegramId !== undefined) data.telegramId = telegramId ? encryptPII(telegramId) : null
  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: 'Password lama wajib diisi' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })
    }
    data.password = await bcrypt.hash(newPassword, 12)
  }
  const updated = await prisma.user.update({
    where: { id: userId }, data,
    select: { id: true, name: true, email: true, phone: true, whatsapp: true, telegramId: true },
  })
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const actions: string[] = []
  if (newPassword) actions.push('PASSWORD_CHANGED')
  if (whatsapp !== undefined) actions.push('WHATSAPP_UPDATED')
  if (telegramId !== undefined) actions.push('TELEGRAM_UPDATED')
  if (phone !== undefined) actions.push('PHONE_UPDATED')
  if (actions.length) {
    await prisma.auditLog.create({
      data: {
        userId, userEmail: s.user.email ?? '',
        action: actions.join(','),
        ipAddress: String(ip).split(',')[0].trim(),
      },
    }).catch(() => {})
  }
  return NextResponse.json({
    success: true,
    user: {
      ...updated,
      phone: updated.phone ? decryptPII(updated.phone) : null,
      whatsapp: updated.whatsapp ? decryptPII(updated.whatsapp) : null,
      telegramId: updated.telegramId ? decryptPII(updated.telegramId) : null,
    }
  })
}
