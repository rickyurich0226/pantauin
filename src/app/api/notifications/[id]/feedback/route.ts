import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { feedback } = await req.json()
  if (!['RELEVANT', 'NOT_RELEVANT'].includes(feedback)) {
    return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 })
  }
  const notif = await prisma.notification.findFirst({
    where: { id: params.id, userId }
  })
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.$executeRawUnsafe(
    'UPDATE "Notification" SET feedback = $1 WHERE id = $2',
    feedback, params.id
  )
  return NextResponse.json({ ok: true, feedback })
}
