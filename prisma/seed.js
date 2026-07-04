const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')
  const h = pw => bcrypt.hash(pw, 12)

  const superEmail = process.env.SUPERADMIN_EMAIL
  const superPassword = process.env.SUPERADMIN_PASSWORD
  if (!superEmail || !superPassword) {
    console.error('❌ SUPERADMIN_EMAIL dan SUPERADMIN_PASSWORD wajib di-set di .env sebelum seeding. Tidak ada akun default yang dibuat demi keamanan.')
    process.exit(1)
  }
  if (superPassword.length < 12) {
    console.error('❌ SUPERADMIN_PASSWORD minimal 12 karakter.')
    process.exit(1)
  }

  await prisma.user.upsert({
    where: { email: superEmail },
    update: {},
    create: {
      email: superEmail,
      name: 'Super Admin',
      password: await h(superPassword),
      role: 'SUPER_ADMIN',
      plan: 'BUSINESS',
      notifChannels: { set: ['EMAIL'] },
    },
  })
  console.log(`✅ Super Admin account ready: ${superEmail}`)

  // Demo accounts only ever seeded outside production, and only with explicit opt-in
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_USERS === 'true') {
    const demoPassword = process.env.DEMO_PASSWORD || require('crypto').randomBytes(9).toString('base64url')
    const demoUsers = [
      { email: 'admin@pantau.in', name: 'Admin Pantau', role: 'ADMIN', plan: 'PRO' },
      { email: 'pro@pantau.in', name: 'Siti Rahayu', role: 'USER', plan: 'PRO' },
      { email: 'user@pantau.in', name: 'Budi Santoso', role: 'USER', plan: 'FREE' },
    ]
    for (const u of demoUsers) {
      await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, password: await h(demoPassword), notifChannels: { set: ['EMAIL'] } } })
    }
    console.log(`✅ Demo accounts created (dev only). Password: ${demoPassword}`)
  }

  console.log('🌱 Done!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
